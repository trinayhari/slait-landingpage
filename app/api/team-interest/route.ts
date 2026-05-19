import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const raw = typeof body?.email === "string" ? body.email.trim() : ""
    const email = raw.toLowerCase()

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }
    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 })
    }
    if (email.length > 255) {
      return NextResponse.json({ error: "Email too long" }, { status: 400 })
    }

    const supabase = createAdminClient()
    const { error } = await supabase.from("team_interest").insert({ email })

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ message: "You're already on the list!" }, { status: 200 })
      }
      console.error("[team-interest] insert error:", error)
      return NextResponse.json({ error: "Failed to save. Please try again." }, { status: 500 })
    }

    return NextResponse.json({ message: "Thanks! We'll be in touch." }, { status: 200 })
  } catch {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
