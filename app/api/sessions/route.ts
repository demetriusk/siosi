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
    // Prefer server-side SUPABASE_URL; prefer a service role key for server validation
    const supabaseAuthUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseApiKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const isProd = process.env.NODE_ENV === 'production';

    // In production we require a configured SUPABASE_URL and a server key.
    if (isProd) {
      if (!supabaseAuthUrl || !supabaseApiKey) {
        logger.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in production environment');
        return Response.json({ error: 'Server misconfiguration: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set' }, { status: 500 });
      }
      // In production we require Authorization header to create sessions
      if (!token) {
        return Response.json({ error: 'Authorization required' }, { status: 401 });
      }
    }

    if (token) {
      if (!supabaseAuthUrl) {
        // Non-production: allow skipping token validation for local dev if SUPABASE_URL not set
        logger.warn('SUPABASE_URL not configured on server; skipping token validation and creating anonymous session (dev only)');
      } else {
        try {
          const headers: Record<string, string> = {
            Authorization: `Bearer ${token}`,
          };
          if (supabaseApiKey) headers.apikey = supabaseApiKey;

          const resp = await fetch(`${supabaseAuthUrl}/auth/v1/user`, {
            method: 'GET',
            headers
          });

          if (!resp.ok) {
            const txt = await resp.text();
            logger.warn('Supabase token validation failed', { status: resp.status, body: txt });
            return Response.json({ error: 'Invalid token', reason: txt }, { status: 401 });
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

    // If analyses were provided inline, attempt to persist them into the
    // legacy `analyses` table as individual rows (keeps backward compatibility
    // with older UI code that reads from the separate table).
    try {
      const analysesInput = body.analyses ?? [];
      if (Array.isArray(analysesInput) && analysesInput.length > 0) {
        // Normalize each analysis item into the DB row shape. Some analyses may
        // already include `lab_name` vs `name` or other minor differences.
        const rows = analysesInput.map((a: any) => ({
          id: a.id ?? undefined,
          session_id: (data as any).id,
          lab_name: a.lab_name ?? a.name ?? null,
          verdict: a.verdict ?? null,
          confidence: a.confidence ?? null,
          score: a.score ?? null,
          detected: a.detected ?? [],
          recommendations: a.recommendations ?? [],
          zones_affected: a.zones_affected ?? null,
          created_at: a.created_at ?? new Date().toISOString(),
        }));

        const { error: analysesError } = await supabase
          .from('analyses')
          .insert(rows);

        if (analysesError) {
          // Log but don't fail the main request — session creation succeeded.
          logger.warn('Failed to insert analyses rows', analysesError);
        }
      }
    } catch (e) {
      logger.warn('Unexpected error while saving analyses rows', e);
    }

    return Response.json(data)
  } catch (err) {
  logger.error('Sessions API error:', err)
    return Response.json({ error: 'Server error' }, { status: 500 })
  }
}
