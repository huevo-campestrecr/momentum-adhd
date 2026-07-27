import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ─── Auth helpers ────────────────────────────────────────────────
export async function signInWithEmail(email) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin }
  })
  return { error }
}

export async function signOut() {
  await supabase.auth.signOut()
}

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

// ─── Habits ─────────────────────────────────────────────────────
export async function loadHabits(userId) {
  const { data, error } = await supabase
    .from('habits')
    .select('*')
    .eq('user_id', userId)
    .order('time')
  return { data, error }
}

export async function saveHabit(habit, userId) {
  const { data, error } = await supabase
    .from('habits')
    .upsert({ ...habit, user_id: userId })
    .select()
    .single()
  return { data, error }
}

export async function deleteHabit(habitId) {
  const { error } = await supabase
    .from('habits')
    .delete()
    .eq('id', habitId)
  return { error }
}

// ─── Completions ─────────────────────────────────────────────────
export async function logCompletion(habitId, userId, date) {
  const { error } = await supabase
    .from('completions')
    .upsert({ habit_id: habitId, user_id: userId, completed_on: date })
  return { error }
}

export async function removeCompletion(habitId, userId, date) {
  const { error } = await supabase
    .from('completions')
    .delete()
    .eq('habit_id', habitId)
    .eq('user_id', userId)
    .eq('completed_on', date)
  return { error }
}

export async function loadCompletions(userId, days = 30) {
  const since = new Date()
  since.setDate(since.getDate() - days)
  const { data, error } = await supabase
    .from('completions')
    .select('*')
    .eq('user_id', userId)
    .gte('completed_on', since.toISOString().split('T')[0])
  return { data, error }
}

// ─── User state (grumpy meter, treats, achievements) ─────────────
export async function loadUserState(userId) {
  const { data, error } = await supabase
    .from('user_state')
    .select('*')
    .eq('user_id', userId)
    .single()
  return { data, error }
}

export async function saveUserState(userId, state) {
  const { error } = await supabase
    .from('user_state')
    .upsert({ user_id: userId, ...state, updated_at: new Date().toISOString() })
  return { error }
}
