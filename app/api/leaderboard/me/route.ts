import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data, error } = await supabase
    .from("leaderboard_stats")
    .select("*")
    .eq("id", user.id)
    .maybeSingle()

  if (error) {
    console.error("[leaderboard/me] error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!data) return NextResponse.json(null)

  const [{ count: sessionCount, error: sessionsError }, { count: projectCount, error: projectsError }] =
    await Promise.all([
      supabase
        .from("sessions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .is("organization_id", null),
      supabase
        .from("projects")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .is("organization_id", null)
        .not("overall_score", "is", null),
    ])

  if (sessionsError) {
    console.error("[leaderboard/me] sessions count error:", sessionsError)
  }
  if (projectsError) {
    console.error("[leaderboard/me] projects count error:", projectsError)
  }

  return NextResponse.json({
    ...data,
    session_count: sessionCount ?? 0,
    project_count: projectCount ?? 0,
  })
}
