/**
 * Claude Code JSONL pre-processor.
 *
 * The Claude Code CLI writes transcripts where many `role: "user"` entries are
 * actually injected by the harness (tool results, sub-agent prompts, system
 * reminders, slash-command shells). Treating those as the human's prompts
 * pollutes scoring and confuses the rendered transcript.
 *
 * This module:
 *   1. Detects Claude Code JSONL.
 *   2. Classifies every message as `human` or `claude_generated`.
 *   3. Emits a "scoring transcript" JSON string containing only the real
 *      human prompts and main-thread assistant text — safe to hand off to the
 *      shared canonicalizer / pipeline.
 *   4. Returns the full classified list so the UI can render every message
 *      with an explicit "Claude generated" badge.
 */

export type ClaudeGeneratedSubtype =
  | "tool_result"
  | "sidechain"
  | "system_reminder"
  | "command"
  | "attachment"
  | "thinking"
  | "tool_use"

export interface DisplayMessage {
  id: number
  role: "user" | "assistant"
  text: string
  kind: "human" | "claude_generated"
  subtype?: ClaudeGeneratedSubtype
  uuid?: string
}

export interface ParsedClaudeCodeTranscript {
  messages: DisplayMessage[]
  /** JSON array string of `[{role, content}]` containing only scorable human/assistant turns. */
  scoringTranscript: string
  humanCount: number
  claudeGeneratedCount: number
}

interface RawLine {
  type?: string
  subtype?: string
  isSidechain?: boolean
  isMeta?: boolean
  uuid?: string
  parentUuid?: string | null
  content?: unknown
  message?: {
    role?: string
    content?: unknown
  }
}

const NON_MESSAGE_TYPES = new Set([
  "attachment",
  "file-history-snapshot",
  "ai-title",
  "last-prompt",
  "permission-mode",
  "summary",
])

function safeParse(line: string): RawLine | null {
  try {
    const parsed = JSON.parse(line)
    return parsed && typeof parsed === "object" ? (parsed as RawLine) : null
  } catch {
    return null
  }
}

function partsToText(parts: unknown[]): string {
  const out: string[] = []
  for (const part of parts) {
    if (!part || typeof part !== "object") continue
    const p = part as Record<string, unknown>
    if (typeof p.text === "string") {
      out.push(p.text)
    } else if (typeof p.content === "string") {
      out.push(p.content)
    } else if (Array.isArray(p.content)) {
      out.push(partsToText(p.content))
    }
  }
  return out.join("\n").trim()
}

function extractAssistantText(content: unknown): string {
  if (typeof content === "string") return content.trim()
  if (!Array.isArray(content)) return ""
  const textParts = content.filter(
    (p): p is Record<string, unknown> =>
      !!p && typeof p === "object" && (p as Record<string, unknown>).type === "text"
  )
  return partsToText(textParts)
}

function extractToolResultText(content: unknown): string {
  if (!Array.isArray(content)) return ""
  const blocks = content.filter(
    (p): p is Record<string, unknown> =>
      !!p && typeof p === "object" && (p as Record<string, unknown>).type === "tool_result"
  )
  return partsToText(blocks)
}

function extractToolUseText(content: unknown): string {
  if (!Array.isArray(content)) return ""
  const blocks = (content as Record<string, unknown>[]).filter(
    (p) => !!p && typeof p === "object" && p.type === "tool_use"
  )
  return blocks
    .map((b) => {
      const name = typeof b.name === "string" ? b.name : "tool"
      const input = b.input ? JSON.stringify(b.input).slice(0, 240) : ""
      return `[${name}] ${input}`.trim()
    })
    .join("\n")
}

function extractThinkingText(content: unknown): string {
  if (!Array.isArray(content)) return ""
  const blocks = content.filter(
    (p): p is Record<string, unknown> =>
      !!p && typeof p === "object" && ((p as Record<string, unknown>).type === "thinking" ||
        (p as Record<string, unknown>).type === "redacted_thinking")
  )
  return partsToText(blocks)
}

/**
 * Synthetic content the harness injects under role:"user" — recognise it so
 * we don't credit the human for typing it.
 */
const SYNTHETIC_USER_PATTERNS = [
  /<\s*system[-_]reminder\s*>/i,
  /<\s*command-name\s*>/i,
  /<\s*local-command-stdout\s*>/i,
  /<\s*command-message\s*>/i,
  /<\s*task-notification\s*>/i,
]

function looksSynthetic(text: string): boolean {
  return SYNTHETIC_USER_PATTERNS.some((re) => re.test(text))
}

/**
 * Returns true if the raw input plausibly came from the Claude Code CLI.
 * We require at least one line carrying the CLI's distinctive metadata
 * (parentUuid / isSidechain / sessionId), otherwise we leave parsing to the
 * shared canonicalizer.
 */
