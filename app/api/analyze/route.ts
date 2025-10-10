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

    // Validate photoUrl exists
    if (!photoUrl) {
      return Response.json({ error: 'Missing photoUrl in request' }, { status: 400 })
    }

    // Ensure the server can fetch the image and it's an image content-type
    try {
      const imgResp = await fetch(photoUrl);
      if (!imgResp.ok) {
        const statusText = imgResp.statusText || '';
        return Response.json({ error: 'Could not fetch photoUrl', reason: `${imgResp.status} ${statusText}` }, { status: 400 })
      }
      const contentType = imgResp.headers.get('content-type') || '';
      if (!contentType.startsWith('image/')) {
        return Response.json({ error: 'photoUrl did not return an image', reason: `content-type: ${contentType}` }, { status: 400 })
      }
    } catch (e: any) {
      logger.warn('Error fetching photoUrl prior to analysis:', e);
      return Response.json({ error: 'Failed to fetch photoUrl', reason: e?.message || String(e) }, { status: 400 })
    }
    
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

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: "system",
        content:
          "You are siOsi's makeup analyst. Be lenient when validating photos: if at least one real human face is reasonably visible, proceed with analysis. When uncertain, analyze with lower confidence instead of rejecting. Output strictly JSON. Style guide for text fields: warm, beauty-community voice, friendly and encouraging, optionally a light wink of humor, zero technical jargon. Refer to the subject as 'this makeup', 'the look', or 'this application'—never address the viewer directly (avoid 'you', 'your'). No shaming; keep tips practical and kind."
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `STEP 1 (LENIENT): Validate the image.
Accept as valid in these cases:
- At least one real human face is visible even partially (allow hats, hoods, hair, hands, microphones, phones, props).
- Multiple people appear but there is a primary face to analyze (focus on the most prominent subject).
- Runway/editorial/backstage frames, screenshots with UI chrome, heavy flash/shine, strong retouching, or filters.
- Low resolution or slight blur where facial features are still recognizable.

Only return invalid if:
- No human face is present or the subject is clearly non-photographic (cartoon, 3D render, AI art).
- The face is fully obscured (mask/emoji blur) or the resolution/blur is so severe that eyes, nose, and mouth cannot be located.
- The entire face is out of frame (back-of-head or profile with no facial features).

If borderline, do not reject; continue with STEP 2 but reflect uncertainty via lower confidence scores or MAYBE verdicts.

If invalid, return only:
{ "valid": false, "reason": "specific explanation" }

Otherwise continue.

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
10. shimmer - highlight/shimmer placement emphasizing texture, pores, or lines; flag textured zones
11. transitions - demarcation lines at hairline, jawline, or neck; check color mismatch
12. coverage - foundation coverage appropriateness for ${occasion || 'general use'} in ${indoor_outdoor || 'standard'} lighting

For EACH lab, follow these phrasing rules for "detected" and "recommendations":
- Audience & tone: warm, beauty-community voice; kind, encouraging, optionally a light wink of humor; no technical jargon.
- Point of view: refer to the subject as "this makeup", "the look", or "this application". Never address the viewer (avoid "you", "your").
- Length: 2–4 items for "detected" (each 1–2 sentences). 2–5 items for "recommendations" (each 1–2 sentences) with practical, realistic tweaks.
- No shaming; focus on helpful, friendly tips about products, placement, or technique.

Then return the following JSON shape for each lab:
{
  "flashback": {
    "verdict": "YAY" | "NAY" | "MAYBE",
    "confidence": 0-100,
    "score": 0-10,
    "detected": ["observation 1", "observation 2"],
    "recommendations": ["tip 1", "tip 2"],
    "zones_affected": ["T-zone", "under-eyes"] // optional for placement issues
  },
  ... (repeat for all 12 labs)
}

Context-aware scoring reminders:
- Outdoor events + flash concerns → flashback is critical
- Humid climate + long wear → longevity/oxidation stricter
- ${skinType || 'normal'} skin influences texture, longevity, shimmer
- ${lidType || 'standard'} eyes influence creasing risk
- ${occasion || 'general'} sets expectations for coverage intensity

Return ONLY valid JSON. Either { "valid": false, "reason": "..." } or { "valid": true, "flashback": {...}, "pores": {...}, ... all 12 labs }`
          },
          {
            type: "image_url",
            image_url: { url: photoUrl }
          }
        ]
      }
  ]

  const maxAttempts = 3
    let result: any | null = null
    let lastContent: string | undefined
    let lastParseError: unknown

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        temperature: 0.1,
        messages,
        response_format: { type: 'json_object' },
        max_tokens: 4096
      })

      const content = completion.choices?.[0]?.message?.content
      lastContent = content ?? undefined

      if (!content) {
        lastParseError = new Error('Empty completion content')
        logger.warn('Analyze completion returned empty content', { attempt })
        continue
      }

      try {
        result = strictJsonParse(content)
        break
      } catch (parseErr) {
        lastParseError = parseErr
        logger.warn('Analyze completion JSON parse failed', {
          attempt,
          message: parseErr instanceof Error ? parseErr.message : String(parseErr),
          preview: content.slice(0, 300)
        })
      }
    }

    if (!result) {
      logger.error('Unable to parse analysis completion after retries', {
        lastParseError,
        preview: lastContent?.slice(0, 300)
      })
      return Response.json(
        {
          error: 'Analysis failed for this photo.',
          suggestion: 'Try again with a different photo where the face is well lit and centered.'
        },
        { status: 422 }
      )
    }
    
    // Check if validation failed
    if (result.valid === false) {
      return Response.json({ 
        error: 'Invalid image', 
        reason: result.reason 
      }, { status: 400 })
    }
    
    // Remove the valid flag before returning analyses
    delete result.valid
    
    // Fun single-word nickname request (glamorous, unique). Keep this separate so the core JSON remains stable.
    let nickname: string | undefined = undefined;
    try {
      const nickRes = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        temperature: 0.9,
        messages: [
          { role: 'system', content: 'Return ONLY a single word. No punctuation. Glamorous runway-style nickname. Avoid vulgarity, trademarks, or real person names.' },
          { role: 'user', content: `Create a unique single-word glamorous nickname inspired by: occasion=${occasion||'general'}, concerns=${(concerns||[]).join(',')||'none'}, climate=${climate||'normal'}` }
        ],
        max_tokens: 3
      });
      nickname = (nickRes.choices?.[0]?.message?.content || '').trim().split(/\s+/)[0]?.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ'-]/g, '').slice(0, 24) || undefined;
    } catch (e) {
      // ignore nickname errors
    }

    return Response.json({
      analyses: result,
      overall_score: calculateOverallScore(result),
      confidence_avg: calculateAvgConfidence(result),
      critical_count: calculateCriticalCount(result),
      nickname
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

function strictJsonParse(content: string) {
  const trimmed = content.trim()

  const withoutFence = trimmed.startsWith('```')
    ? trimmed.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()
    : trimmed

  const candidate = extractFirstJsonObject(withoutFence)
  if (!candidate) {
    throw new Error('No JSON object found in completion content')
  }

  return JSON.parse(candidate)
}

function extractFirstJsonObject(payload: string) {
  const firstBrace = payload.indexOf('{')
  if (firstBrace === -1) return null

  let depth = 0
  let inString = false
  let escapeNext = false

  for (let i = firstBrace; i < payload.length; i++) {
    const char = payload[i]

    if (escapeNext) {
      escapeNext = false
      continue
    }

    if (char === '\\') {
      escapeNext = true
      continue
    }

    if (char === '"') {
      inString = !inString
    }

    if (inString) continue

    if (char === '{') depth += 1
    if (char === '}') {
      depth -= 1
      if (depth === 0) {
        return payload.slice(firstBrace, i + 1)
      }
    }
  }

  return null
}