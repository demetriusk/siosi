import { getSupabase } from './supabase';
import { Session } from './types';

interface SaveSessionInput {
  photo_url: string;
  analyses?: any;
  occasion?: Session['occasion'];
  concerns?: Session['concerns'];
  skin_type?: Session['skin_type'];
  skin_tone?: Session['skin_tone'];
  lid_type?: Session['lid_type'];
  user_id?: string;
  overall_score: number;
  confidence_avg: number;
  critical_count: number;
}

export async function saveSession(input: SaveSessionInput): Promise<Session> {
  const supabase = getSupabase();

  const insertPayload: any = {
    photo_url: input.photo_url,
    analyses: input.analyses ?? [],
    overall_score: input.overall_score,
    confidence_avg: input.confidence_avg,
    critical_count: input.critical_count,
  };

  if (input.occasion) insertPayload.occasion = input.occasion;
  if (input.concerns) insertPayload.concerns = input.concerns;
  if (input.skin_type) insertPayload.skin_type = input.skin_type;
  if (input.skin_tone) insertPayload.skin_tone = input.skin_tone;
  if (input.lid_type) insertPayload.lid_type = input.lid_type;
  if (input.user_id) insertPayload.user_id = input.user_id;

  const { data, error } = await supabase
    .from('sessions')
    .insert(insertPayload)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as Session;
}
