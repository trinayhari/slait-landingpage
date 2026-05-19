import { describe, expect, it } from "vitest"
import type { AIUsageAnalysis } from "./types"
import { synthesizeProjectAnalysis } from "./pipelineAnalysis"

describe("synthesizeProjectAnalysis", () => {
  it("aggregates per-session analyses into project-level result", () => {
    const sessionA: AIUsageAnalysis = {
      overallScore: 4.2,
      confidence: "High",
      dimensionScores: {
        planning: 4,
        promptIteration: 4,
        debugging: 4,
        toolControl: 4,
        engineeringJudgment: 4,
      },
      strengths: ["Strong planning"],
      weaknesses: ["Weak repetition"],
      detectedPatterns: ["Plan-then-implement workflow"],
      exampleEvidence: [],
      hireSignal: "Yes",
      summary: "A",
    }
    const sessionB: AIUsageAnalysis = {
      overallScore: 3.2,
      confidence: "Medium",
      dimensionScores: {
        planning: 3,
        promptIteration: 3,
        debugging: 3,
        toolControl: 3,
        engineeringJudgment: 3,
      },
      strengths: ["Strong planning"],
      weaknesses: ["Weak tool usage"],
      detectedPatterns: ["Plan-then-implement workflow"],
      exampleEvidence: [],
      hireSignal: "Borderline",
      summary: "B",
    }

    const result = synthesizeProjectAnalysis([sessionA, sessionB], "MyProject")
    expect(result.overallScore).toBeCloseTo(3.7, 2)
    expect(result.hireSignal).toBe("Yes")
    expect(result.strengths[0]).toBe("Strong planning")
    expect(result.detectedPatterns[0]).toBe("Plan-then-implement workflow")
    expect(result.summary).toContain("MyProject")
  })
})
