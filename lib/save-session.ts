import { getSupabase } from './supabase';
import { Session } from './types';
import { normalizeAnalysesPayload } from './normalize-analyses';

interface SaveSessionInput {
  photo_url: string;
  analyses?: any;
  occasion?: Session['occasion'];
  concerns?: Session['concerns'];
  indoor_outdoor?: Session['indoor_outdoor'];
  climate?: Session['climate'];
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

  const normalizedAnalyses = normalizeAnalysesPayload(input.analyses);

  const insertPayload: any = {
    photo_url: input.photo_url,
    analyses: normalizedAnalyses,
    overall_score: input.overall_score,
    confidence_avg: input.confidence_avg,
    critical_count: input.critical_count,
    save_count: 0,
  };

  if (input.occasion) insertPayload.occasion = input.occasion;
  if (input.concerns) insertPayload.concerns = input.concerns;
  if (input.indoor_outdoor) insertPayload.indoor_outdoor = input.indoor_outdoor;
  if (input.climate) insertPayload.climate = input.climate;
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
