/*
  Poster generation utility: builds a 1080x1920 (9:16) PNG resembling the look-hero UI,
  then uploads it into the public Supabase Storage bucket `posters`.

  Usage:
    import { generateAndUploadPoster, publicPosterUrl } from '@/lib/poster'
    await generateAndUploadPoster(session)
    const url = publicPosterUrl(session.id)

  Notes:
  - Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to upload.
  - Expects session fields: id, photo_url, overall_score, undertone_label, season_palette_label, season_match_pct (defensive fallbacks included).
*/

/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from '@vercel/og'

const POSTER_BUCKET = 'posters'

type OgFontWeight = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900
type OgFont = { name: string; data: ArrayBuffer; weight: OgFontWeight; style: 'normal' | 'italic' }

export function posterKeyForSession(id: string) {
  return `sessions/${id}.png`
}

export function publicPosterUrl(id: string) {
  const base = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '')
  return `${base}/storage/v1/object/public/${POSTER_BUCKET}/${encodeStoragePath(posterKeyForSession(id))}`
}

function encodeStoragePath(path: string) {
  return path
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')
}

// Map Supabase public object URL -> render endpoint with transforms.
function transformSupabaseImageUrl(src: string | null | undefined, opts?: { width?: number; height?: number; quality?: number }) {
  if (!src) return null
  const { width = 1080, height = 1440, quality = 82 } = opts || {}
  try {
    const u = new URL(src)
    const m = u.pathname.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/)
    if (!m) return src
    const bucket = m[1]
    const key = m[2]
    u.pathname = `/storage/v1/render/image/public/${bucket}/${key}`
    u.searchParams.set('width', String(width))
    u.searchParams.set('height', String(height))
    u.searchParams.set('quality', String(quality))
    u.searchParams.set('resize', 'cover')
    return u.toString()
  } catch {
    return src
  }
}

async function loadFonts(): Promise<OgFont[]> {
  try {
    const res = await fetch('https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.5/files/inter-latin-400-normal.woff')
    if (!res.ok) return []
    const data = await res.arrayBuffer()
    return [{ name: 'Inter', data, weight: 400 as OgFontWeight, style: 'normal' }]
  } catch {
    return []
  }
}

function pickText(session: any, keys: string[], fallback = ''): string {
  for (const k of keys) {
    const v = session?.[k]
    if (v === 0) return '0'
    if (typeof v === 'string' && v.trim()) return v.trim()
    if (typeof v === 'number' && Number.isFinite(v)) return String(v)
  }
  return fallback
}

function pickNumber(session: any, keys: string[], fallback?: number): number | undefined {
  for (const k of keys) {
    const v = session?.[k]
    if (typeof v === 'number' && Number.isFinite(v)) return v
    if (typeof v === 'string') {
      const n = Number(v.replace('%', ''))
      if (Number.isFinite(n)) return n
    }
  }
  return fallback
}

