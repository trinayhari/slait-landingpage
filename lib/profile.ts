import { createClient } from "@/lib/supabase/server"

export async function getPublicProfileByHandle(handle: string) {
  const supabase = await createClient()

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, handle, display_name, avatar_url, is_public")
    .eq("handle", handle)
    .eq("is_public", true)
    .single()

  if (profileError || !profile) return null

  const { data: sessions } = await supabase
    .from("sessions")
    .select("id, source, file_name, overall_score, hire_signal, created_at")
    .eq("user_id", profile.id)
    .eq("is_public", true)
    .order("created_at", { ascending: false })

  const { data: leaderboard } = await supabase
    .from("leaderboard_stats")
    .select("best_score, session_count, percentile_display, rank")
    .eq("id", profile.id)
    .single()

  return { profile, sessions: sessions ?? [], leaderboard }
}
