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

let serverClient: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
	if (isBrowser) {
		if (!supabase) {
			throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY for client-side Supabase.');
		}
		return supabase;
	}

	if (serverClient) return serverClient;

	// Prefer server env vars (SUPABASE_URL / SUPABASE_ANON_KEY) for runtime
	// server-side credential usage; fall back to NEXT_PUBLIC values if provided.
	const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
	const supabaseAnonKey = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

	if (!supabaseUrl || !supabaseAnonKey) {
		throw new Error('Supabase environment variables are not set on the server: SUPABASE_URL and SUPABASE_ANON_KEY (or NEXT_PUBLIC_* equivalents) are required.');
	}

	serverClient = createClient(supabaseUrl, supabaseAnonKey);
	return serverClient;
}
