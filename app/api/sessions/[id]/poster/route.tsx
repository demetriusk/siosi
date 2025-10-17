/* eslint-disable @next/next/no-img-element */
import { NextRequest } from 'next/server'
import { publicPosterUrl, generateAndUploadPoster } from '@/lib/poster'
import logger from '@/lib/logger'

export const runtime = 'edge'
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

    if (regen) {
      // Optional slow path: attempt to regenerate if session can be loaded
      try {
        const helper = await import('@/lib/db').catch(() => null as any)
        const session = helper?.getSessions
          ? (await helper.getSessions(50)).find((s: any) => String(s.id) === String(id))
          : helper?.getSession
          ? await helper.getSession(id)
          : null
        if (session) {
          await generateAndUploadPoster(session)
          const again = await fetchStored(url)
          if (again) return again
        }
      } catch (e) {
        logger.warn('Poster regen failed', e)
      }
    }

    return new Response('Poster not found', { status: 404 })
  } catch (error) {
    logger.error('Poster route error', error)
    return new Response('Server error', { status: 500 })
  }
}
