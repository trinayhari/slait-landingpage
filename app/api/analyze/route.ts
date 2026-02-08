import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"
import { AIUsageAnalysis } from "@/lib/types"

// OpenRouter model - using Claude 3.5 Sonnet (latest)
const DEFAULT_MODEL = "anthropic/claude-3.5-sonnet"

// Create OpenAI client lazily to ensure env vars are loaded
function getOpenAIClient() {
  return new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
    defaultHeaders: {
      "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
      "X-Title": "SLAIT - AI Usage Analyzer",
    },
  })
}

export async function POST(request: NextRequest) {
  try {
    // Check API key
    if (!process.env.OPENROUTER_API_KEY) {
      console.error("OPENROUTER_API_KEY is not set")
      return NextResponse.json(
        { error: "API key not configured" },
        { status: 500 }
      )
    }

    const { chatLog } = await request.json()

    if (!chatLog || typeof chatLog !== "string") {
      return NextResponse.json(
        { error: "Chat log is required" },
        { status: 400 }
      )
    }

    console.log("Starting analysis for chat log of length:", chatLog.length)
    const analysis = await analyzeAIChatLog(chatLog)
    console.log("Analysis completed successfully")
    return NextResponse.json(analysis)
  } catch (error) {
    console.error("Error in analyze API:", error)
    return NextResponse.json(
      { error: "Failed to analyze chat log", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}

/**
 * Validate that an excerpt actually exists in the original chat log.
 * Strips markdown formatting and uses fuzzy substring matching to handle
 * minor differences between the model's quote and the original text.
 */
function isExcerptInChatLog(excerpt: string, chatLog: string): boolean {
  if (!excerpt || excerpt.length < 10) return false

  // Aggressively normalize: lowercase, strip markdown/special chars, collapse whitespace
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(/```[\s\S]*?```/g, ' ')   // remove code fences
      .replace(/[`*_#~>\-\[\](){}|\\]/g, '') // strip markdown chars
      .replace(/\s+/g, ' ')
      .trim()

  const normalizedLog = normalize(chatLog)
  const normalizedExcerpt = normalize(excerpt)

  // Direct match
  if (normalizedLog.includes(normalizedExcerpt)) return true

  // Sliding window: check if any 3+ word consecutive chunk from the excerpt
  // appears in the log (handles slight trimming/rewording at edges)
  const words = normalizedExcerpt.split(' ').filter(w => w.length > 0)
  for (let len = Math.min(words.length, 10); len >= 3; len--) {
    for (let start = 0; start <= words.length - len; start++) {
      const chunk = words.slice(start, start + len).join(' ')
      if (chunk.length >= 15 && normalizedLog.includes(chunk)) return true
    }
  }

  return false
}

/**
 * Find the approximate location of an excerpt within the chat log.
 * Returns a human-readable location string like "Line 42" or "Near beginning".
 */
function findExcerptLocation(excerpt: string, chatLog: string): string {
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/[`*_#~>\-\[\](){}|\\]/g, '')
      .replace(/\s+/g, ' ')
      .trim()

  const normalizedLog = normalize(chatLog)
  const normalizedExcerpt = normalize(excerpt)

  let charIndex = normalizedLog.indexOf(normalizedExcerpt)

  // If no direct match, try sliding window to find approximate position
  if (charIndex === -1) {
    const words = normalizedExcerpt.split(' ').filter(w => w.length > 0)
    for (let len = Math.min(words.length, 10); len >= 3; len--) {
      for (let start = 0; start <= words.length - len; start++) {
        const chunk = words.slice(start, start + len).join(' ')
        if (chunk.length >= 15) {
          const idx = normalizedLog.indexOf(chunk)
          if (idx !== -1) {
            charIndex = idx
            break
          }
        }
      }
      if (charIndex !== -1) break
    }
  }

  if (charIndex === -1) return ''

  // Count the line number in the original chat log by mapping back
  // from normalized char position to approximate original position
  const ratio = charIndex / normalizedLog.length
  const approxOriginalPos = Math.floor(ratio * chatLog.length)
  const lineNumber = chatLog.substring(0, approxOriginalPos).split('\n').length

  return `Line ${lineNumber}`
}

/**
 * Filter dimension evidence to only include excerpts that actually appear in the chat log.
 * Also computes the location of each excerpt within the log.
 */
function validateDimensionEvidence(
  evidence: { score: number; explanation: string; examples?: Array<{ excerpt: string; analysis: string }> } | undefined,
  chatLog: string
): { score: number; explanation: string; examples: Array<{ excerpt: string; analysis: string; location?: string }> } | undefined {
  if (!evidence) return undefined

  const validExamples = (evidence.examples || [])
    .filter((ex) => ex.excerpt && isExcerptInChatLog(ex.excerpt, chatLog))
    .map((ex) => {
      const location = findExcerptLocation(ex.excerpt, chatLog)
      return {
        excerpt: ex.excerpt,
        analysis: ex.analysis,
        ...(location ? { location } : {}),
      }
    })

  return {
    score: evidence.score,
    explanation: evidence.explanation,
    examples: validExamples,
  }
}

async function analyzeAIChatLog(chatLog: string): Promise<AIUsageAnalysis> {
  const systemPrompt = `You are an AI evaluation agent used in a hiring assessment platform.

Your task is to analyze exported AI chat logs from IDE tools such as Cursor, Windsurf, Copilot Chat, or similar.
These logs represent how a candidate used AI while completing a take-home technical assessment.

Your goal is NOT to judge code correctness directly.
Your goal is to evaluate how effectively, intentionally, and professionally the candidate uses AI as an engineering tool.

Assume:
- Logs may be incomplete, messy, or out of order
- The candidate may have copied, edited, or partially followed AI suggestions
- Some AI responses may be wrong; that is part of the signal

You must infer behavior from patterns, not single messages.`

  const userPrompt = `Analyze this AI chat log:

${chatLog.substring(0, 30000)}${chatLog.length > 30000 ? "\n\n[... truncated for brevity ...]" : ""}

────────────────────────────────────
EVALUATION OBJECTIVES
────────────────────────────────────

Evaluate the candidate across the following dimensions:

1. Problem Framing & Planning
- Does the candidate articulate goals before asking for code?
- Do they decompose the problem into steps?
- Do they use planning features (e.g., "plan mode", "planning mode", step-by-step breakdowns)?
- Do they ask clarifying or constraint-aware questions?
- Do they use AI for design discussion before implementation?
- Do they follow through on plans rather than abandoning them?

2. Prompt Quality & Iteration
- Are prompts specific, contextual, and scoped?
- Does the candidate refine prompts based on outcomes?
- Do they provide feedback or corrections to the AI?
- Do they avoid blind copy-paste behavior?

3. Debugging & Diagnosis Skill
- Do they diagnose issues systematically or just try random fixes?
- Do they notice and correct AI mistakes?

4. Tool Awareness & Control
- Does the candidate demonstrate awareness of AI limitations?
- Do they override, modify, or reject AI suggestions when needed?
- Do they guide the AI toward project-specific constraints?
- Do they use AI as a collaborator rather than an oracle?
- Do they leverage advanced IDE features (planning mode, composer, multi-file edits)?
- Do they structure conversations to maximize AI effectiveness?

5. Engineering Judgment
- Are tradeoffs discussed (performance, readability, scope)?
- Are solutions iterated incrementally?
- Does the candidate balance speed with correctness?
- Do they show ownership of decisions?

6. Anti-Patterns Detection
Explicitly flag:
- Vibecoding (one-shot prompts, no iteration)
- Blind acceptance of incorrect AI output
- Prompt spam without synthesis
- Over-reliance on AI for trivial steps
- Lack of verification or testing

────────────────────────────────────

Score each dimension from 1–5:

1 = Very weak / passive AI usage
3 = Functional but shallow usage
5 = Strong, intentional, professional usage

Then compute:
- Overall AI Tooling Competency Score (1–5)
- Confidence level (High / Medium / Low based on log completeness)

────────────────────────────────────
OUTPUT FORMAT (STRICT)
────────────────────────────────────

Return your evaluation in the following structured JSON format:

{
  "overall_score": number (1-5),
  "confidence": "High" | "Medium" | "Low",
  "dimension_scores": {
    "planning": number (1-5),
    "prompt_iteration": number (1-5),
    "debugging": number (1-5),
    "tool_control": number (1-5),
    "engineering_judgment": number (1-5)
  },
  "dimension_evidence": {
    "planning": {
      "score": number (1-5),
      "explanation": "2-3 sentence explanation of what this demonstrates about their planning approach",
      "examples": [{"excerpt": "...", "analysis": "..."}]
    },
    "prompt_iteration": {
      "score": number (1-5),
      "explanation": "2-3 sentence explanation",
      "examples": [{"excerpt": "...", "analysis": "..."}]
    },
    "debugging": {
      "score": number (1-5),
      "explanation": "2-3 sentence explanation",
      "examples": [{"excerpt": "...", "analysis": "..."}]
    },
    "tool_control": {
      "score": number (1-5),
      "explanation": "2-3 sentence explanation",
      "examples": [{"excerpt": "...", "analysis": "..."}]
    },
    "engineering_judgment": {
      "score": number (1-5),
      "explanation": "2-3 sentence explanation",
      "examples": [{"excerpt": "...", "analysis": "..."}]
    }
  },
  "strengths": [
    "concise bullet points"
  ],
  "weaknesses": [
    "concise bullet points"
  ],
  "detected_patterns": [
    "e.g. deliberate iteration",
    "e.g. AI-guided debugging",
    "e.g. vibecoding"
  ],
  "example_evidence": [
    {
      "behavior": "what the candidate did",
      "why_it_matters": "what it signals about AI usage"
    }
  ],
  "hire_signal": "Strong Yes" | "Yes" | "Borderline" | "No",
  "summary": "3–5 sentence executive summary written for a hiring manager"
}

CITATION RULES (STRICTLY ENFORCED — violations will be automatically detected and removed):
- The "excerpt" field MUST be an exact, verbatim copy-paste from the chat log provided above.
- Do NOT paraphrase, summarize, reword, or fabricate any excerpt.
- Do NOT invent quotes that sound plausible. Every excerpt is verified against the original text.
- If you cannot find a real verbatim quote for a dimension, set its "examples" to an empty array [].
- Prefer copying the candidate's actual prompts/messages rather than AI responses.

Do NOT:
- Comment on writing style or grammar
- Judge personality or intent
- Assume missing logs imply incompetence
- Mention model names or AI internals
- Include ANY text before or after the JSON
- Use markdown code blocks

CRITICAL: Your response must be ONLY the JSON object. Do not include any explanatory text, preamble, or markdown formatting. Start your response with { and end with }. Be fair, evidence-driven, and consistent.`

  try {
    console.log("Calling OpenRouter with model:", DEFAULT_MODEL)
    console.log("API Key exists:", !!process.env.OPENROUTER_API_KEY)

    const openai = getOpenAIClient()
    const response = await openai.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
      temperature: 0.3,
    })

    console.log("OpenRouter response received")

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error("No response from AI")
    }

    console.log("Response content length:", content.length)

    // Extract JSON from the response (handle various formats)
    let jsonContent = content.trim()

    // Try to extract from markdown code blocks first
    const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (codeBlockMatch) {
      jsonContent = codeBlockMatch[1].trim()
    } else {
      // Try to find JSON object directly (starts with { ends with })
      const jsonObjectMatch = content.match(/\{[\s\S]*\}/)
      if (jsonObjectMatch) {
        jsonContent = jsonObjectMatch[0]
      }
    }

    // Attempt to parse the JSON
    let parsed
    try {
      parsed = JSON.parse(jsonContent)
    } catch (parseError) {
      console.error("JSON parse error:", parseError)
      console.error("Content that failed to parse:", jsonContent.substring(0, 500))
      throw new Error(`Invalid JSON response from AI: ${jsonContent.substring(0, 100)}...`)
    }

    return {
      overallScore: parsed.overall_score || 3,
      confidence: parsed.confidence || "Medium",
      dimensionScores: {
        planning: parsed.dimension_scores?.planning || 3,
        promptIteration: parsed.dimension_scores?.prompt_iteration || 3,
        debugging: parsed.dimension_scores?.debugging || 3,
        toolControl: parsed.dimension_scores?.tool_control || 3,
        engineeringJudgment: parsed.dimension_scores?.engineering_judgment || 3,
      },
      dimensionEvidence: {
        planning: validateDimensionEvidence(parsed.dimension_evidence?.planning, chatLog),
        promptIteration: validateDimensionEvidence(parsed.dimension_evidence?.prompt_iteration, chatLog),
        debugging: validateDimensionEvidence(parsed.dimension_evidence?.debugging, chatLog),
        toolControl: validateDimensionEvidence(parsed.dimension_evidence?.tool_control, chatLog),
        engineeringJudgment: validateDimensionEvidence(parsed.dimension_evidence?.engineering_judgment, chatLog),
      },
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
      weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : [],
      detectedPatterns: Array.isArray(parsed.detected_patterns)
        ? parsed.detected_patterns
        : [],
      exampleEvidence: Array.isArray(parsed.example_evidence)
        ? parsed.example_evidence
        : [],
      hireSignal: parsed.hire_signal || "Borderline",
      summary: parsed.summary || "AI usage analysis completed",
    }
  } catch (error) {
    console.error("Error analyzing AI chat log:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    console.error("Error details:", errorMessage)
    throw error
  }
}
