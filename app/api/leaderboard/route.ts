import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const SORT_COLUMNS: Record<string, string> = {
  best_score: "best_score",
  avg_score: "avg_score",
  session_count: "session_count",
  project_count: "project_count",
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10))
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)))
  const offset = (page - 1) * limit
  const sortKey = searchParams.get("sort") ?? "best_score"
  const sortCol = SORT_COLUMNS[sortKey] ?? "best_score"

  const { data, error } = await supabase
    .from("leaderboard_stats")
    .select("*")
    .order(sortCol, { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    console.error("[leaderboard] GET error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const entries = data ?? []
  const userIds = entries.map((entry) => entry.id).filter(Boolean)

  if (userIds.length === 0) {
    return NextResponse.json({ entries, page, limit })
  }

  const [{ data: sessions, error: sessionsError }, { data: projects, error: projectsError }] = await Promise.all([
    supabase
      .from("sessions")
      .select("user_id")
      .in("user_id", userIds)
      .is("organization_id", null),
    supabase
      .from("projects")
      .select("user_id")
      .in("user_id", userIds)
      .is("organization_id", null)
      .not("overall_score", "is", null),
  ])

  if (sessionsError) {
    console.error("[leaderboard] sessions count error:", sessionsError)
  }
  if (projectsError) {
    console.error("[leaderboard] projects count error:", projectsError)
  }

  const sessionCounts = new Map<string, number>()
  for (const row of sessions ?? []) {
    sessionCounts.set(row.user_id, (sessionCounts.get(row.user_id) ?? 0) + 1)
  }

  const projectCounts = new Map<string, number>()
  for (const row of projects ?? []) {
    projectCounts.set(row.user_id, (projectCounts.get(row.user_id) ?? 0) + 1)
  }

  const normalizedEntries = entries.map((entry) => ({
    ...entry,
    session_count: sessionCounts.get(entry.id) ?? 0,
    project_count: projectCounts.get(entry.id) ?? 0,
  }))

  return NextResponse.json({ entries: normalizedEntries, page, limit })
}
