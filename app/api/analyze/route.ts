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
      occasion,
      concerns,
      indoor_outdoor,
      climate,
      skinType,
      skinTone,
      lidType 
    } = await req.json()
    
    // Build context-aware prompt
    const contextLines = [
      occasion && `Event type: ${occasion}`,
      indoor_outdoor && `Location: ${indoor_outdoor}`,
      climate && `Climate: ${climate}`,
      concerns.length > 0 && `User concerns: ${concerns.join(', ')}`,
      skinType && `Skin type: ${skinType}`,
      skinTone && `Skin tone: ${skinTone}`,
      lidType && `Lid type: ${lidType}`
    ].filter(Boolean).join('\n')
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a professional makeup analyst. Analyze makeup photos across 9 key performance areas. Be specific and actionable in your recommendations. Consider how environmental factors, user features, and event requirements affect makeup performance.`
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this makeup photo comprehensively across ALL 9 labs:

**Context:**
${contextLines || 'General analysis requested'}

**Labs to analyze:**

1. **flashback** - White cast/ghosting under flash photography
   - Check for: SPF products, reflective powders, titanium dioxide, zinc oxide
   - Critical for: flash photography, photoshoots, events with cameras
   - Priority: ${concerns.includes('flash') ? 'HIGH' : 'NORMAL'}

2. **pores** - Pore visibility and texture through makeup
   - Check for: pore appearance, foundation settling, primer effectiveness
   - Affected by: application technique, product type, skin texture
   - Priority: ${concerns.includes('closeup') ? 'HIGH' : 'NORMAL'}

3. **texture** - Dry patches, cakey areas, uneven application
   - Check for: dry patches, product buildup, uneven coverage, fine lines
   - Affected by: skin hydration, product formula, application method
   - Priority: NORMAL

4. **undertone** - Foundation match to natural skin tone
   - Check for: color match accuracy, oxidation, neck/face mismatch
   - Must consider: User's ${skinTone || 'unknown'} skin tone
   - Priority: HIGH (affects overall look)

5. **transfer** - Smudging to clothing, masks, surfaces
   - Check for: setting method, product type, prone areas (jawline, hairline)
   - Affected by: climate, touch/friction, product formulation
   - Priority: ${concerns.includes('transfer') ? 'HIGH' : 'NORMAL'}

6. **longevity** - Staying power over 6+ hours
   - Check for: setting technique, primer use, product durability, oil control
   - Affected by: ${climate || 'normal'} climate, ${skinType || 'unknown'} skin type, activity level
   - Priority: ${concerns.includes('lasting') ? 'HIGH' : concerns.includes('weather') ? 'HIGH' : 'NORMAL'}

7. **oxidation** - Foundation darkening/color shift over time
   - Check for: oxidation-prone formulas, shade selection, setting method
   - Affected by: skin chemistry, ${skinType || 'unknown'} skin, climate
   - Priority: NORMAL

8. **creasing** - Product settling into lines (eyes, smile, forehead)
   - Check for: under-eye creasing, expression lines, product buildup
   - Affected by: ${lidType || 'unknown'} eyes, age, application amount
   - Priority: NORMAL

9. **blending** - Seamless color transitions, no harsh edges
   - Check for: contour/blush edges, jawline blend, hairline blend, eyeshadow transitions
   - Affected by: technique, tools used, product type
   - Priority: ${concerns.includes('closeup') ? 'HIGH' : 'NORMAL'}

**Analysis requirements:**
- For EACH lab, provide: verdict, confidence, score, detected issues, recommendations
- Be specific about what you observe in the photo
- Adjust severity based on the event context (${occasion || 'general use'})
- Consider ${indoor_outdoor || 'any'} lighting conditions
- Factor in ${climate || 'normal'} climate for longevity/transfer/oxidation
- Personalize undertone/texture/creasing analysis for user's features

**Return format (STRICT JSON):**
{
  "flashback": {
    "verdict": "YAY" | "NAY" | "MAYBE",
    "confidence": 0-100,
    "score": 0.0-10.0,
    "detected": ["specific observation 1", "specific observation 2"],
    "recommendations": ["actionable fix 1", "actionable fix 2", "actionable fix 3"],
    "zones_affected": ["T-zone", "under-eyes", "etc"] // optional
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

**Verdict guidelines:**
- YAY = performing well, no issues detected, confidence 70%+
- MAYBE = minor concerns, watch this area, confidence 50-80%
- NAY = significant issues detected, needs attention, confidence 60%+

**Score guidelines:**
- 8.0-10.0 = Excellent performance
- 6.0-7.9 = Good with minor room for improvement
- 4.0-5.9 = Moderate issues, improvement recommended
- 0.0-3.9 = Significant issues, changes needed

Return ONLY the JSON object, no markdown formatting.`
            },
            {
              type: "image_url",
              image_url: { 
                url: photoUrl,
                detail: "high" // Request high-detail analysis
              }
            }
          ]
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 4096, // Increased for 9 labs
      temperature: 0.3 // Lower temperature for more consistent analysis
    })
    
    const content = response.choices[0].message.content
    if (!content) {
      throw new Error('No content returned from OpenAI')
    }
    
    const result = JSON.parse(content)
    
    // Validate we got all 9 labs
    const expectedLabs = ['flashback', 'pores', 'texture', 'undertone', 'transfer', 'longevity', 'oxidation', 'creasing', 'blending']
    const missingLabs = expectedLabs.filter(lab => !result[lab])
    
    if (missingLabs.length > 0) {
      logger.warn('Missing labs in response:', missingLabs)
    }
    
    return Response.json({
      analyses: result,
      overall_score: calculateOverallScore(result),
      confidence_avg: calculateAvgConfidence(result),
      critical_count: calculateCriticalCount(result)
    })
    
  } catch (err) {
    logger.error('Analysis error:', err)
    return Response.json({ 
      error: 'Analysis failed', 
      details: err instanceof Error ? err.message : 'Unknown error'
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