export async function generatePosterPng(session: any): Promise<ArrayBuffer> {
  const width = 1080
  const height = 1920

  const photoRaw = session?.photo_url || ''
  const photoSrc = transformSupabaseImageUrl(photoRaw, { width: 1080, height: 1440, quality: 82 }) || photoRaw

  const overall = typeof session?.overall_score === 'number' ? session.overall_score : pickNumber(session, ['overall', 'overallScore'])
  const overallText = typeof overall === 'number' ? overall.toFixed(1) : '—'

  const undertone = pickText(session, ['undertone_label', 'undertone', 'undertone_guess'], '')
  const seasonPalette = pickText(session, ['season_palette_label', 'season_palette', 'palette', 'season'], '')
  const matchPctNum = pickNumber(session, ['season_match_pct', 'season_match', 'palette_confidence_pct'])
  const matchText = typeof matchPctNum === 'number' ? `${Math.round(matchPctNum)}% season match` : pickText(session, ['season_match_text'], '')

  const site = (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '')
  const logoSrc = site ? `${site}/logo-mark.svg` : ''

  const fonts = await loadFonts()

  const node = (
    <div
      style={{
        width: '100%',
        height,
        display: 'flex',
        flexDirection: 'column',
        background: '#ffffff',
        fontFamily: 'Inter, system-ui, -apple-system, Roboto, "Helvetica Neue", Arial',
      }}
    >
      {/* Logo top-left */}
      <div style={{ position: 'absolute', top: 28, left: 28, display: 'flex', alignItems: 'center', gap: 10 }}>
        {logoSrc ? (
          <img src={logoSrc} alt="siOsi" width={48} height={48} style={{ width: 48, height: 48 }} />
        ) : (
          <div style={{ fontSize: 28, fontWeight: 700, color: '#0f172a' }}>síOsí</div>
        )}
      </div>

      {/* Hero image area (fills top ~75%) */}
      <div style={{ position: 'relative', width: '100%', height: 1440, background: '#f3f4f6', overflow: 'hidden' }}>
        <img
          src={photoSrc || ''}
          alt="look"
          width={1080}
          height={1440}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        {/* bottom white gradient */}
        <div
          style={{
            position: 'absolute', left: 0, right: 0, bottom: 0,
            height: 420,
            background: 'linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.88) 40%, #ffffff 100%)',
          }}
        />
        {/* Overlay chips */}
        <div
          style={{
            position: 'absolute', left: 24, right: 24, bottom: 24,
            display: 'flex', alignItems: 'flex-end', gap: 14, flexWrap: 'wrap',
          }}
        >
          {/* Score circle */}
          <div
            style={{
              width: 96, height: 96, borderRadius: 9999,
              background: '#ffffff', border: '4px solid #e5e7eb',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 22px rgba(0,0,0,0.08)',
            }}
          >
            <div style={{ fontSize: 30, fontWeight: 700, color: '#0f172a' }}>{overallText}</div>
          </div>

          {/* Chips */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {undertone ? (
              <div
                style={{
                  display: 'flex', alignItems: 'center',
                  padding: '10px 14px', borderRadius: 9999,
                  background: '#fff', border: '1px solid #e5e7eb',
                  color: '#0f172a', fontSize: 20, boxShadow: '0 6px 18px rgba(0,0,0,0.05)',
                }}
              >
                {undertone}
              </div>
            ) : null}

            {seasonPalette ? (
              <div
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 14px', borderRadius: 9999,
                  background: '#0f172a', border: '1px solid #0f172a',
                  color: '#fff', fontSize: 20, boxShadow: '0 6px 18px rgba(0,0,0,0.1)',
                }}
              >
                <div
                  style={{
                    width: 18, height: 18, borderRadius: 6,
                    background: 'conic-gradient(from 0deg, #f87171 0 25%, #facc15 25% 50%, #34d399 50% 75%, #60a5fa 75% 100%)',
                    border: '1px solid rgba(255,255,255,0.3)',
                  }}
                />
                <div>{seasonPalette}</div>
              </div>
            ) : null}

            {matchText ? (
              <div
                style={{
                  display: 'flex', alignItems: 'center',
                  padding: '10px 14px', borderRadius: 9999,
                  background: '#f8fafc', border: '1px solid #e5e7eb',
                  color: '#334155', fontSize: 20, boxShadow: '0 6px 18px rgba(0,0,0,0.05)',
                }}
              >
                {matchText}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ fontSize: 22, fontWeight: 600, color: '#0f172a' }}>síOsí makeup analysis</div>
        <div style={{ fontSize: 16, color: '#64748b' }}>siOsi.me</div>
      </div>
    </div>
  )

  const init: any = fonts.length ? { width, height, fonts } : { width, height }
  const res = new ImageResponse(node as any, init)
  return await res.arrayBuffer()
}

export async function uploadPosterPng(sessionId: string, png: ArrayBuffer): Promise<string> {
  const base = (process.env.SUPABASE_URL || '').replace(/\/$/, '')
  const token = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE
  if (!base || !token) throw new Error('Missing SUPABASE_URL or SERVICE_ROLE')
  const key = posterKeyForSession(sessionId)
  const uploadUrl = `${base}/storage/v1/object/${POSTER_BUCKET}/${encodeStoragePath(key)}`
  const r = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'image/png',
      'x-upsert': 'true',
    },
    body: png,
  })
  if (!r.ok) throw new Error(`Upload failed: ${r.status} ${r.statusText}`)
  const pub = (process.env.NEXT_PUBLIC_SUPABASE_URL || base).replace(/\/$/, '')
  return `${pub}/storage/v1/object/public/${POSTER_BUCKET}/${encodeStoragePath(key)}`
}

export async function generateAndUploadPoster(session: any): Promise<string> {
  const png = await generatePosterPng(session)
  return uploadPosterPng(String(session?.id), png)
}
