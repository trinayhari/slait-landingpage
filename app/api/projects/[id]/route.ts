import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .is("organization_id", null)
    .single()

  if (projectError || !project) {
    return NextResponse.json(
      { error: projectError?.message ?? "Project not found" },
      { status: projectError?.code === "PGRST116" ? 404 : 500 }
    )
  }

  const { data: sessions, error: sessionsError } = await supabase
    .from("sessions")
    .select("id, file_name, session_label, source, overall_score, confidence, hire_signal, created_at, status, turn_count")
    .eq("project_id", id)
    .is("organization_id", null)
    .order("created_at", { ascending: false })

  if (sessionsError) {
    return NextResponse.json({ error: sessionsError.message }, { status: 500 })
  }

  const sessionList = sessions ?? []
  const sourcesUsed = [...new Set(sessionList.map((s: { source: string }) => s.source))]
  if (sourcesUsed.length === 0 && project.source) {
    sourcesUsed.push(project.source)
  }

  return NextResponse.json({ ...project, sessions: sessionList, sources_used: sourcesUsed, is_owner: user?.id === project.user_id })
}

export async function PATCH(
  request: NextRequest,
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

  let body: { is_public?: boolean }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (typeof body.is_public !== "boolean") {
    return NextResponse.json({ error: "No updates" }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("projects")
    .update({ is_public: body.is_public })
    .eq("id", id)
    .eq("user_id", user.id)
    .is("organization_id", null)
    .select("*")
    .single()

  if (error) {
    console.error("[projects] PATCH error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { error: sessionUpdateError } = await supabase
    .from("sessions")
    .update({ is_public: body.is_public })
    .eq("project_id", id)
    .eq("user_id", user.id)
    .is("organization_id", null)

  if (sessionUpdateError) {
    console.error("[projects] PATCH session visibility sync error:", sessionUpdateError)
    return NextResponse.json({ error: sessionUpdateError.message }, { status: 500 })
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
    .from("projects")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .is("organization_id", null)

  if (error) {
    console.error("[projects] DELETE error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return new NextResponse(null, { status: 204 })
}
