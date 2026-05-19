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
    .from("profiles")
    .select("api_key")
    .eq("id", user.id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Profile not found" }, { status: 500 })
  }

  return NextResponse.json({ api_key: data.api_key })
}

export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({ api_key: crypto.randomUUID() })
    .eq("id", user.id)
    .select("api_key")
    .single()

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Failed to regenerate key" }, { status: 500 })
  }

  return NextResponse.json({ api_key: data.api_key })
}