export function looksLikeClaudeCodeJsonl(raw: string): boolean {
  const lines = raw.split("\n", 50).map((l) => l.trim()).filter(Boolean)
  if (lines.length === 0) return false
  let signal = 0
  for (const line of lines) {
    if (!line.startsWith("{")) continue
    const parsed = safeParse(line)
    if (!parsed) continue
    if (
      "parentUuid" in parsed ||
      "isSidechain" in parsed ||
      "sessionId" in (parsed as Record<string, unknown>) ||
      parsed.type === "file-history-snapshot" ||
      parsed.type === "ai-title"
    ) {
      signal += 1
      if (signal >= 2) return true
    }
  }
  return false
}

export function parseClaudeCodeTranscript(raw: string): ParsedClaudeCodeTranscript | null {
  if (!looksLikeClaudeCodeJsonl(raw)) return null

  const messages: DisplayMessage[] = []
  const scoringTurns: Array<{ role: "user" | "assistant"; content: string }> = []
  let nextId = 0

  for (const rawLine of raw.split("\n")) {
    const line = rawLine.trim()
    if (!line || !line.startsWith("{")) continue
    const parsed = safeParse(line)
    if (!parsed) continue

    const type = parsed.type

    if (type === "system") {
      const text = typeof parsed.content === "string" ? parsed.content.trim() : ""
      if (!text) continue
      messages.push({
        id: nextId++,
        role: "user",
        text,
        kind: "claude_generated",
        subtype: parsed.subtype === "local_command" ? "command" : "system_reminder",
        uuid: parsed.uuid,
      })
      continue
    }

    if (!type || NON_MESSAGE_TYPES.has(type)) continue
    if (type !== "user" && type !== "assistant") continue

    const message = parsed.message
    if (!message || typeof message !== "object") continue
    const role = message.role === "assistant" ? "assistant" : "user"
    const isSidechain = parsed.isSidechain === true

    if (role === "assistant") {
      const text = extractAssistantText(message.content)
      const thinking = extractThinkingText(message.content)
      const toolUse = extractToolUseText(message.content)

      // Main-thread assistant text = the model's real reply (kind: human).
      // Sidechain assistant text = a sub-agent's reply, flag as claude_generated.
      if (text) {
        messages.push({
          id: nextId++,
          role: "assistant",
          text,
          kind: isSidechain ? "claude_generated" : "human",
          subtype: isSidechain ? "sidechain" : undefined,
          uuid: parsed.uuid,
        })
        if (!isSidechain) {
          scoringTurns.push({ role: "assistant", content: text })
        }
      }
      if (thinking) {
        messages.push({
          id: nextId++,
          role: "assistant",
          text: thinking,
          kind: "claude_generated",
          subtype: "thinking",
          uuid: parsed.uuid,
        })
      }
      if (toolUse) {
        messages.push({
          id: nextId++,
          role: "assistant",
          text: toolUse,
          kind: "claude_generated",
          subtype: "tool_use",
          uuid: parsed.uuid,
        })
      }
      continue
    }

    // role === "user"
    const content = message.content
    if (Array.isArray(content)) {
      const toolResultText = extractToolResultText(content)
      if (toolResultText) {
        messages.push({
          id: nextId++,
          role: "user",
          text: toolResultText,
          kind: "claude_generated",
          subtype: "tool_result",
          uuid: parsed.uuid,
        })
        continue
      }
      // Fallback: array user content with no tool_result blocks — flatten and
      // treat as synthetic injection (attachments, etc.).
      const flat = partsToText(content)
      if (flat) {
        messages.push({
          id: nextId++,
          role: "user",
          text: flat,
          kind: "claude_generated",
          subtype: "attachment",
          uuid: parsed.uuid,
        })
      }
      continue
    }

    const text = typeof content === "string" ? content.trim() : ""
    if (!text) continue

    if (isSidechain) {
      messages.push({
        id: nextId++,
        role: "user",
        text,
        kind: "claude_generated",
        subtype: "sidechain",
        uuid: parsed.uuid,
      })
      continue
    }

    if (looksSynthetic(text)) {
      messages.push({
        id: nextId++,
        role: "user",
        text,
        kind: "claude_generated",
        subtype: "system_reminder",
        uuid: parsed.uuid,
      })
      continue
    }

    messages.push({
      id: nextId++,
      role: "user",
      text,
      kind: "human",
      uuid: parsed.uuid,
    })
    scoringTurns.push({ role: "user", content: text })
  }

  const humanCount = messages.filter((m) => m.kind === "human" && m.role === "user").length
  const claudeGeneratedCount = messages.filter((m) => m.kind === "claude_generated").length

  if (humanCount === 0 && claudeGeneratedCount === 0) return null

  return {
    messages,
    scoringTranscript: JSON.stringify(scoringTurns),
    humanCount,
    claudeGeneratedCount,
  }
}
