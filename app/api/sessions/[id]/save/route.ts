import { NextRequest } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import logger from '@/lib/logger';

async function resolveUserId(req: NextRequest): Promise<string> {
  const authHeader = req.headers.get('authorization') || '';
  const match = authHeader.match(/^Bearer (.+)$/i);
  const token = match ? match[1] : null;

  if (!token) {
    throw new Error('Missing Authorization token');
  }

  const supabaseAuthUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseApiKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseAuthUrl) {
    logger.warn('SUPABASE_URL not configured on server; token validation unavailable (dev only)');
    throw new Error('Token validation not available on server');
  }

  const resp = await fetch(`${supabaseAuthUrl}/auth/v1/user`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      ...(supabaseApiKey ? { apikey: supabaseApiKey } : {}),
    },
  });

  if (!resp.ok) {
    const txt = await resp.text();
    logger.warn('Supabase token validation failed', txt);
    throw new Error('Invalid token');
  }

  const data = await resp.json();
  const userId = data?.id;
  if (!userId) {
    throw new Error('Could not resolve user id from token');
  }

  return userId;
}

async function getSaveCount(sessionId: string): Promise<number> {
  const supabase = getSupabase();

  const { count, error: countError } = await supabase
    .from('session_saves')
    .select('id', { head: true, count: 'exact' })
    .eq('session_id', sessionId);

  if (countError) {
    logger.warn('Failed to count session saves', countError);
    throw new Error('Failed to count session saves');
  }

  return count ?? 0;
}

async function updateSaveCount(sessionId: string): Promise<number> {
  const supabase = getSupabase();

  const total = await getSaveCount(sessionId);

  const { error: updateError } = await supabase
    .from('sessions')
    .update({ save_count: total })
    .eq('id', sessionId);

  if (updateError) {
    logger.warn('Failed to update session save_count', updateError);
  }

  return total;
}

export async function GET(req: NextRequest, { params }: { params: any }) {
  try {
    const { id } = await params;
    if (!id) {
      return Response.json({ error: 'Missing session id' }, { status: 400 });
    }

    const userId = await resolveUserId(req);
    const supabase = getSupabase();

    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id')
      .eq('id', id)
      .maybeSingle();

    if (sessionError) {
      logger.error('Failed to fetch session when checking save state', sessionError);
      return Response.json({ error: 'Failed to fetch session' }, { status: 500 });
    }

    if (!session) {
      return Response.json({ error: 'Session not found' }, { status: 404 });
    }

    const { error, count } = await supabase
      .from('session_saves')
      .select('id', { head: true, count: 'exact' })
      .eq('session_id', id)
      .eq('user_id', userId);

    if (error) {
      logger.warn('Failed to check session save state', error);
      return Response.json({ error: 'Failed to resolve save state' }, { status: 500 });
    }

    let totalSaveCount = 0;
    try {
      totalSaveCount = await getSaveCount(id);
    } catch (countError) {
      logger.debug('Unable to resolve total save count', countError);
    }

    return Response.json({ saved: (count ?? 0) > 0, saveCount: totalSaveCount });
  } catch (error: any) {
    const message = error?.message || 'Server error';
    const status = message === 'Missing Authorization token' ? 401 : 500;
    if (status >= 500) logger.error('Session save GET error', error);
    return Response.json({ error: message }, { status });
  }
}

export async function POST(req: NextRequest, { params }: { params: any }) {
  try {
    const { id } = await params;
    if (!id) {
      return Response.json({ error: 'Missing session id' }, { status: 400 });
    }

    const userId = await resolveUserId(req);
    const supabase = getSupabase();

    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id')
      .eq('id', id)
      .maybeSingle();

    if (sessionError) {
      logger.error('Failed to fetch session before saving', sessionError);
      return Response.json({ error: 'Failed to fetch session' }, { status: 500 });
    }

    if (!session) {
      return Response.json({ error: 'Session not found' }, { status: 404 });
    }

    const { error: insertError } = await supabase
      .from('session_saves')
      .upsert({ session_id: id, user_id: userId }, { onConflict: 'session_id,user_id' });

    if (insertError) {
      logger.error('Failed to save session', insertError);
      return Response.json({ error: 'Failed to save session' }, { status: 500 });
    }

    const saveCount = await updateSaveCount(id);

    return Response.json({ saved: true, saveCount });
  } catch (error: any) {
    const message = error?.message || 'Server error';
    let status = 500;
    if (message === 'Missing Authorization token') status = 401;
    else if (message === 'Invalid token' || message === 'Could not resolve user id from token') status = 401;
    else if (message === 'Token validation not available on server') status = 501;
    if (status >= 500) logger.error('Session save POST error', error);
    return Response.json({ error: message }, { status });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: any }) {
  try {
    const { id } = await params;
    if (!id) {
      return Response.json({ error: 'Missing session id' }, { status: 400 });
    }

    const userId = await resolveUserId(req);
    const supabase = getSupabase();

    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id')
      .eq('id', id)
      .maybeSingle();

    if (sessionError) {
      logger.error('Failed to fetch session before unsaving', sessionError);
      return Response.json({ error: 'Failed to fetch session' }, { status: 500 });
    }

    if (!session) {
      return Response.json({ error: 'Session not found' }, { status: 404 });
    }

    const { error: deleteError } = await supabase
      .from('session_saves')
      .delete()
      .eq('session_id', id)
      .eq('user_id', userId);

    if (deleteError) {
      logger.error('Failed to unsave session', deleteError);
      return Response.json({ error: 'Failed to unsave session' }, { status: 500 });
    }

    const saveCount = await updateSaveCount(id);

    return Response.json({ saved: false, saveCount });
  } catch (error: any) {
    const message = error?.message || 'Server error';
    let status = 500;
    if (message === 'Missing Authorization token') status = 401;
    else if (message === 'Invalid token' || message === 'Could not resolve user id from token') status = 401;
    else if (message === 'Token validation not available on server') status = 501;
    if (status >= 500) logger.error('Session save DELETE error', error);
    return Response.json({ error: message }, { status });
  }
}
