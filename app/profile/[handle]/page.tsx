import { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import Header from "@/components/Header"
import { getPublicProfileByHandle } from "@/lib/profile"
import PercentileBadge from "@/components/PercentileBadge"
import ProfileClient from "./ProfileClient"

type Props = { params: Promise<{ handle: string }> }

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
    openGraph: {
      title,
      description,
      url,
      siteName: "Slait",
    },
    twitter: { card: "summary_large_image", title, description },
  }
}

export default async function ProfilePage({ params }: Props) {
  const { handle } = await params
  const data = await getPublicProfileByHandle(handle)
  if (!data) notFound()

  const { profile, sessions, leaderboard } = data
  const name = profile.display_name || profile.handle
  const SOURCE_LABELS: Record<string, string> = {
    cursor: "Cursor",
    claude: "Claude",
    chatgpt: "ChatGPT",
    copilot: "Copilot",
    windsurf: "Windsurf",
    other: "Other",
  }

  return (
    <main className="min-h-screen bg-background">
      <Header />
      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt=""
                className="h-16 w-16 rounded-full border-2 border-border"
              />
            ) : (
              <div className="h-16 w-16 rounded-full border-2 border-border bg-primary/20 flex items-center justify-center text-2xl font-bold text-primary">
                {name[0]?.toUpperCase() ?? "?"}
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-foreground">{name}</h1>
              <p className="text-muted-foreground">@{profile.handle}</p>
              {leaderboard && (
                <div className="mt-2">
                  <PercentileBadge percentile={leaderboard.percentile_display} />
                </div>
              )}
            </div>
          </div>
          <ProfileClient
            handle={profile.handle}
            percentile={leaderboard?.percentile_display}
          />
        </div>

        {leaderboard && (
          <div className="rounded-lg border border-border bg-card/50 p-4 flex flex-wrap gap-6">
            <div>
              <p className="text-xs text-muted-foreground">Best score</p>
              <p className="text-2xl font-bold text-foreground">
                {Number(leaderboard.best_score).toFixed(1)} / 5
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Rank</p>
              <p className="text-2xl font-bold text-primary">#{leaderboard.rank}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Sessions</p>
              <p className="text-2xl font-bold text-foreground">
                {leaderboard.session_count}
              </p>
            </div>
          </div>
        )}

        <h2 className="text-lg font-semibold text-foreground">Public sessions</h2>
        {sessions.length === 0 ? (
          <p className="text-muted-foreground">No public sessions yet.</p>
        ) : (
          <ul className="space-y-3">
            {sessions.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/session/${s.id}`}
                  className="block rounded-lg border border-border bg-card/50 p-4 hover:bg-secondary/30 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">
                        {s.file_name || "Session"} · {SOURCE_LABELS[s.source] ?? s.source}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Score {Number(s.overall_score).toFixed(1)} / 5 · {s.hire_signal}
                      </p>
                    </div>
                    <span className="text-primary text-sm">View →</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  )
}
