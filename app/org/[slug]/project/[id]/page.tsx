import Header from "@/components/Header"
import ProjectDataLoader from "@/app/project/[id]/ProjectDataLoader"

type Props = { params: Promise<{ slug: string; id: string }> }

export default async function OrgProjectPage({ params }: Props) {
  const { slug, id } = await params

  return (
    <main className="min-h-screen">
      <Header />
      <div className="relative z-10 w-full px-4 md:px-6 py-8">
        <ProjectDataLoader
          projectId={id}
          apiBasePath={`/api/orgs/${slug}`}
          orgSlug={slug}
        />
      </div>
    </main>
  )
}
