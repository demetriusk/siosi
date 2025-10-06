import { getSupabase } from './supabase'

export async function saveSession(data: {
  photo_url: string
  analyses: any
  overall_score: number
  confidence_avg: number
  critical_count: number
}) {
  const supabase = getSupabase();

  const { data: session, error } = await supabase
    .from('sessions')
    .insert(data)
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