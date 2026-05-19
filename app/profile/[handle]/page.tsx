import { Metadata } from "next"
import { notFound } from "next/navigation"
import Header from "@/components/Header"
import { getPublicProfileByHandle } from "@/lib/profile"
import { getOrgMemberProfileBySlugAndHandle } from "@/lib/org-profile"
import ProfileClient from "./ProfileClient"
import ProfileProjectsClient from "./ProfileProjectsClient"

type Props = {
  params: Promise<{ handle: string }>
  searchParams: Promise<{ org?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params
  const data = await getPublicProfileByHandle(handle)
  if (!data) return { title: "Profile not found" }
  const { profile, leaderboard } = data
  const name = profile.display_name || profile.handle
  const title = `${name} · Slait`
  const description = leaderboard
    ? `AI-native engineer · ${leaderboard.percentile_display}th percentile · Best score ${Number(leaderboard.best_score).toFixed(1)}/5`
    : `AI coding session profile on Slait`
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://slait.dev"
  const url = `${siteUrl}/profile/${handle}`
  return {
    title,
    description,
    openGraph: { title, description, url, siteName: "Slait" },
    twitter: { card: "summary_large_image", title, description },
  }
}

export default async function ProfilePage({ params, searchParams }: Props) {
  const { handle } = await params
  const { org: orgSlug } = await searchParams
  const data = orgSlug
    ? await getOrgMemberProfileBySlugAndHandle(orgSlug, handle)
    : await getPublicProfileByHandle(handle)
  if (!data) notFound()

  const { profile, projects, leaderboard, isOwner } = data
  const org = "organization" in data ? data.organization : null
  const inOrgMode = Boolean(orgSlug && org)

  return (
    <main className="min-h-screen">
      <Header />
      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Profile header + stats + upload */}
        <ProfileClient
          profile={profile}
          leaderboard={leaderboard}
          isOwner={isOwner}
          workspaceMode={inOrgMode ? "org" : "personal"}
          orgSlug={org?.slug ?? null}
          orgName={org?.name ?? null}
          showCLISetup={true}
        />

        <ProfileProjectsClient
          projects={projects}
          isOwner={isOwner}
          sectionTitle={inOrgMode && org ? `${org.name} Projects` : "Projects"}
          projectHrefPrefix={inOrgMode && org ? `/org/${org.slug}/project` : "/project"}
          projectApiPrefix={inOrgMode && org ? `/api/orgs/${org.slug}/projects` : "/api/projects"}
        />
      </div>
    </main>
  )
}
