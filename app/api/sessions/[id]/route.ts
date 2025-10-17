import { NextRequest } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { createClient } from '@supabase/supabase-js'
import { posterKeyForSession } from '@/lib/poster'
import logger from '@/lib/logger'

export async function DELETE(req: NextRequest, { params }: { params: any }) {
  try {
    const { id } = await params;
    if (!id) return Response.json({ error: 'Missing session id' }, { status: 400 });

    const supabase = getSupabase();

    // Require Authorization header with Bearer token and validate it
    const authHeader = req.headers.get('authorization') || '';
    const match = authHeader.match(/^Bearer (.+)$/i);
    const token = match ? match[1] : null;

    if (!token) {
      return Response.json({ error: 'Missing Authorization token' }, { status: 401 });
    }

    // Validate token with Supabase Auth endpoint to get user id
    let userId: string | undefined = undefined;
    try {
      const supabaseAuthUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseApiKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseAuthUrl) {
        // Running without SUPABASE_URL configured (local dev). We cannot validate tokens reliably.
        logger.warn('SUPABASE_URL not configured on server; token validation unavailable (dev only)');
        return Response.json({ error: 'Token validation not available on server' }, { status: 501 });
      }

      const resp = await fetch(`${supabaseAuthUrl}/auth/v1/user`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: supabaseApiKey ?? ''
        }
      });

      if (!resp.ok) {
        const txt = await resp.text();
        logger.warn('Supabase token validation failed', txt);
        return Response.json({ error: 'Invalid token' }, { status: 401 });
      }

      const data = await resp.json();
      userId = data?.id ?? undefined;
      if (!userId) {
        return Response.json({ error: 'Could not resolve user id from token' }, { status: 401 });
      }
    } catch (e) {
      logger.warn('Token validation error', e);
      return Response.json({ error: 'Token validation failed' }, { status: 401 });
    }

    // Fetch the session and verify ownership
    const { data: session, error: selectErr } = await supabase
      .from('sessions')
      .select('id, user_id, photo_url')
      .eq('id', id)
      .maybeSingle();

    if (selectErr) {
      logger.error('Error selecting session', selectErr);
      return Response.json({ error: 'Failed to fetch session' }, { status: 500 });
    }

    if (!session) {
      return Response.json({ error: 'Session not found' }, { status: 404 });
    }

    if (session.user_id !== userId) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Build an admin supabase client if service role key is configured.
    // This ensures we can remove storage objects even if the public/anon key
    // doesn't have permissions in production.
    const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? undefined;
    const supabaseAdmin = serviceRoleKey && supabaseUrl
      ? createClient(supabaseUrl, serviceRoleKey)
      : supabase;

  // Attempt to remove storage objects: poster and session photo (if present)
  const bucket = 'makeup-photos';
    const pathsToRemove: string[] = [];
  // Poster lives in public bucket `posters/`
  const posterBucket = 'posters';
  const posterPath = posterKeyForSession(id);
    try {
      const url: string | undefined = session?.photo_url;
      if (url) {
        const marker = `/storage/v1/object/public/${bucket}/`;
        const idx = url.indexOf(marker);
        if (idx !== -1) {
          const path = decodeURIComponent(url.substring(idx + marker.length));
          if (path) pathsToRemove.push(path);
        } else {
          const bucketMarker = `/${bucket}/`;
          const i2 = url.indexOf(bucketMarker);
          if (i2 !== -1) {
            const path = decodeURIComponent(url.substring(i2 + bucketMarker.length));
            if (path) pathsToRemove.push(path);
          }
        }
      }
    } catch (error) {
      logger.debug('Session delete photo path parse failed', error);
    }


    // Remove session poster
    try {
      const { error: posterRmErr } = await (supabaseAdmin as any).storage.from(posterBucket).remove([posterPath]);
      if (posterRmErr) {
        logger.debug('No poster to remove or removal failed', posterRmErr);
      }
    } catch (e) {
      logger.debug('Poster removal threw', e);
    }

    // Remove session photo
    if (pathsToRemove.length > 0) {
      const { error: rmErr } = await (supabaseAdmin as any).storage.from(bucket).remove(pathsToRemove);
      if (rmErr) {
        logger.warn('Error removing storage object for session', rmErr);
      }
    }

    // Delete child rows referencing the session to satisfy FK constraints
    try {
      const { error: colorimetryDelErr } = await (supabaseAdmin as any)
        .from('colorimetry')
        .delete()
        .eq('session_id', id);
      if (colorimetryDelErr) {
        logger.warn('Failed to delete colorimetry rows for session', colorimetryDelErr);
      }
    } catch (e) {
      logger.warn('Colorimetry delete threw', e);
    }

    try {
      const { error: analysesDelErr } = await (supabaseAdmin as any)
        .from('analyses')
        .delete()
        .eq('session_id', id);
      if (analysesDelErr) {
        logger.warn('Failed to delete analyses rows for session', analysesDelErr);
      }
    } catch (e) {
      logger.warn('Analyses delete threw', e);
    }

    // Delete the session row using admin client when available
    const delClient = supabaseAdmin ?? supabase;
    const { error: delErr } = await (delClient as any)
      .from('sessions')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (delErr) {
      logger.error('Error deleting session', delErr);
      return Response.json({ error: 'Failed to delete session' }, { status: 500 });
    }

    return Response.json({ ok: true });
  } catch (err) {
    logger.error('Session delete API error:', err);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest, { params }: { params: any }) {
  try {
    const { id } = await params;
    if (!id) return Response.json({ error: 'Missing session id' }, { status: 400 });

    const supabase = getSupabase();

    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (sessionError) {
      logger.error('Error fetching session', sessionError);
      return Response.json({ error: 'Failed to fetch session' }, { status: 500 });
    }

    if (!session) {
      return Response.json({ error: 'Session not found' }, { status: 404 });
    }

    // If analyses are stored inline on the session row prefer them
    if (session.analyses && Array.isArray(session.analyses)) {
      return Response.json({ ...session, analyses: session.analyses });
    }

    const { data: analyses, error: analysesError } = await supabase
      .from('analyses')
      .select('*')
      .eq('session_id', id);

    if (analysesError) {
      logger.warn('Failed to fetch analyses for session', analysesError);
      // Return session without analyses as a fallback
      return Response.json({ ...session, analyses: [] });
    }

    return Response.json({ ...session, analyses });
  } catch (err) {
    logger.error('Session GET API error:', err);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}
