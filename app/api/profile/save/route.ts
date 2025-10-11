import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import logger from '@/lib/logger'

const allowedSkinTypes = new Set(['oily', 'dry', 'combination', 'normal', 'sensitive']);
const allowedSkinTones = new Set(['fair', 'light', 'medium', 'tan', 'deep', 'dark']);
const allowedLidTypes = new Set(['monolid', 'hooded', 'deep_set', 'protruding', 'downturned', 'upturned', 'almond', 'standard']);

function sanitizeOptionalEnum(
  value: unknown,
  allowed: Set<string>,
  fieldName: 'skin_type' | 'skin_tone' | 'lid_type'
): { value: string | null | undefined; error: string | null } {
  if (value === undefined) return { value: undefined, error: null };
  if (value === null) return { value: null, error: null };
  if (typeof value !== 'string') {
    return { value: undefined, error: `Invalid ${fieldName} value` };
  }

  const normalized = value.trim().toLowerCase();
  if (normalized.length === 0) {
    return { value: null, error: null };
  }

  if (!allowed.has(normalized)) {
    return { value: undefined, error: `Unsupported ${fieldName} value` };
  }

  return { value: normalized, error: null };
}

export async function POST(req: NextRequest) {
  try {
    // Require Authorization header with Bearer token and validate it
    const authHeader = req.headers.get('authorization') || '';
    const match = authHeader.match(/^Bearer (.+)$/i);
    const token = match ? match[1] : null;

    if (!token) {
      return Response.json({ error: 'Missing Authorization token' }, { status: 401 });
    }

    // Validate token with Supabase Auth endpoint to get user id
    let userId: string | undefined = undefined;
    const supabaseAuthUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabaseApiKey = supabaseServiceRoleKey ?? supabaseAnonKey ?? '';

    if (!supabaseAuthUrl) {
      logger.error('SUPABASE_URL is not configured on the server');
      return Response.json({ error: 'Server misconfiguration' }, { status: 500 });
    }

    try {
      const resp = await fetch(`${supabaseAuthUrl}/auth/v1/user`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          apiKey: supabaseApiKey
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
    const { value: normalizedSkinType, error: skinTypeError } = sanitizeOptionalEnum(body?.skin_type, allowedSkinTypes, 'skin_type');
    if (skinTypeError) {
      return Response.json({ error: skinTypeError }, { status: 400 });
    }

    const { value: normalizedSkinTone, error: skinToneError } = sanitizeOptionalEnum(body?.skin_tone, allowedSkinTones, 'skin_tone');
    if (skinToneError) {
      return Response.json({ error: skinToneError }, { status: 400 });
    }

    const { value: normalizedLidType, error: lidTypeError } = sanitizeOptionalEnum(body?.lid_type, allowedLidTypes, 'lid_type');
    if (lidTypeError) {
      return Response.json({ error: lidTypeError }, { status: 400 });
    }

    const payload: Record<string, unknown> = { user_id: userId };
    if (normalizedSkinType !== undefined) payload.skin_type = normalizedSkinType;
    if (normalizedSkinTone !== undefined) payload.skin_tone = normalizedSkinTone;
    if (normalizedLidType !== undefined) payload.lid_type = normalizedLidType;

    // Upsert profile row by user_id
    // Create a per-request Supabase client.
    // If we have a service role key, use it (bypasses RLS). Otherwise, use anon key
    // but include the user's JWT so RLS sees the authenticated user.
    const supabaseUrl = supabaseAuthUrl;
    const supabaseKey = supabaseApiKey;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Try update-by-user_id first to avoid requiring a unique constraint for upsert
    let data: any = null;
    let error: any = null;

    const { data: existing } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      const upd = await supabase
        .from('profiles')
        .update({
          skin_type: payload.skin_type ?? null,
          skin_tone: payload.skin_tone ?? null,
          lid_type: payload.lid_type ?? null,
        })
        .eq('user_id', userId)
        .select()
        .maybeSingle();
      data = upd.data;
      error = upd.error;
    } else {
      const ins = await supabase
        .from('profiles')
        .insert(payload)
        .select()
        .single();
      data = ins.data;
      error = ins.error;
    }

    if (error) {
      logger.error('Error saving profile', error);
      return Response.json({ error: 'Failed to save profile' }, { status: 500 });
    }

    return Response.json({ ok: true, profile: data });
  } catch (err) {
    logger.error('Profile save API error:', err);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}
