import { NextRequest } from 'next/server'
import OpenAI from 'openai'
import logger from '@/lib/logger'
import { prepareSkinTypeForAI, splitSkinTypeCode } from '@/lib/skin-type'

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
      climate,
      locale
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
    const profileSummaryParts: string[] = [];
    if (skinTone) profileSummaryParts.push(`${skinTone} tone`);
    if (lidType) profileSummaryParts.push(`${lidType} eyes`);
    if (skinType) profileSummaryParts.unshift(`${skinType}`);
    const profileInfo = hasProfile
      ? profileSummaryParts.join(', ') || 'profile provided'
      : 'profile not provided';

    let skinTypeQuizContext: string | null = null;
    if (typeof skinType === 'string') {
      const { oilLevel, concern, undertone } = splitSkinTypeCode(skinType);
      if (oilLevel && concern && undertone) {
        skinTypeQuizContext = prepareSkinTypeForAI(skinType);
      }
    }

    const baseContextLines = [
      `Event: ${occasion || 'general use'}`,
      `Location: ${indoor_outdoor || 'not specified'}`,
      `Climate: ${climate || 'normal'}`,
      `Concerns: ${concerns?.length ? concerns.join(', ') : 'none'}`,
      `User profile: ${profileInfo}`,
    ];

    if (!hasProfile) {
      baseContextLines.push('Note: User profile incomplete. Base undertone/texture analysis solely on the visible makeup in the photo.');
    }

    const contextSections = [baseContextLines.join('\n')];
    if (skinTypeQuizContext) {
      contextSections.push(skinTypeQuizContext);
    }

    const contextInfo = contextSections.join('\n\n');

    logger.debug('Analysis context:', { occasion, indoor_outdoor, climate, concerns, hasProfile });

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: `You are siOsi's makeup analyst. Be lenient when validating photos: if at least one real human face is reasonably visible, proceed with analysis. When uncertain, analyze with lower confidence instead of rejecting. Output strictly JSON. Style guide for text fields: warm, beauty-community voice, friendly and encouraging, optionally a light wink of humor, zero technical jargon. Refer to the subject as 'this makeup', 'the look', or 'this application'—never address the viewer directly (avoid 'you', 'your'). No shaming; keep tips practical and kind.

        IMPORTANT: All text content in "detected", "recommendations", "reason", and "notes" fields MUST be in ${getLanguageName(locale || 'en')}. Do not mix languages. The entire response text should be in ${getLanguageName(locale || 'en')}.`
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
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

STEP 3: Perform seasonal colorimetry analysis (SEPARATE from lab analysis above):

This analysis is INDEPENDENT of concerns, occasion, indoor/outdoor, and climate. Base it only on the visible makeup + skin/hair/eye coloring in the photo, plus optional profile (skin_type, skin_tone, lid_type).

SEASONAL COLOR ANALYSIS SYSTEM:
Classify the person into 1 of 12 color seasons based on 4 factors:

1. UNDERTONE: warm (golden/yellow), cool (pink/blue), or neutral (balanced)
2. DEPTH: light (fair skin, light hair, delicate features), medium, or deep (dark skin/hair, high contrast)
3. CLARITY: bright (clear, saturated colors look best) vs soft (muted, dusty colors look best)
4. CONTRAST: high (stark difference between skin/hair/eyes) vs low (features blend harmoniously)

12 SEASONS MAPPING:

WINTER (cool undertone, high contrast):
- "bright_winter": cool + bright/clear colors + medium-high contrast
- "cool_winter": cool + icy/jewel tones + very high contrast (think Snow White)
- "deep_winter": cool + deep/rich colors + high contrast (dark hair, fair or deep skin)

SPRING (warm undertone, clear/bright):
- "bright_spring": warm + bright/clear colors + medium contrast
- "warm_spring": warm + peachy/coral tones + medium-low contrast (think golden hour)
- "light_spring": warm + light/delicate colors + low contrast (soft blonde, light eyes)

SUMMER (cool undertone, soft/muted):
- "light_summer": cool + light/pastel colors + low contrast (ash blonde, soft features)
- "cool_summer": cool + soft/dusty colors + medium contrast
- "soft_summer": cool + muted/grayed colors + low-medium contrast (blend of features)

