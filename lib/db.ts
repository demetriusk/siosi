import { getSupabase } from './supabase'

export async function saveSession(data: {
  photo_url: string
  analyses: any
  overall_score: number
  confidence_avg: number
  critical_count: number
  occasion?: string
  concerns?: string[]
  skin_type?: string
  skin_tone?: string
  lid_type?: string
  user_id?: string
}) {
  const supabase = getSupabase();

  const { data: session, error } = await supabase
    .from('sessions')
    .insert({
      ...data,
      save_count: 0,
    })
    .select()
    .single()
  
  if (error) throw error
  return session
}

export async function getSessions(limit = 10) {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  
  if (error) throw error
  return data
}

export async function getSession(id: string) {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error
  return data
}