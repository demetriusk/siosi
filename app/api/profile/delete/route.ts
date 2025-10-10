import { NextRequest } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import logger from '@/lib/logger'

export async function POST(req: NextRequest) {
  try {
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
      const resp = await fetch(`${process.env.SUPABASE_URL}/auth/v1/user`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          apiKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? ''
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

    // Fetch sessions belonging to the user
    const { data: sessions, error: selectErr } = await supabase
      .from('sessions')
      .select('id, photo_url')
      .eq('user_id', userId);

    if (selectErr) {
      logger.error('Error selecting sessions to delete', selectErr);
      return Response.json({ error: 'Failed to list sessions' }, { status: 500 });
    }

    // Collect storage paths for deletion from the photo_url field
    const bucket = 'makeup-photos';
    const pathsToRemove: string[] = [];

    (sessions || []).forEach((s: any) => {
      const url: string | undefined = s?.photo_url;
      if (!url) return;

      try {
        // Supabase public URL shape: <SUPABASE_URL>/storage/v1/object/public/<bucket>/<path>
        const marker = `/storage/v1/object/public/${bucket}/`;
        const idx = url.indexOf(marker);
        if (idx !== -1) {
          const path = decodeURIComponent(url.substring(idx + marker.length));
          if (path) pathsToRemove.push(path);
        } else {
          // Fallback: try by bucket name
          const bucketMarker = `/${bucket}/`;
          const i2 = url.indexOf(bucketMarker);
          if (i2 !== -1) {
            const path = decodeURIComponent(url.substring(i2 + bucketMarker.length));
            if (path) pathsToRemove.push(path);
          }
        }
      } catch {
        // ignore per-item parse errors
      }
    });

    // Remove storage objects (if any)
    if (pathsToRemove.length > 0) {
      const { error: rmErr } = await supabase.storage.from(bucket).remove(pathsToRemove);
      if (rmErr) {
        // Log and continue; we still attempt to delete DB rows
        logger.warn('Error removing storage objects', rmErr);
      }
    }

    // Delete sessions rows for the user
    const { error: delErr } = await supabase
      .from('sessions')
      .delete()
      .eq('user_id', userId);

    if (delErr) {
      logger.error('Error deleting sessions', delErr);
      return Response.json({ error: 'Failed to delete sessions' }, { status: 500 });
    }

    // TODO: If you have other tables (analyses, usage_tracking) that reference user_id, delete them here similarly.

    return Response.json({ ok: true });
  } catch (err) {
    logger.error('Profile delete API error:', err);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}
