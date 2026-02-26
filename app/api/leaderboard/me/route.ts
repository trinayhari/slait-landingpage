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
    .single()

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Not on leaderboard" },
      { status: data ? 500 : 404 }
    )
  }

  return NextResponse.json(data)
}
