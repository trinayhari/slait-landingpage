import { NextRequest, NextResponse } from "next/server"
import { runPipeline } from "@recruiting-buddy/analysis"
import type { PipelineResult } from "@recruiting-buddy/analysis"
import type { SessionSource } from "@/lib/types"
import { pipelineResultToAnalysis } from "@/lib/pipelineAnalysis"
import { parseClaudeCodeTranscript } from "@/lib/claudeCodeJsonl"

const VALID_SOURCES: SessionSource[] = ["cursor", "claude", "chatgpt", "copilot", "windsurf", "other"]

function parseSessionSource(source: unknown): SessionSource | undefined {
  return typeof source === "string" && (VALID_SOURCES as string[]).includes(source) ? (source as SessionSource) : undefined
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      console.error("OPENROUTER_API_KEY is not set")
      return NextResponse.json(
        { error: "API key not configured" },
        { status: 500 }
      )
    }

    const { chatLog, supplementaryFiles, configMetadata, source } = await request.json()

    if (!chatLog || typeof chatLog !== "string") {
      return NextResponse.json(
        { error: "Chat log is required" },
        { status: 400 }
      )
    }

    const suppFiles: Record<string, string> | undefined =
      supplementaryFiles && typeof supplementaryFiles === "object" && !Array.isArray(supplementaryFiles)
        ? supplementaryFiles
        : undefined

    const configMeta = configMetadata && typeof configMetadata === "object" && !Array.isArray(configMetadata)
      ? configMetadata
      : undefined

    const sessionSource = parseSessionSource(source)

    // Pre-process Claude Code JSONL: classify each message and strip
    // harness-injected entries (tool results, sub-agent prompts, system
    // reminders) so they don't pollute scoring.
    const parsedClaudeCode = parseClaudeCodeTranscript(chatLog)
    const scoringInput = parsedClaudeCode ? parsedClaudeCode.scoringTranscript : chatLog

    if (parsedClaudeCode) {
      console.log(
        "[analyze] Claude Code JSONL detected: %d human / %d claude-generated messages (input %d → scoring %d chars)",
        parsedClaudeCode.humanCount,
        parsedClaudeCode.claudeGeneratedCount,
        chatLog.length,
        scoringInput.length
      )
    }

    console.log("[analyze] Running pipeline on log of length:", scoringInput.length, "supplementary files:", suppFiles ? Object.keys(suppFiles).length : 0, "config metadata:", !!configMeta, "source:", sessionSource)
    const result = await runPipeline(scoringInput, undefined, suppFiles, configMeta, sessionSource)
    console.log("[analyze] Pipeline complete, moduleEval:", !!result.moduleEval)
    logRoleBalance("[analyze]", result)

    const analysis = pipelineResultToAnalysis(result)
    if (parsedClaudeCode) {
      analysis.displayMessages = parsedClaudeCode.messages
    }
    return NextResponse.json(analysis)
  } catch (error) {
    console.error("[analyze] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to analyze chat log",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

// ── Mapping ────────────────────────────────────────────────────────────────

function logRoleBalance(prefix: string, result: PipelineResult) {
  const userEvents = result.canonical_events.filter((e) => e.role === "user").length
  const assistantEvents = result.canonical_events.filter((e) => e.role === "assistant").length
  const iterationScore = result.moduleEval?.module_scores?.iteration?.score
  const iterationFallback = result.moduleEval?.module_scores?.iteration?.fallback

  console.log(
    `${prefix} role balance`,
    {
      userEvents,
      assistantEvents,
      totalEvents: result.canonical_events.length,
      annotatedTurns: result.annotated_turns?.length ?? 0,
      iterationScore,
      iterationFallback,
    }
  )

  if (assistantEvents === 0 && userEvents > 0) {
    console.warn(`${prefix} transcript parsed with zero assistant events; iteration quality may be under-evaluated`)
  }
}
