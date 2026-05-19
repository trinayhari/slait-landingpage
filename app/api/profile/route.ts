import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const HANDLE_REGEX = /^[a-z0-9]([a-z0-9-]{0,29}[a-z0-9])?$/

function generateHandle(user: { id: string }): string {
  return `user-${user.id.slice(0, 8)}`
}

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  let { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  if (error?.code === "PGRST116" || (!data && !error)) {
    const handle = generateHandle(user)
    const displayName =
      user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? null
    const { data: inserted, error: insertError } = await supabase
      .from("profiles")
      .insert({
        id: user.id,
        handle,
        display_name: displayName,
        avatar_url: user.user_metadata?.avatar_url ?? null,
      })
      .select()
      .single()
    if (insertError) {
      console.error("[profile] GET insert error:", insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }
    return NextResponse.json(inserted)
  }
  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Profile not found" }, { status: 500 })
  }
  return NextResponse.json(data)
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: { handle?: string; display_name?: string; is_public?: boolean }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const updates: { handle?: string; display_name?: string | null; is_public?: boolean } = {}
  if (typeof body.handle === "string") {
    const trimmed = body.handle.trim().toLowerCase().replace(/\s+/g, "-")
    if (!HANDLE_REGEX.test(trimmed)) {
      return NextResponse.json(
        { error: "Handle must be 1–31 characters, lowercase letters, numbers, and hyphens" },
        { status: 400 }
      )
    }
    updates.handle = trimmed
  }
  if (typeof body.display_name === "string") {
    updates.display_name = body.display_name.trim() || null
  }
  if (typeof body.is_public === "boolean") updates.is_public = body.is_public

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No updates" }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id)
    .select()
    .single()

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Handle already taken" }, { status: 400 })
    }
    console.error("[profile] PATCH error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}
