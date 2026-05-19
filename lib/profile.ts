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

  const { data: { user } } = await supabase.auth.getUser()

  const { data: sessionsRaw } = await supabase.rpc("get_profile_sessions", {
    p_profile_id: profile.id,
  })
  const sessions = (sessionsRaw ?? []).sort(
    (a: { created_at: string }, b: { created_at: string }) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  const { data: projectsRaw } = await supabase.rpc("get_profile_projects", {
    p_profile_id: profile.id,
  })
  const projects = (projectsRaw ?? []).sort(
    (a: { created_at: string }, b: { created_at: string }) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  const { data: leaderboard } = await supabase
    .from("leaderboard_stats")
    .select("best_score, avg_score, session_count, project_count, percentile_display, rank")
    .eq("id", profile.id)
    .single()

  return {
    profile,
    sessions: sessions ?? [],
    projects: projects ?? [],
    leaderboard,
    isOwner: user?.id === profile.id,
  }
}
