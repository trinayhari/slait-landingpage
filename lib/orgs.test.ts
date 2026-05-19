import { describe, expect, it } from "vitest"
import { buildInviteToken, normalizeOrgSlug } from "./org-utils"

describe("normalizeOrgSlug", () => {
  it("normalizes to lowercase url-safe slug", () => {
    expect(normalizeOrgSlug("  Acme Engineering!  ")).toBe("acme-engineering")
  })

  it("collapses separators and trims hyphens", () => {
    expect(normalizeOrgSlug("---Team__A---")).toBe("team-a")
  })

  it("enforces max length", () => {
    const value = "this-is-a-very-long-organization-slug-that-keeps-going"
    expect(normalizeOrgSlug(value).length).toBeLessThanOrEqual(40)
  })
})

describe("buildInviteToken", () => {
  it("generates opaque tokens", () => {
    const a = buildInviteToken()
    const b = buildInviteToken()
    expect(a).not.toBe(b)
    expect(a.length).toBeGreaterThan(20)
  })
})
