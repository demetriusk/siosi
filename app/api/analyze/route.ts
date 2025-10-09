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

STEP 2: Analyze this makeup photo across ALL 9 labs:

Context:
${contextInfo}

Labs to analyze:
1. flashback - white cast/ghosting under flash${indoor_outdoor === 'outdoor' || concerns?.includes('flash') ? ' (HIGH PRIORITY - user concerned about flash/outdoor)' : ''}
2. pores - texture visibility through makeup${concerns?.includes('closeup') ? ' (HIGH PRIORITY - user concerned about close-ups)' : ''}
3. texture - dry patches, cakey areas, uneven application
4. undertone - foundation match${skinTone ? ` to user's ${skinTone} tone` : ' (analyze based on visible skin in photo)'}
5. transfer - smudging to clothing/surfaces${concerns?.includes('transfer') ? ' (HIGH PRIORITY - user concerned about transfer)' : ''}
6. longevity - staying power${concerns?.includes('lasting') ? ' (HIGH PRIORITY - user needs 6+ hours wear)' : ''}
7. oxidation - color shift over time (${climate === 'hot_humid' ? 'HIGHER RISK in hot/humid climate' : climate === 'humid' ? 'moderate risk in humid climate' : 'normal risk'})
8. creasing - settling into lines${lidType ? `, especially for ${lidType} eyes` : ''}
9. blending - harsh edges, uneven color transitions

For EACH lab, return:
{
  "flashback": {
    "verdict": "YAY" | "NAY" | "MAYBE",
    "confidence": 0-100,
    "score": 0-10,
    "detected": ["specific observation 1", "specific observation 2"],
    "recommendations": ["actionable fix 1", "actionable fix 2"],
    "zones_affected": ["T-zone", "under-eyes"] // optional
  },
  "pores": { ... },
  "texture": { ... },
  "undertone": { ... },
  "transfer": { ... },
  "longevity": { ... },
  "oxidation": { ... },
  "creasing": { ... },
  "blending": { ... }
}

Scoring guidelines:
- Consider user context: outdoor events + flash → flashback critical, humid climate → longevity stricter
- ${skinType ? `User has ${skinType} skin - affects texture/longevity predictions` : 'Unknown skin type - predict based on visible makeup application'}
- ${lidType ? `User has ${lidType} eyes - adjust creasing risk accordingly` : 'Unknown eye shape - assess creasing risk from photo'}
- Be specific in detected issues and recommendations
- Confidence should reflect how clearly you can see the makeup details
- Lower confidence if photo is blurry, far away, or heavily filtered

Return ONLY valid JSON. Either:
{ "valid": false, "reason": "explanation" }
OR
{ "valid": true, "flashback": {...}, "pores": {...}, "texture": {...}, "undertone": {...}, "transfer": {...}, "longevity": {...}, "oxidation": {...}, "creasing": {...}, "blending": {...} }`
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
      logger.warn('Image validation failed:', result.reason);
      return Response.json({ 
        error: 'Invalid image', 
        reason: result.reason 
      }, { status: 400 })
    }
    
    // Remove the valid flag before returning analyses
    delete result.valid;
    
    const overallScore = calculateOverallScore(result);
    const confidenceAvg = calculateAvgConfidence(result);
    const criticalCount = calculateCriticalCount(result);
    
    logger.debug('Analysis complete:', { 
      overallScore, 
      confidenceAvg, 
      criticalCount,
      labCount: Object.keys(result).length 
    });
    
    return Response.json({
      analyses: result,
      overall_score: overallScore,
      confidence_avg: confidenceAvg,
      critical_count: criticalCount
    })
    
  } catch (err: any) {
    logger.error('Analysis error:', err)
    return Response.json({ 
      error: err.message || 'Analysis failed' 
    }, { status: 500 })
  }
}

function calculateOverallScore(analyses: any): number {
  const scores = Object.values(analyses)
    .map((lab: any) => lab.score)
    .filter((score): score is number => typeof score === 'number')
  
  if (scores.length === 0) return 0
  
  const sum = scores.reduce((a, b) => a + b, 0)
  const avg = sum / scores.length
  return Math.round(avg * 10) / 10 // Round to 1 decimal
}

function calculateAvgConfidence(analyses: any): number {
  const confidences = Object.values(analyses)
    .map((lab: any) => lab.confidence)
    .filter((conf): conf is number => typeof conf === 'number')
  
  if (confidences.length === 0) return 0
  
  const sum = confidences.reduce((a, b) => a + b, 0)
  const avg = sum / confidences.length
  return Math.round(avg * 10) / 10 // Round to 1 decimal
}

function calculateCriticalCount(analyses: any): number {
  return Object.values(analyses)
    .filter((lab: any) => lab.verdict === 'NAY' && lab.confidence >= 70)
    .length
}