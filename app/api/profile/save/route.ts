import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import logger from '@/lib/logger'

const allowedSkinTypes = new Set(['oily', 'dry', 'combination', 'normal', 'sensitive']);
const allowedSkinTones = new Set(['fair', 'light', 'medium', 'tan', 'deep', 'dark']);
const allowedLidTypes = new Set([
  'almond-eyes',
  'round-eyes',
  'hooded-eyes',
  'monolid-eyes',
  'upturned-eyes',
  'downturned-eyes',
  'close-set-eyes',
  'wide-set-eyes',
  'deep-set-eyes',
  'protruding-eyes',
  // legacy values accepted for backwards compatibility
  'monolid',
  'hooded',
  'deep_set',
  'protruding',
  'downturned',
  'upturned',
  'almond',
  'standard',
  'round',
  'close_set',
  'wide_set',
]);

const canonicalToLegacyLidTypeMap: Record<string, string> = {
  'almond-eyes': 'almond',
  'round-eyes': 'round',
  'hooded-eyes': 'hooded',
  'monolid-eyes': 'monolid',
  'upturned-eyes': 'upturned',
  'downturned-eyes': 'downturned',
  'close-set-eyes': 'close_set',
  'wide-set-eyes': 'wide_set',
  'deep-set-eyes': 'deep_set',
  'protruding-eyes': 'protruding',
};

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
    if (normalizedLidType !== undefined) {
      if (normalizedLidType === null) {
        payload.lid_type = null;
      } else if (canonicalToLegacyLidTypeMap[normalizedLidType]) {
        payload.lid_type = canonicalToLegacyLidTypeMap[normalizedLidType];
      } else {
        payload.lid_type = normalizedLidType;
      }
    }

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

    const { data: existing, error: existingErr } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (existingErr) {
      logger.error('Error checking existing profile', existingErr);
      return Response.json({ error: 'Failed to save profile' }, { status: 500 });
    }

    if (existing) {
      const updatePatch: Record<string, unknown> = {};
      (['skin_type', 'skin_tone', 'lid_type'] as const).forEach((key) => {
        if (Object.prototype.hasOwnProperty.call(payload, key)) {
          updatePatch[key] = payload[key];
        }
      });

      if (Object.keys(updatePatch).length === 0) {
        const { data: currentRow, error: selectErr } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();
        data = currentRow;
        error = selectErr;
      } else {
        const upd = await supabase
          .from('profiles')
          .update(updatePatch)
          .eq('user_id', userId)
          .select()
          .maybeSingle();
        data = upd.data;
        error = upd.error;
      }
    } else {
      const insertPayload: Record<string, unknown> = { user_id: userId };
      (['skin_type', 'skin_tone', 'lid_type'] as const).forEach((key) => {
        if (Object.prototype.hasOwnProperty.call(payload, key)) {
          insertPayload[key] = payload[key];
        }
      });

      const ins = await supabase
        .from('profiles')
        .insert(insertPayload)
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
