import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import type { AIUsageAnalysis, SessionSource } from "@/lib/types"

const VALID_SOURCES: SessionSource[] = [
  "cursor",
  "claude",
  "chatgpt",
  "copilot",
  "windsurf",
  "other",
]

function analysisToRow(analysis: AIUsageAnalysis, source: SessionSource, fileName: string | null) {
  return {
    source,
    file_name: fileName,
    overall_score: analysis.overallScore,
    confidence: analysis.confidence,
    dimension_scores: analysis.dimensionScores,
    dimension_evidence: analysis.dimensionEvidence ?? null,
    strengths: analysis.strengths,
    weaknesses: analysis.weaknesses,
    detected_patterns: analysis.detectedPatterns,
    example_evidence: analysis.exampleEvidence,
    hire_signal: analysis.hireSignal,
    summary: analysis.summary,
    is_public: false,
  }
}

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
  if (error) {
    console.error("[sessions] GET error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data ?? [])
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: { analysis: AIUsageAnalysis; source: SessionSource; fileName?: string | null }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { analysis, source, fileName } = body
  if (!analysis || typeof analysis !== "object") {
    return NextResponse.json({ error: "analysis is required" }, { status: 400 })
  }
  if (!VALID_SOURCES.includes(source)) {
    return NextResponse.json({ error: "Invalid source" }, { status: 400 })
  }

  const row = analysisToRow(analysis, source, fileName ?? null)
  const { data, error } = await supabase
    .from("sessions")
    .insert({ user_id: user.id, ...row })
    .select("id, created_at")
    .single()

  if (error) {
    console.error("[sessions] POST error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}
