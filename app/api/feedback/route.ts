import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_NAME_LENGTH = 255
const MAX_EMAIL_LENGTH = 255
const MAX_MESSAGE_LENGTH = 5000

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const name = typeof body?.name === "string" ? body.name.trim() : ""
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : ""
    const message = typeof body?.message === "string" ? body.message.trim() : ""

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }
    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 })
    }
    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 })
    }
    if (name.length > MAX_NAME_LENGTH) {
      return NextResponse.json({ error: "Name too long" }, { status: 400 })
    }
    if (email.length > MAX_EMAIL_LENGTH) {
      return NextResponse.json({ error: "Email too long" }, { status: 400 })
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json({ error: "Message too long" }, { status: 400 })
    }

    const supabase = createAdminClient()
    const { error } = await supabase.from("feedback").insert({
      name,
      email,
      message,
    })

    if (error) {
      console.error("[feedback] insert error:", error)
      return NextResponse.json({ error: "Failed to save. Please try again." }, { status: 500 })
    }

    return NextResponse.json({ message: "Thanks for the feedback!" }, { status: 200 })
  } catch {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
