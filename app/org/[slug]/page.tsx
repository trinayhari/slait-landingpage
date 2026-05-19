import { notFound } from "next/navigation"
import Header from "@/components/Header"
import ProfileClient from "@/app/profile/[handle]/ProfileClient"
import ProfileProjectsClient from "@/app/profile/[handle]/ProfileProjectsClient"
import { getOrgWorkspaceBySlug } from "@/lib/org-profile"

type Props = { params: Promise<{ slug: string }> }

export default async function OrgPage({ params }: Props) {
  const { slug } = await params
  const data = await getOrgWorkspaceBySlug(slug)
  if (!data) notFound()

  return (
    <main className="min-h-screen">
      <Header />
      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8 space-y-6">
        <ProfileClient
          profile={data.profile}
          leaderboard={data.leaderboard}
          isOwner={data.isOwner}
          workspaceMode="org"
          orgSlug={data.organization.slug}
          orgName={data.organization.name}
        />

        <ProfileProjectsClient
          projects={data.projects}
          isOwner={data.isOwner}
          sectionTitle={`${data.organization.name} Projects`}
          projectHrefPrefix={`/org/${data.organization.slug}/project`}
          projectApiPrefix={`/api/orgs/${data.organization.slug}/projects`}
        />
      </div>
    </main>
  )
}
