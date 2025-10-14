import { createClient } from '@supabase/supabase-js';
import logger from './logger';

const LIMITS = {
  anonymous: 3,
  user: Infinity,      // Unlimited for now
  admin: Infinity,
  tester: Infinity,
};

interface UsageCheckResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  role: string;
}

/**
 * Check if user can perform analysis based on role and usage
 */
export async function checkUsageLimit(
  userId: string | null | undefined
): Promise<UsageCheckResult> {
  // Anonymous users: 3 analyses (tracked client-side)
  if (!userId) {
    return {
      allowed: true, // Client-side will enforce
      remaining: 3,
      limit: LIMITS.anonymous,
      role: 'anonymous',
    };
  }

  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    logger.error('Supabase credentials missing');
    throw new Error('Server misconfiguration');
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Get user role
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle();

  if (profileError) {
    logger.error('Error fetching profile', profileError);
    throw new Error('Failed to check user limits');
  }

  const role = profile?.role || 'user';

  // All registered users have unlimited for now
  return {
    allowed: true,
    remaining: Infinity,
    limit: Infinity,
    role,
  };
}

/**
 * Increment usage counter for user (for future use)
 */
export async function incrementUsage(userId: string): Promise<void> {
  // Currently not needed since all registered users have unlimited
  // Keep function for future when you enable limits for regular users
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    logger.error('Supabase credentials missing');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const currentMonth = new Date().toISOString().slice(0, 7);

  // Upsert: increment if exists, create if not
  const { data: existing } = await supabase
    .from('usage_tracking')
    .select('analyses_count')
    .eq('user_id', userId)
    .eq('month', currentMonth)
    .maybeSingle();

  if (existing) {
    await supabase
      .from('usage_tracking')
      .update({
        analyses_count: existing.analyses_count + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('month', currentMonth);
  } else {
    await supabase
      .from('usage_tracking')
      .insert({
        user_id: userId,
        month: currentMonth,
        analyses_count: 1,
      });
  }
}