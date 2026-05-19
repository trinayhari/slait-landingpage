import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getApiUser } from "@/lib/api-auth"
import type { AIUsageAnalysis } from "@/lib/types"
import { analysisToSessionRow } from "@/lib/sessionRow"
import { recomputeProjectRollupForUserProject } from "@/lib/projectRollup"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", id)
    .single()

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Session not found" },
      { status: error?.code === "PGRST116" ? 404 : 500 }
    )
  }
  return NextResponse.json(data)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const auth = await getApiUser(request)
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 401 })
  }

  const supabase = auth.isApiKey ? createAdminClient() : await createClient()

  let body: {
    is_public?: boolean
    rawLog?: string
    turnCount?: number
    status?: "in_progress" | "complete"
    analysis?: AIUsageAnalysis
    sessionEvents?: Array<Record<string, unknown>>
    durationMs?: number
    endReason?: string
    errorMessage?: string
    supplementaryFiles?: Record<string, string> | null
    configMetadata?: Record<string, unknown> | null
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}

  if (typeof body.is_public === "boolean") updates.is_public = body.is_public
  if (typeof body.rawLog === "string") updates.raw_log = body.rawLog
  if (typeof body.turnCount === "number") updates.turn_count = body.turnCount
  if (body.status === "in_progress" || body.status === "complete") updates.status = body.status
  if (Array.isArray(body.sessionEvents)) updates.session_events = body.sessionEvents
  if (typeof body.durationMs === "number") updates.duration_ms = body.durationMs
  if (typeof body.endReason === "string") updates.end_reason = body.endReason
  if (typeof body.errorMessage === "string") updates.error_message = body.errorMessage
  if (body.supplementaryFiles && typeof body.supplementaryFiles === "object") {
    updates.supplementary_files = body.supplementaryFiles
  }
  if (body.configMetadata && typeof body.configMetadata === "object") {
    updates.config_metadata = body.configMetadata
  }
  updates.updated_at = new Date().toISOString()

  // When analysis is provided (session finalization), merge all analysis fields
  if (body.analysis && typeof body.analysis === "object") {
    const a = body.analysis
    const analysisRow = analysisToSessionRow(
      a,
      "cursor", // source won't be updated, just used to build the row
      null,
      typeof body.rawLog === "string" ? body.rawLog : null,
      null,
      null,
      null
    )
    updates.overall_score = analysisRow.overall_score
    updates.confidence = analysisRow.confidence
    updates.dimension_scores = analysisRow.dimension_scores
    updates.dimension_evidence = analysisRow.dimension_evidence
    updates.module_eval = analysisRow.module_eval
    updates.annotated_turns = analysisRow.annotated_turns
    updates.strengths = analysisRow.strengths
    updates.weaknesses = analysisRow.weaknesses
    updates.detected_patterns = analysisRow.detected_patterns
    updates.example_evidence = analysisRow.example_evidence
    updates.hire_signal = analysisRow.hire_signal
    updates.summary = analysisRow.summary
  }

  if (Object.keys(updates).length <= 1) {
    return NextResponse.json({ error: "No updates" }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("sessions")
    .update(updates)
    .eq("id", id)
    .eq("user_id", auth.user.id)
    .select("id, status, turn_count, updated_at, project_id")
    .single()

  if (error) {
    console.error("[sessions] PATCH error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 })
  }

  const shouldRecomputeProject =
    typeof data.project_id === "string" &&
    data.project_id.length > 0 &&
    (Boolean(body.analysis) || body.status === "complete")
  if (shouldRecomputeProject) {
    // Keep project-level aggregate scores in sync when sessions finalize.
    await recomputeProjectRollupForUserProject(supabase, data.project_id as string, auth.user.id)
  }

  return NextResponse.json(data)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { error } = await supabase
    .from("sessions")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)

  if (error) {
    console.error("[sessions] DELETE error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
