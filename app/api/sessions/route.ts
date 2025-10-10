import { NextRequest } from 'next/server'
import logger from '@/lib/logger'
import { getSupabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const supabase = getSupabase();

    // Authorization header is optional. If present, validate the token and
    // resolve a user id. If absent, proceed with anonymous session creation.
    const authHeader = req.headers.get('authorization') || '';
    const match = authHeader.match(/^Bearer (.+)$/i);
    const token = match ? match[1] : null;

    let userId: string | undefined = undefined;
    if (token) {
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
          logger.warn('Could not resolve user id from token');
          return Response.json({ error: 'Could not resolve user id from token' }, { status: 401 });
        }
      } catch (e) {
        logger.warn('Token validation error', e);
        return Response.json({ error: 'Token validation failed' }, { status: 401 });
      }
    } else {
      logger.debug('No Authorization token provided — creating anonymous session');
    }

    const insertPayload: any = {
      photo_url: body.photo_url,
      analyses: body.analyses ?? [],
      overall_score: body.overall_score ?? 0,
      confidence_avg: body.confidence_avg ?? 0,
      critical_count: body.critical_count ?? 0,
    }

    if (body.occasion) insertPayload.occasion = body.occasion
    if (body.concerns) insertPayload.concerns = body.concerns
    if (body.skin_type) insertPayload.skin_type = body.skin_type
    if (body.skin_tone) insertPayload.skin_tone = body.skin_tone
    if (body.lid_type) insertPayload.lid_type = body.lid_type
    if (userId) insertPayload.user_id = userId

    const { data, error } = await supabase
      .from('sessions')
      .insert(insertPayload)
      .select()
      .single()

    if (error) {
  logger.error('Error inserting session:', error)
      return Response.json({ error: error.message || 'Insert failed' }, { status: 500 })
    }

    return Response.json(data)
  } catch (err) {
  logger.error('Sessions API error:', err)
    return Response.json({ error: 'Server error' }, { status: 500 })
  }
}
