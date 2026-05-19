import { describe, expect, it } from "vitest"
import { analysisToSessionRow } from "./sessionRow"
import type { AIUsageAnalysis } from "./types"

describe("analysisToSessionRow", () => {
  it("maps project metadata onto session row", () => {
    const analysis: AIUsageAnalysis = {
      overallScore: 3.5,
      confidence: "Medium",
      dimensionScores: {
        planning: 3,
        promptIteration: 3,
        debugging: 4,
        toolControl: 4,
        engineeringJudgment: 3,
      },
      strengths: ["Strong debugging"],
      weaknesses: ["Weak planning"],
      detectedPatterns: ["Root-cause investigation approach"],
      exampleEvidence: [],
      hireSignal: "Yes",
      summary: "summary",
    }

    const row = analysisToSessionRow(
      analysis,
      "claude",
      "session-1.md",
      "raw transcript",
      { "CLAUDE.md": "context" },
      "project-id",
      "Session 1"
    )

    expect(row.source).toBe("claude")
    expect(row.project_id).toBe("project-id")
    expect(row.session_label).toBe("Session 1")
    expect(row.file_name).toBe("session-1.md")
    expect(row.supplementary_files).toEqual({ "CLAUDE.md": "context" })
  })
})
