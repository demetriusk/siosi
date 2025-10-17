/* eslint-disable @next/next/no-img-element */
import { NextRequest } from 'next/server'
import { publicPosterUrl, generateAndUploadPoster, generatePosterPng } from '@/lib/poster'
import logger from '@/lib/logger'

export const runtime = 'nodejs'
export const revalidate = 31536000 // 1 year; poster is immutable once saved

async function fetchStored(url: string) {
  try {
    const r = await fetch(url, { cache: 'force-cache' })
    if (!r.ok) return null
    const buf = await r.arrayBuffer()
    return new Response(buf, {
      status: 200,
      headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=31536000, immutable' },
    })
  } catch {
    return null
  }
}

export async function GET(req: NextRequest, context: any) {
  try {
    const maybeParams = context?.params
    const params = maybeParams && typeof maybeParams.then === 'function' ? await maybeParams : maybeParams
    const id = params?.id
    if (!id) return new Response('Missing id', { status: 400 })

    const regen = req.nextUrl.searchParams.get('regen') === '1'
    const url = publicPosterUrl(id)

    if (!regen) {
      const cached = await fetchStored(url)
      if (cached) return cached
    }

    // Attempt to regenerate if missing or explicitly requested
    try {
      const helper = await import('@/lib/db').catch(() => null as any)
      const session = helper?.getSessions
        ? (await helper.getSessions(50)).find((s: any) => String(s.id) === String(id))
        : helper?.getSession
        ? await helper.getSession(id)
        : null

      if (session) {
        // Try upload path first (idempotent); then fetch again
        try {
          await generateAndUploadPoster(session)
          const again = await fetchStored(url)
          if (again) return new Response(again.body, {
            status: 200,
            headers: {
              'Content-Type': 'image/png',
              'Cache-Control': 'public, max-age=31536000, immutable',
              'x-siosi-poster-status': 'regenerated-uploaded',
            },
          })
        } catch (uploadErr) {
          logger.warn('Poster upload failed during regen, will return inline image', uploadErr)
        }

        // Fallback: render and return inline without upload (ensures non-empty response)
        try {
          const png = await generatePosterPng(session)
          return new Response(png, {
            status: 200,
            headers: {
              'Content-Type': 'image/png',
              // Short cache for inline fallback; subsequent requests may succeed once upload works
              'Cache-Control': 'public, max-age=600',
              'x-siosi-poster-status': 'regenerated-inline',
            },
          })
        } catch (inlineErr) {
          logger.warn('Poster inline generation failed', inlineErr)
        }
      }
    } catch (e) {
      logger.warn('Poster regen pathway failed', e)
    }

    return new Response('Poster not found', { status: 404 })
  } catch (error) {
    logger.error('Poster route error', error)
    return new Response('Server error', { status: 500 })
  }
}
