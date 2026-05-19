import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getApiUser } from "@/lib/api-auth"
import type { AIUsageAnalysis, SessionSource } from "@/lib/types"
import { analysisToSessionRow } from "@/lib/sessionRow"
import { recomputeProjectRollupForUserProject } from "@/lib/projectRollup"

const VALID_SOURCES: SessionSource[] = [
  "cursor",
  "claude",
  "chatgpt",
  "copilot",
  "windsurf",
  "other",
]

export async function GET(request: NextRequest) {
  const auth = await getApiUser(request)
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 401 })
  }

  const supabase = auth.isApiKey ? createAdminClient() : await createClient()
  const { data, error } = await supabase
    .from("sessions")
    .select("id, created_at, source, project_id, session_label, file_name, overall_score, confidence, hire_signal, summary, dimension_scores, strengths, weaknesses, detected_patterns, example_evidence, module_eval, status, turn_count")
    .eq("user_id", auth.user.id)
    .is("organization_id", null)
    .order("created_at", { ascending: false })
  if (error) {
    console.error("[sessions] GET error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data ?? [])
}

export async function POST(request: NextRequest) {
  const auth = await getApiUser(request)
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 401 })
  }

  const supabase = auth.isApiKey ? createAdminClient() : await createClient()

  let body: {
    analysis?: AIUsageAnalysis
    source: SessionSource
    status?: "in_progress" | "complete"
    fileName?: string | null
    rawLog?: string | null
    supplementaryFiles?: Record<string, string> | null
    projectId?: string | null
    sessionLabel?: string | null
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { source, projectId, sessionLabel } = body

  if (!VALID_SOURCES.includes(source)) {
    return NextResponse.json({ error: "Invalid source" }, { status: 400 })
  }

  if (projectId) {
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .eq("user_id", auth.user.id)
      .is("organization_id", null)
      .maybeSingle()

    if (projectError) {
      console.error("[sessions] POST project check error:", projectError)
      return NextResponse.json({ error: projectError.message }, { status: 500 })
    }
    if (!project) {
      return NextResponse.json(
        {
          error:
            "Project not found. The linked project may have been deleted. Run 'slait init' in your project directory to re-link.",
        },
        { status: 404 }
      )
    }
  }

  // Minimal in_progress session (no analysis required)
  if (body.status === "in_progress") {
    const { data, error } = await supabase
      .from("sessions")
      .insert({
        user_id: auth.user.id,
        organization_id: null,
        source,
        project_id: projectId ?? null,
        session_label: sessionLabel ?? null,
        status: "in_progress",
        summary: "Session in progress...",
        is_public: true,
      })
      .select("id, created_at")
      .single()

    if (error) {
      console.error("[sessions] POST in_progress error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json(data)
  }

  // Full session with analysis
  const { analysis, fileName, rawLog, supplementaryFiles } = body
  if (!analysis || typeof analysis !== "object") {
    return NextResponse.json({ error: "analysis is required" }, { status: 400 })
  }

  const row = analysisToSessionRow(
    analysis,
    source,
    fileName ?? null,
    rawLog ?? null,
    supplementaryFiles ?? null,
    projectId ?? null,
    sessionLabel ?? null
  )
  const { data, error } = await supabase
    .from("sessions")
    .insert({ user_id: auth.user.id, organization_id: null, status: "complete", ...row })
    .select("id, created_at")
    .single()

  if (error) {
    console.error("[sessions] POST error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (projectId) {
    // Keep project-level aggregate scores up to date as sessions are added.
    await recomputeProjectRollupForUserProject(supabase, projectId, auth.user.id)
  }

  return NextResponse.json(data)
}
