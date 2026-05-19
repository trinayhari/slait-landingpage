import { randomUUID } from "crypto"

export function normalizeOrgSlug(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40)
}

export function buildInviteToken() {
  return randomUUID().replace(/-/g, "")
}
