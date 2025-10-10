import { createClient, SupabaseClient } from '@supabase/supabase-js';

const isBrowser = typeof window !== 'undefined';

// Browser/client-side Supabase client uses NEXT_PUBLIC_* keys which are
// safe to expose and are inlined by the bundler during build.
const publicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publicAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase: SupabaseClient | null =
	isBrowser && publicUrl && publicAnonKey
		? createClient(publicUrl, publicAnonKey)
		: null;

// Helpful runtime diagnostic: warn in the browser console if the public keys are not present
if (isBrowser && !supabase) {
  // eslint-disable-next-line no-console
  console.warn('Supabase client not initialized on the client. Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set during build/deploy.');
}

let serverClient: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
	if (isBrowser) {
		if (!supabase) {
			throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY for client-side Supabase.');
		}
		return supabase;
	}

	if (serverClient) return serverClient;

	// Prefer server env vars (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY) for runtime
	// server-side credential usage; fall back to NEXT_PUBLIC values if provided.
	const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
	const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
	const supabaseAnonKey = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
	const supabaseKey = supabaseServiceRoleKey ?? supabaseAnonKey;

	if (!supabaseUrl || !supabaseKey) {
		throw new Error('Supabase environment variables are not set on the server: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY) are required.');
	}

	serverClient = createClient(supabaseUrl, supabaseKey, {
		auth: {
			autoRefreshToken: false,
			persistSession: false,
		},
	});
	return serverClient;
}
