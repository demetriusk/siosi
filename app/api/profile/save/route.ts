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

    const body = await req.json().catch(() => ({}));
    const { skin_type, skin_tone, lid_type } = body || {};

    const payload: any = { user_id: userId };
    if (skin_type) payload.skin_type = skin_type;
    if (skin_tone) payload.skin_tone = skin_tone;
    if (lid_type) payload.lid_type = lid_type;

    // Upsert profile row by user_id
    const { data, error } = await supabase
      .from('profiles')
      .upsert(payload, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) {
      logger.error('Error upserting profile', error);
      return Response.json({ error: 'Failed to save profile' }, { status: 500 });
    }

    return Response.json({ ok: true, profile: data });
  } catch (err) {
    logger.error('Profile save API error:', err);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}
