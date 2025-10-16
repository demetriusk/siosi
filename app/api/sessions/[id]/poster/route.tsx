/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from '@vercel/og';
import { NextRequest } from 'next/server';
import logger from '@/lib/logger';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

const CACHE_CONTROL_HEADER = 'public, max-age=600, stale-while-revalidate=86400';
const POSTER_BUCKET = 'posters';

function encodeStoragePath(path: string) {
  return path
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

async function fetchStoredPoster(url: string, headers?: Record<string, string>) {
  try {
    const response = await fetch(url, {
      cache: 'no-store',
      headers,
    });

    if (!response.ok) return null;

    const contentType = response.headers.get('content-type') || 'image/png';
    const arrayBuffer = await response.arrayBuffer();

    return new Response(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': CACHE_CONTROL_HEADER,
      },
    });
  } catch (error) {
    logger.debug('Poster cached storage fetch failed', error);
    return null;
  }
}

export async function GET(req: NextRequest, context: any) {
  try {
    // Next's generated types sometimes provide params as a Promise in the context.
    // Be defensive: support both Promise-based and direct params shapes.
    const maybeParams = context?.params;
    const params = maybeParams && typeof maybeParams.then === 'function' ? await maybeParams : maybeParams;
    const id = params?.id;
    if (!id) return new Response('Missing id', { status: 400 });

    // Fetch session row via Supabase REST API using public URL; prefer server-side helper if available.
    // We'll attempt to call the app's existing Supabase helper if present, otherwise try a simple fetch
    let session: any = null;
    try {
      // Try to load a server helper (lib/db or similar) dynamically
      // Some projects expose `getSession(id)` while others may only expose `getSessions(limit)`
      // or export a default client. We handle several shapes defensively.
      const helper = await import('@/lib/db').catch(() => null);
      if (helper) {
        const helperAny: any = helper;
        // preferred: getSession(id)
        if (typeof helperAny.getSession === 'function') {
          session = await helperAny.getSession(id);
        } else if (typeof helperAny.getSessions === 'function') {
          // fallback: call getSessions and find by id if possible
          const list = await helperAny.getSessions(50);
          if (Array.isArray(list)) session = list.find((s: any) => String(s.id) === String(id)) || null;
        } else if (helperAny.default && typeof helperAny.default.getSession === 'function') {
          // default export with getSession
          session = await helperAny.default.getSession(id);
        }
      }
    } catch (error) {
      logger.debug('Poster route dynamic DB helper load failed', error);
      session = null;
    }

    // Fallback: fetch via Supabase REST if env is configured
    if (!session) {
      const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
      const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
      if (SUPABASE_URL && SUPABASE_ANON) {
        const url = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/sessions?id=eq.${encodeURIComponent(id)}&select=*`;
        const res = await fetch(url, { headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` } });
        if (res.ok) {
          const arr = await res.json();
          session = Array.isArray(arr) && arr.length ? arr[0] : null;
        }
      }
    }

    if (!session) {
      return new Response('Session not found', { status: 404 });
    }

    const photoUrl = session.photo_url || '';
    const overall = typeof session.overall_score === 'number' ? session.overall_score.toFixed(1) : '';

    // Try to load Inter fonts from public/fonts (deployed static)
    let inter400: ArrayBuffer | undefined;
    let inter700: ArrayBuffer | undefined;
    try {
      const origin = new URL(req.url).origin;
      const r1 = await fetch(`${origin}/fonts/Inter-Regular.ttf`);
      const r2 = await fetch(`${origin}/fonts/Inter-Bold.ttf`);
      if (r1.ok) inter400 = await r1.arrayBuffer();
      if (r2.ok) inter700 = await r2.arrayBuffer();
    } catch (error) {
      logger.debug('Poster font fetch failed', error);
    }

    const width = 1200;
    const height = 1400;

    const fonts: any[] = [];
    if (inter400) fonts.push({ name: 'Inter', data: inter400, weight: 400, style: 'normal' });
    if (inter700) fonts.push({ name: 'Inter', data: inter700, weight: 700, style: 'normal' });

    const titleText = `síOsí score: ${overall}`;

    // Supabase storage public URL for cached posters
    const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE;
    const storageBase = SUPABASE_URL?.replace(/\/$/, '') || null;
    const storageKey = `${String(id)}.png`;
    const encodedKey = encodeStoragePath(storageKey);
    const privateStorageUrl = storageBase ? `${storageBase}/storage/v1/object/${POSTER_BUCKET}/${encodedKey}` : null;
    const publicStorageUrl = storageBase ? `${storageBase}/storage/v1/object/public/${POSTER_BUCKET}/${encodedKey}` : null;

    if (privateStorageUrl && SUPABASE_SERVICE_ROLE) {
      const cached = await fetchStoredPoster(privateStorageUrl, {
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}`,
      });
      if (cached) return cached;
    }

    if (publicStorageUrl) {
      const cached = await fetchStoredPoster(publicStorageUrl);
      if (cached) return cached;
    }

    const image = (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: '#ffffff',
          fontFamily: 'Inter, system-ui, -apple-system, Roboto, "Helvetica Neue", Arial',
        }}
      >
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60 }}>
          <div
            style={{
              width: '100%',
              maxWidth: 1000,
              height: 1000,
              borderRadius: 24,
              overflow: 'hidden',
              boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
              background: '#f3f4f6',
            }}
          >
            <img src={photoUrl} alt="photo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        </div>

        <div style={{ padding: '36px 56px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#0f172a' }}>{titleText}</div>
          <div style={{ fontSize: 18, color: '#475569', maxWidth: 980 }}>
            My síOsí makeup analysis — shareable summary.
          </div>
          <div style={{ marginTop: 8, fontSize: 14, color: '#94a3b8' }}>siosi.app</div>
        </div>
      </div>
    );

    // Generate image via @vercel/og
    const imageResponse = new ImageResponse(image as any, { width, height, fonts });

    try {
      const pngBuffer = await imageResponse.arrayBuffer();

      if (storageBase && SUPABASE_SERVICE_ROLE) {
        const uploadUrl = `${storageBase}/storage/v1/object/${POSTER_BUCKET}/${encodedKey}`;
        try {
          const uploadRes = await fetch(uploadUrl, {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}`,
              'Content-Type': 'image/png',
            },
            body: pngBuffer,
          });
          if (!uploadRes.ok) {
            logger.warn('Poster upload failed', {
              status: uploadRes.status,
              statusText: uploadRes.statusText,
            });
          }
        } catch (error) {
          logger.warn('Poster upload threw', error);
        }
      }

      return new Response(pngBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': CACHE_CONTROL_HEADER,
        },
      });
    } catch (error) {
      logger.error('Poster generation upload failed', error);
      return new ImageResponse(image as any, {
        width,
        height,
        fonts,
      });
    }
  } catch (error) {
    logger.error('Poster generation failed', error);
    return new Response('Poster generation failed', { status: 500 });
  }
}
