import { notFound } from "next/navigation"
import Header from "@/components/Header"
import { getOrgProfileBySlug } from "@/lib/org-profile"
import type { LeaderboardEntry } from "@/lib/types"
import OrgLeaderboardClient from "../OrgLeaderboardClient"

type Props = { params: Promise<{ slug: string }> }

export default async function OrgSlatePage({ params }: Props) {
  const { slug } = await params
  const data = await getOrgProfileBySlug(slug)
  if (!data) notFound()

  const isAdmin = data.role === "admin"
  const entries = (data.leaderboard ?? []) as LeaderboardEntry[]

  return (
    <main className="min-h-screen">
      <Header />
      {isAdmin ? (
        <OrgLeaderboardClient orgSlug={data.organization.slug} orgName={data.organization.name} entries={entries} />
      ) : (
        <div className="max-w-3xl mx-auto px-4 py-16 text-center">
          <p className="text-muted-foreground">Only organization admins can view the org leaderboard.</p>
        </div>
      )}
    </main>
  )
}
