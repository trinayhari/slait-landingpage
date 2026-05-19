import Header from "@/components/Header"
import ProjectDataLoader from "./ProjectDataLoader"

type Props = { params: Promise<{ id: string }> }

export default async function ProjectPage({ params }: Props) {
  const { id } = await params

  return (
    <main className="min-h-screen">
      <Header />
      <div className="relative z-10 w-full px-4 md:px-6 py-8">
        <ProjectDataLoader projectId={id} />
      </div>
    </main>
  )
}
