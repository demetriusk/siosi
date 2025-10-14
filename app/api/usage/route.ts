import { NextRequest } from 'next/server';
import { checkUsageLimit } from '@/lib/usage-limits';
import logger from '@/lib/logger';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const match = authHeader.match(/^Bearer (.+)$/i);
    const token = match ? match[1] : null;

    // If no token, return anonymous limits
    if (!token) {
      return Response.json({
        role: 'anonymous',
        limit: 3,
        remaining: 3, // Client-side tracks this
        used: 0,
      });
    }

    const supabaseAuthUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseApiKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseAuthUrl) {
      return Response.json({ error: 'Server misconfiguration' }, { status: 500 });
    }

    let userId: string | undefined;
    const resp = await fetch(`${supabaseAuthUrl}/auth/v1/user`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        apiKey: supabaseApiKey ?? '',
      },
    });

    if (!resp.ok) {
      return Response.json({ error: 'Invalid token' }, { status: 401 });
    }

    const data = await resp.json();
    userId = data?.id;

    if (!userId) {
      return Response.json({ error: 'Could not resolve user id' }, { status: 401 });
    }

    const usage = await checkUsageLimit(userId);

    return Response.json({
      role: usage.role,
      limit: usage.limit,
      remaining: usage.remaining,
      used: 0, // Not tracking for registered users yet
    });
  } catch (err) {
    logger.error('Usage API error:', err);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}