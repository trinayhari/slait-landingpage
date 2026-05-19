import { Metadata } from "next"
import Header from "@/components/Header"
import { getSessionMeta } from "@/lib/session"
import SessionClient from "./SessionClient"
import SessionDataLoader from "./SessionDataLoader"

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  // Lightweight query — only the fields we need for OG tags, no analysis blobs
  const session = await getSessionMeta(id)
  if (!session) return { title: "Session not found" }
  const title = `Session · ${Number(session.overall_score).toFixed(1)}/5 · Slait`
  const description =
    (session.summary as string | null)?.slice(0, 160) ||
    `AI coding session analysis. Score: ${session.overall_score}/5.`
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://slait.dev"
  const url = `${siteUrl}/session/${id}`
  return {
    title,
    description,
    openGraph: { title, description, url, siteName: "Slait" },
    twitter: { card: "summary_large_image", title, description },
  }
}

// The page renders a shell immediately; all heavy session data is fetched
// client-side by SessionDataLoader so SSR is never blocked by potentially
// multi-MB annotated_turns / dimension_evidence blobs.
export default async function SessionPage({ params }: Props) {
  const { id } = await params
  const sessionMeta = await getSessionMeta(id)

  return (
    <main className="min-h-screen">
      <Header />
      <div className="relative z-10 w-full px-4 md:px-6 py-8">
        <SessionClient sessionId={id} overallScore={sessionMeta?.overall_score ?? null} />
        <SessionDataLoader sessionId={id} />
      </div>
    </main>
  )
}
