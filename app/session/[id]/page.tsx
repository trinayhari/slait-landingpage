import { Metadata } from "next"
import { notFound } from "next/navigation"
import Header from "@/components/Header"
import { getPublicSession } from "@/lib/session"
import AnalysisResults from "@/components/AnalysisResults"
import SessionClient from "./SessionClient"

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const data = await getPublicSession(id)
  if (!data) return { title: "Session not found" }
  const { session } = data
  const title = `Session · ${Number(session.overall_score).toFixed(1)}/5 · Slait`
  const description =
    session.summary?.slice(0, 160) || `AI coding session analysis. Score: ${session.overall_score}/5.`
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://slait.dev"
  const url = `${siteUrl}/session/${id}`
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: "Slait",
    },
    twitter: { card: "summary_large_image", title, description },
  }
}

export default async function SessionPage({ params }: Props) {
  const { id } = await params
  const data = await getPublicSession(id)
  if (!data) notFound()

  const { analysis } = data

  return (
    <main className="min-h-screen bg-background">
      <Header />
      <div className="relative z-10 w-full max-w-4xl mx-auto px-4 py-8">
        <SessionClient sessionId={id} />
        <AnalysisResults analysis={analysis} onReset={() => {}} />
      </div>
    </main>
  )
}
