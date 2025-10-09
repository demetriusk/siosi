import { NextRequest } from 'next/server'
import OpenAI from 'openai'
import logger from '@/lib/logger'

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      logger.error('Missing OPENAI_API_KEY')
      return Response.json({ error: 'Missing OPENAI_API_KEY' }, { status: 500 })
    }

    const openai = new OpenAI({ apiKey })
    const { 
      photoUrl, 
      skinType, 
      skinTone, 
      lidType,
      occasion,
      concerns,
      indoor_outdoor,
      climate 
    } = await req.json()
    
    // Build context information
    const hasProfile = skinType || skinTone || lidType;
    const profileInfo = hasProfile 
      ? `${skinType || 'unknown'} skin, ${skinTone || 'unknown'} tone, ${lidType || 'unknown'} eyes`
      : 'profile not provided';
    
    const contextInfo = `
Event: ${occasion || 'general use'}
Location: ${indoor_outdoor || 'not specified'}
Climate: ${climate || 'normal'}
Concerns: ${concerns?.length ? concerns.join(', ') : 'none'}
User profile: ${profileInfo}
${!hasProfile ? 'Note: User profile incomplete. Base undertone/texture analysis solely on the visible makeup in the photo.' : ''}
`.trim();

    logger.debug('Analysis context:', { occasion, indoor_outdoor, climate, concerns, hasProfile });

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `STEP 1: Validate this image first.
If invalid (multiple faces, no face, illustration/cartoon, no visible makeup, covered face, or not a real photo), return:
{ "valid": false, "reason": "specific explanation" }

If valid, proceed to STEP 2.

STEP 2: Analyze this makeup photo across ALL 12 labs:

Context:
${contextInfo}

Labs to analyze:
1. flashback - white cast/ghosting under flash${indoor_outdoor === 'outdoor' || concerns?.includes('flash') ? ' (CRITICAL for this context)' : ''}
2. pores - texture visibility through makeup
3. texture - dry patches, cakey areas, uneven application
4. undertone - foundation match to user's ${skinTone || 'skin'} tone
5. transfer - smudging to clothing/surfaces
6. longevity - staying power ${concerns?.includes('lasting') ? '(6+ hours requested)' : ''}
7. oxidation - color shift over time (higher risk in ${climate === 'hot_humid' ? 'hot/humid' : 'normal'} climate)
8. creasing - settling into lines, especially for ${lidType || 'standard'} eyes
9. blending - harsh edges, uneven color transitions
10. shimmer - highlight/shimmer placement emphasizing texture, pores, or lines
11. transitions - visible demarcation lines at hairline, jawline, or neck
12. coverage - foundation coverage appropriateness for ${occasion || 'general use'} in ${indoor_outdoor || 'standard'} lighting

For EACH lab, return:
{
  "flashback": {
    "verdict": "YAY" | "NAY" | "MAYBE",
    "confidence": 0-100,
    "score": 0-10,
    "detected": ["specific observation 1", "specific observation 2"],
    "recommendations": ["actionable fix 1", "actionable fix 2"],
    "zones_affected": ["T-zone", "under-eyes"] // optional, for placement issues
  },
  ... (repeat for all 12 labs)
}

Specific guidance per new lab:
- shimmer: Check if highlighter/shimmer emphasizes skin texture, large pores, or fine lines. Flag placement on textured zones.
- transitions: Look for visible lines where foundation meets natural skin (hairline, jaw, neck). Check for color mismatch at edges.
- coverage: Assess if coverage level suits the occasion (e.g., too heavy for daytime indoor vs. too light for evening photos). Consider ${indoor_outdoor} context.

Consider how context affects scoring:
- Outdoor events + flash concerns → flashback is critical
- Humid climate + long wear → longevity/oxidation get stricter
- User's ${skinType || 'normal'} skin affects texture/longevity/shimmer
- ${lidType || 'standard'} eyes affect creasing risk
- ${occasion || 'general'} affects coverage expectations (natural vs. full glam)

Return ONLY valid JSON. Either { "valid": false, "reason": "..." } or { "valid": true, "flashback": {...}, "pores": {...}, ... all 12 labs }`
            },
            {
              type: "image_url",
              image_url: { url: photoUrl }
            }
          ]
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 4096
    })
    
    const result = JSON.parse(response.choices[0].message.content!)
    
    // Check if validation failed
    if (result.valid === false) {
      return Response.json({ 
        error: 'Invalid image', 
        reason: result.reason 
      }, { status: 400 })
    }
    
    // Remove the valid flag before returning analyses
    delete result.valid
    
    return Response.json({
      analyses: result,
      overall_score: calculateOverallScore(result),
      confidence_avg: calculateAvgConfidence(result),
      critical_count: calculateCriticalCount(result)
    })
    
  } catch (err: any) {
    logger.error('Analysis error:', err)
    return Response.json({ 
      error: err.message || 'Analysis failed' 
    }, { status: 500 })
  }
}

function calculateOverallScore(analyses: any): number {
  const scores = Object.values(analyses).map((lab: any) => lab.score);
  return Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length);
}

function calculateAvgConfidence(analyses: any): number {
  const confidences = Object.values(analyses).map((lab: any) => lab.confidence);
  return Math.round(confidences.reduce((a: number, b: number) => a + b, 0) / confidences.length);
}

function calculateCriticalCount(analyses: any): number {
  return Object.values(analyses).filter((lab: any) => lab.verdict === 'NAY').length;
}