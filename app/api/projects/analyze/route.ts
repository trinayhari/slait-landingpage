import { NextRequest, NextResponse } from "next/server"
import { analyzeProjectSessions } from "@/lib/projectAnalysis"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const analyzed = await analyzeProjectSessions(body)
    return NextResponse.json(analyzed)
  } catch (error) {
    console.error("[projects/analyze] Error:", error)
    if (error instanceof Error && (error.message.includes("required") || error.message.includes("At least one session is required"))) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }
    if (error instanceof Error && error.message === "No sessions could be analyzed") {
      return NextResponse.json(
        { error: error.message, failedSessions: [] },
        { status: 422 }
      )
    }
    return NextResponse.json(
      { error: "Failed to analyze project", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
