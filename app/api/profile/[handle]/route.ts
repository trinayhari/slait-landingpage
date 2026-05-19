import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ handle: string }> }
) {
  const { handle } = await params
  const supabase = await createClient()

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, handle, display_name, avatar_url, is_public")
    .eq("handle", handle)
    .eq("is_public", true)
    .single()

  if (profileError || !profile) {
    return NextResponse.json(
      { error: "Profile not found" },
      { status: 404 }
    )
  }

  const { data: sessions, error: sessionsError } = await supabase
    .from("sessions")
    .select("id, source, file_name, overall_score, hire_signal, created_at")
    .eq("user_id", profile.id)
    .is("organization_id", null)
    .is("project_id", null)
    .not("overall_score", "is", null)
    .eq("is_public", true)
    .order("created_at", { ascending: false })

  if (sessionsError) {
    return NextResponse.json({ error: sessionsError.message }, { status: 500 })
  }

  const { data: leaderboardRow } = await supabase
    .from("leaderboard_stats")
    .select("best_score, avg_score, session_count, percentile_display, rank")
    .eq("id", profile.id)
    .single()

  return NextResponse.json({
    profile,
    sessions: sessions ?? [],
    leaderboard: leaderboardRow ?? null,
  })
}
