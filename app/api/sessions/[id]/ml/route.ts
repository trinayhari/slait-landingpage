import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getApiUser } from "@/lib/api-auth"

interface MLSessionDocument {
  conversation_id: string | null
  project_id: string | null
  source: string
  started_at: string
  ended_at: string | null
  duration_ms: number | null
  end_reason: string | null
  error_message: string | null
  transcript: Array<{ role: string; content: string }>
  events: Array<Record<string, unknown>>
  turn_count: number
  overall_score: number | null
  confidence: string | null
  dimension_scores: Record<string, number> | null
  strengths: string[]
  weaknesses: string[]
  detected_patterns: string[]
  hire_signal: string | null
  summary: string | null
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const auth = await getApiUser(request)
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 401 })
  }

  const supabase = auth.isApiKey ? createAdminClient() : await createClient()

  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", id)
    .eq("user_id", auth.user.id)
    .single()

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Session not found" },
      { status: error?.code === "PGRST116" ? 404 : 500 }
    )
  }

  let transcript: Array<{ role: string; content: string }> = []
  if (typeof data.raw_log === "string" && data.raw_log.length > 0) {
    try {
      transcript = JSON.parse(data.raw_log)
    } catch {
      transcript = []
    }
  }

  const doc: MLSessionDocument = {
    conversation_id: data.session_label ?? null,
    project_id: data.project_id ?? null,
    source: data.source,
    started_at: data.created_at,
    ended_at: data.updated_at ?? null,
    duration_ms: data.duration_ms ?? null,
    end_reason: data.end_reason ?? null,
    error_message: data.error_message ?? null,
    transcript,
    events: Array.isArray(data.session_events) ? data.session_events : [],
    turn_count: data.turn_count ?? 0,
    overall_score: data.overall_score != null ? Number(data.overall_score) : null,
    confidence: data.confidence ?? null,
    dimension_scores: data.dimension_scores ?? null,
    strengths: Array.isArray(data.strengths) ? data.strengths : [],
    weaknesses: Array.isArray(data.weaknesses) ? data.weaknesses : [],
    detected_patterns: Array.isArray(data.detected_patterns) ? data.detected_patterns : [],
    hire_signal: data.hire_signal ?? null,
    summary: data.summary ?? null,
  }

  return NextResponse.json(doc)
}