AUTUMN (warm undertone, muted/earthy):
- "soft_autumn": warm + muted/dusty colors + low contrast (soft features, hazel eyes)
- "warm_autumn": warm + rich/earthy colors + medium contrast (think fall leaves)
- "deep_autumn": warm + deep/intense colors + high contrast (dark hair, rich coloring)

CLASSIFICATION GUIDELINES:
- Look at natural coloring: skin depth, hair color, eye color, contrast level
- Consider which makeup colors are already flattering in the photo
- If person has dyed hair, try to infer natural coloring from roots, brows, lashes, skin
- When uncertain between 2 seasons, pick the one that better matches contrast level
- Confidence should be 70-95% (reserve 95%+ for very obvious cases)

OUTPUT STRUCTURE:
{
  "colorimetry": {
    "photo": {
      "undertone": "warm" | "cool" | "neutral",
      "season": "bright_winter" | "cool_winter" | "deep_winter" | "bright_spring" | "warm_spring" | "light_spring" | "light_summer" | "cool_summer" | "soft_summer" | "soft_autumn" | "warm_autumn" | "deep_autumn",
      "season_confidence": 70-100,
      "detected": [
        { 
          "hex": "#RRGGBB", 
          "name": "Shade name", 
          "category": "EYES" | "LIPS" | "CHEEKS" | "FACE" | "HIGHLIGHT" | "BROWS" | "LINER" | "GENERAL", 
          "reason": "1 sentence why it was observed" 
        }
        // 2-5 swatches total
      ],
      "recommended": [
        // Same swatch shape, 6-10 colors that align with detected season
        // Reasons focused on why it flatters the season (e.g., "Peachy coral complements Warm Spring's golden undertone")
      ],
      "avoid": [
        // Same swatch shape, 4-8 colors to skip
        // Reasons focused on season mismatch (e.g., "Icy blue clashes with Warm Autumn's earthy palette")
      ],
      "notes": "optional 1 sentence summary of the season (e.g., 'Bright Winter thrives in bold jewel tones')"
    },
    "profile": {
      "undertone": "warm" | "cool" | "neutral" | null,
      "season": "bright_winter" | ... (same 12 options) | null,
      "season_confidence": 70-100 | null,
      "recommended": [ 
        // Swatches tailored to user's profile (if provided)
        // Consider their skin_tone, skin_type, lid_type when recommending
      ],
      "avoid": [ 
        // Swatches the user should skip based on their profile season
      ],
      "notes": "optional 1 sentence"
    }
  }
}

IMPORTANT:
- Omit the 'profile' block entirely when profile fields (skin_type, skin_tone, lid_type) were not provided or you lack confidence
- If profile IS provided, classify the user into their own season based on profile data
- Keep tone warm, inclusive, never address the reader directly
- Category labels must be uppercase strings
- Keep 'hex' values in #RRGGBB format (makeup-appropriate shades, not pure colors)
- Each palette should have 2-10 colors depending on type (detected: 2-5, recommended: 6-10, avoid: 4-8)
- Reasons stay within one sentence each

Return ONLY valid JSON. Either { "valid": false, "reason": "..." } or { "valid": true, "colorimetry": {...}, "flashback": {...}, "pores": {...}, ... all 12 labs }`
          },
          {
            type: 'image_url',
            image_url: { url: photoUrl }
          }
        ]
      }
    ];

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
        max_tokens: 6000
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
    
    const colorimetry = result.colorimetry ?? null;
    if (colorimetry) {
      delete result.colorimetry;
    }

    // Remove the valid flag before returning analyses
    delete result.valid

    return Response.json({
      analyses: result,
      colorimetry,
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

function getLanguageName(locale: string): string {
  const languages: Record<string, string> = {
    en: 'English',
    de: 'German',
    es: 'Spanish',
    fr: 'French',
    it: 'Italian',
    pt: 'Portuguese',
    ru: 'Russian',
    ua: 'Ukrainian'
  };
  return languages[locale] || 'English';
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