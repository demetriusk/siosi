import { NextRequest } from 'next/server'
import OpenAI from 'openai'
import logger from '@/lib/logger'

export async function POST(req: NextRequest) {
  try {
    // lazily construct the OpenAI client so builds (or environments without
    // OPENAI_API_KEY) don't throw at module import time.
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      logger.error('Missing OPENAI_API_KEY')
      return Response.json({ error: 'Missing OPENAI_API_KEY' }, { status: 500 })
    }

    const openai = new OpenAI({ apiKey })
  const { photoUrl, skinType, skinTone } = await req.json()
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this makeup photo. Provide results for these labs:
              
1. Flashback Lab - detect white cast/ghosting
2. Texture Trigger - assess shimmer on texture
3. Pore Proof - evaluate pore visibility
4. Undertone Truth - determine skin undertone

Context: skin type: ${skinType || 'unknown'}, tone: ${skinTone || 'unknown'}

For each lab return:
{
  "verdict": "YAY" | "NAY" | "MAYBE",
  "confidence": 0-100,
  "score": 0-10,
  "detected": ["observation 1", "observation 2"],
  "recommendations": ["tip 1", "tip 2", "tip 3"]
}

Return valid JSON only.`
            },
            {
              type: "image_url",
              image_url: { url: photoUrl }
            }
          ]
        }
      ],
      max_tokens: 1500
    })
    
  const result = JSON.parse(response.choices[0].message.content!)
    
    return Response.json({
      analyses: result,
      overall_score: calculateOverallScore(result),
      confidence_avg: calculateAvgConfidence(result)
    })
    
  } catch (err) {
    logger.error('Analysis error:', err)
    return Response.json({ error: 'Analysis failed' }, { status: 500 })
  }
}

function calculateOverallScore(analyses: any) {
  const scores = Object.values(analyses).map((lab: any) => lab.score)
  return scores.reduce((a: number, b: number) => a + b, 0) / scores.length
}

function calculateAvgConfidence(analyses: any) {
  const confidences = Object.values(analyses).map((lab: any) => lab.confidence)
  return confidences.reduce((a: number, b: number) => a + b, 0) / confidences.length
}