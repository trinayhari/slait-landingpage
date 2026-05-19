"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import AttributeWheelBackground from "@/components/AttributeWheelBackground"
import { useAuth } from "@/components/AuthProvider"
import { ArrowRight, Sparkles, Target, Trophy } from "lucide-react"

const DASHBOARD_PATH = "/dashboard"

const SAMPLE_SCORES: { name: string; score: number }[] = [
  { name: "Planning", score: 82 },
  { name: "Debugging", score: 74 },
  { name: "Constraints", score: 68 },
  { name: "Iteration", score: 91 },
  { name: "Correction", score: 63 },
  { name: "Tool Usage", score: 88 },
  { name: "Repetition", score: 71 },
  { name: "Understanding", score: 79 },
]

const MODULES: { name: string; desc: string }[] = [
  { name: "Planning", desc: "Scoping work into clear, AI-shaped tasks before you prompt" },
  { name: "Debugging", desc: "Finding the real root cause instead of looping on symptoms" },
  { name: "Constraints", desc: "Stating requirements, edge cases, and limits up front" },
  { name: "Iteration", desc: "Refining prompts based on what the model actually returned" },
  { name: "Correction", desc: "Catching and recovering when the AI goes off the rails" },
  { name: "Tool Usage", desc: "Using Claude Code, Cursor, Warp, Windsurf to their full power" },
  { name: "Repetition", desc: "Avoiding the same prompt patterns that already failed" },
  { name: "Understanding", desc: "Reading AI output critically and knowing what to do next" },
]

const TOOLS = ["Claude Code", "Cursor", "Warp", "Windsurf", "Codex", "Copilot"]

export default function Landing() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [teamEmail, setTeamEmail] = useState("")
  const [teamEmailStatus, setTeamEmailStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [teamEmailMessage, setTeamEmailMessage] = useState("")
  const [feedbackName, setFeedbackName] = useState("")
  const [feedbackEmail, setFeedbackEmail] = useState("")
  const [feedbackMessage, setFeedbackMessage] = useState("")
  const [feedbackStatus, setFeedbackStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [feedbackStatusMessage, setFeedbackStatusMessage] = useState("")

  const handleGoToDashboard = () => {
    if (user) {
      router.push(DASHBOARD_PATH)
    } else {
      router.push(`/login?redirect=${encodeURIComponent(DASHBOARD_PATH)}`)
    }
  }

  const handleTeamEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const email = teamEmail.trim()
    if (!email) return
    setTeamEmailStatus("loading")
    setTeamEmailMessage("")
    try {
      const res = await fetch("/api/team-interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const data = (await res.json()) as { message?: string; error?: string }
      if (!res.ok) {
        setTeamEmailStatus("error")
        setTeamEmailMessage(data.error ?? "Something went wrong")
        return
      }
      setTeamEmailStatus("success")
      setTeamEmailMessage(data.message ?? "Thanks! We'll be in touch.")
      setTeamEmail("")
    } catch {
      setTeamEmailStatus("error")
      setTeamEmailMessage("Something went wrong")
    }
  }

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const name = feedbackName.trim()
    const email = feedbackEmail.trim()
    const message = feedbackMessage.trim()
    if (!name || !email || !message) return

    setFeedbackStatus("loading")
    setFeedbackStatusMessage("")

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message }),
      })
      const data = (await res.json()) as { message?: string; error?: string }
      if (!res.ok) {
        setFeedbackStatus("error")
        setFeedbackStatusMessage(data.error ?? "Something went wrong")
        return
      }
      setFeedbackStatus("success")
      setFeedbackStatusMessage(data.message ?? "Thanks for the feedback!")
      setFeedbackName("")
      setFeedbackEmail("")
      setFeedbackMessage("")
    } catch {
      setFeedbackStatus("error")
      setFeedbackStatusMessage("Something went wrong")
    }
  }

  return (
    <main className="min-h-screen relative page-bg">
      <AttributeWheelBackground />
      <div className="relative z-10">
        <Header />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 mt-6 sm:mt-10 py-14 sm:py-20 space-y-24 sm:space-y-28">

          {/* ===================== Hero ===================== */}
          <section className="grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] gap-10 lg:gap-12 items-center">
            <div className="space-y-6 text-center lg:text-left">
              <p className="section-eyebrow section-eyebrow-dot mx-auto lg:mx-0">
                For developers going AI-native
              </p>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold text-foreground tracking-tight leading-[1.05]">
                Become <span className="gradient-text">AI-native</span>.
                <br className="hidden sm:block" /> With proof.
              </h1>
              <p className="text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0">
                You ship with Claude Code, Cursor, Warp, and Windsurf every day — but you have
                no idea if you&apos;re actually getting better. Slait reads your real sessions,
                scores how you work with AI across 8 dimensions, and shows you exactly what to
                fix next.
              </p>
              <div className="flex items-center gap-3 flex-wrap justify-center lg:justify-start">
                <button
                  type="button"
                  onClick={handleGoToDashboard}
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_10px_30px_-10px_var(--primary)]"
                >
                  Upload your first session
                  <ArrowRight className="h-4 w-4" />
                </button>
                <Link
                  href="/slate"
                  className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-medium text-foreground hover:bg-white/5 transition-colors"
                >
                  See The Slate
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="pt-2">
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground/80 mb-3">
                  Works with
                </p>
                <div className="flex flex-wrap gap-2 justify-center lg:justify-start">
                  {TOOLS.map((t) => (
                    <span key={t} className="tool-chip">
                      <span className="tool-chip-dot" />
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Mock scorecard preview */}
            <div className="preview-card mx-auto w-full max-w-md lg:max-w-none">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-primary shadow-[0_0_10px_var(--primary)]" />
                  <span className="text-xs text-muted-foreground font-mono">
                    session_2026-05-19_claude-code.md
                  </span>
                </div>
                <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/80">
                  Sample
                </span>
              </div>

              <div className="flex items-end justify-between mb-6">
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground/80">
                    Overall
                  </p>
                  <p className="text-4xl font-semibold text-foreground tracking-tight font-mono">
                    77<span className="text-muted-foreground text-2xl">/100</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground/80">
                    Percentile
                  </p>
                  <p className="text-2xl font-semibold text-foreground font-mono">Top 14%</p>
                </div>
              </div>

              <div className="space-y-2.5">
                {SAMPLE_SCORES.map((s) => (
                  <div key={s.name} className="grid grid-cols-[110px_1fr_36px] items-center gap-3">
                    <span className="text-xs text-muted-foreground">{s.name}</span>
                    <span className="score-bar">
                      <span
                        className="score-bar-fill"
                        style={{ width: `${s.score}%` }}
                      />
                    </span>
                    <span className="text-xs font-mono text-foreground text-right">{s.score}</span>
                  </div>
                ))}
              </div>

              <div className="mt-5 pt-5 border-t border-border/40 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  <span className="text-foreground font-medium">Next:</span> tighten constraints
                  before prompting
                </span>
                <span className="text-primary">+12 pts est.</span>
              </div>
            </div>
          </section>

          {/* ===================== Stat strip ===================== */}
          <section className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 landing-panel">
            <div className="stat-block">
              <p className="stat-value">8</p>
              <p className="stat-label">Scoring modules</p>
            </div>
            <div className="stat-block">
              <p className="stat-value">~60s</p>
              <p className="stat-label">From upload to scorecard</p>
            </div>
            <div className="stat-block">
              <p className="stat-value">6</p>
              <p className="stat-label">Supported tools</p>
            </div>
            <div className="stat-block">
              <p className="stat-value">$0</p>
              <p className="stat-label">To get your first score</p>
            </div>
          </section>

          {/* ===================== Loss Aversion ===================== */}
          <section className="space-y-4 text-center max-w-2xl mx-auto">
            <p className="section-eyebrow section-eyebrow-dot mx-auto">The gap is widening</p>
            <h2 className="text-3xl sm:text-4xl font-semibold text-foreground tracking-tight leading-tight">
              The devs pulling ahead aren&apos;t smarter.
              <br className="hidden sm:block" /> They have a feedback loop.
            </h2>
            <p className="text-muted-foreground text-lg">
              Every prompt, retry, and dead-end is a signal — but it disappears the moment your
              session ends. Without a way to see your patterns, you keep repeating the same
              mistakes: vague specs, missed constraints, debugging by guess. A year goes by and
              you&apos;re still &quot;pretty good at Cursor.&quot; Meanwhile, AI-native engineers
              are shipping in hours what used to take weeks.
            </p>
          </section>

          <div className="section-divider" />

          {/* ===================== How It Works ===================== */}
          <section className="space-y-10">
            <div className="text-center space-y-3">
              <p className="section-eyebrow section-eyebrow-dot mx-auto">How It Works</p>
              <h2 className="text-3xl sm:text-4xl font-semibold text-foreground tracking-tight">
                From session log to scorecard in 60 seconds
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Three steps. No setup, no plugins, no waiting on a sales call.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="feature-card">
                <div className="flex items-center gap-3 mb-3">
                  <span className="step-number">01</span>
                  <h3 className="font-semibold text-foreground">Upload your session</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Export a transcript from Claude Code, Cursor, Warp, Windsurf, Codex, or
                  Copilot. Drop the .md, .txt, .json, or .jsonl file — that&apos;s it.
                </p>
                <button
                  type="button"
                  onClick={handleGoToDashboard}
                  disabled={loading}
                  className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Upload a Session
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
              <div className="feature-card">
                <div className="flex items-center gap-3 mb-3">
                  <span className="step-number">02</span>
                  <h3 className="font-semibold text-foreground">Get evidence-based scores</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Slait reads every turn and scores 8 modules — Planning, Debugging, Tool Usage,
                  and more — citing the exact lines from your transcript as evidence. No vibes,
                  no guesswork.
                </p>
              </div>
              <div className="feature-card">
                <div className="flex items-center gap-3 mb-3">
                  <span className="step-number">03</span>
                  <h3 className="font-semibold text-foreground">Level up and compete</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Track your scores over time and climb The Slate — a public leaderboard of devs
                  proving they&apos;re AI-native. See exactly where you stand.
                </p>
                <Link
                  href="/slate"
                  className="mt-5 inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-white/5 transition-colors"
                >
                  Go to The Slate
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </section>

          <div className="section-divider" />

          {/* ===================== Benefits ===================== */}
          <section className="space-y-10">
            <div className="text-center space-y-3">
              <p className="section-eyebrow section-eyebrow-dot mx-auto">Why Slait</p>
              <h2 className="text-3xl sm:text-4xl font-semibold text-foreground tracking-tight">
                Three things you can&apos;t get anywhere else
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="feature-card">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/12 border border-primary/30 text-primary mb-4">
                  <Sparkles className="h-4 w-4" />
                </span>
                <h3 className="font-semibold text-foreground mb-2">See your blind spots</h3>
                <p className="text-sm text-muted-foreground">
                  Find the habits costing you hours — vague prompts, missing constraints, the
                  debug loops you can&apos;t feel from the inside. Every score is backed by the
                  exact line in your transcript that triggered it.
                </p>
              </div>
              <div className="feature-card">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/12 border border-primary/30 text-primary mb-4">
                  <Target className="h-4 w-4" />
                </span>
                <h3 className="font-semibold text-foreground mb-2">Level up on purpose</h3>
                <p className="text-sm text-muted-foreground">
                  Stop hoping you&apos;re getting better. Pick a module, ship a few sessions, and
                  watch your scores move. The feedback loop senior AI-native engineers build for
                  themselves — now built in.
                </p>
              </div>
              <div className="feature-card">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/12 border border-primary/30 text-primary mb-4">
                  <Trophy className="h-4 w-4" />
                </span>
                <h3 className="font-semibold text-foreground mb-2">Prove you&apos;re AI-native</h3>
                <p className="text-sm text-muted-foreground">
                  Anyone can claim AI fluency. Your Slate profile shows real, scored sessions
                  across the tools that matter. Share it with teams, recruiters, or your group
                  chat.
                </p>
              </div>
            </div>
          </section>

          <div className="section-divider" />

          {/* ===================== Scoring Model ===================== */}
          <section className="space-y-8">
            <div className="text-center space-y-3">
              <p className="section-eyebrow section-eyebrow-dot mx-auto">Scoring Model</p>
              <h2 className="text-3xl sm:text-4xl font-semibold text-foreground tracking-tight">
                8 dimensions of AI-native engineering
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Every session is scored across the skills that separate good AI users from
                great ones. Each module returns a score, evidence, and a concrete next step.
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {MODULES.map((m) => (
                <div key={m.name} className="landing-subcard">
                  <h3 className="text-sm font-medium text-foreground">{m.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{m.desc}</p>
                </div>
              ))}
            </div>
          </section>

          <div className="section-divider" />

          {/* ===================== FAQ ===================== */}
          <section className="space-y-8">
            <div className="text-center space-y-3">
              <p className="section-eyebrow section-eyebrow-dot mx-auto">FAQ</p>
              <h2 className="text-3xl sm:text-4xl font-semibold text-foreground tracking-tight">
                The short answers
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="landing-subcard">
                <h3 className="text-sm font-medium text-foreground">
                  Which tools work with Slait?
                </h3>
                <p className="text-xs text-muted-foreground mt-1.5">
                  Claude Code, Cursor, Warp, Windsurf, Codex, and Copilot. If you can export a
                  session transcript as .md, .txt, .json, or .jsonl, Slait can score it.
                </p>
              </div>
              <div className="landing-subcard">
                <h3 className="text-sm font-medium text-foreground">
                  What does &quot;AI-native&quot; mean?
                </h3>
                <p className="text-xs text-muted-foreground mt-1.5">
                  Engineers who treat the model as a real collaborator — scoping, prompting, and
                  course-correcting with intent. It&apos;s a skill, not a tool. Slait measures
                  it.
                </p>
              </div>
              <div className="landing-subcard">
                <h3 className="text-sm font-medium text-foreground">Is my code private?</h3>
                <p className="text-xs text-muted-foreground mt-1.5">
                  Only sessions you upload are analyzed, and your scorecard is yours. Public
                  ranking on The Slate is opt-in.
                </p>
              </div>
              <div className="landing-subcard">
                <h3 className="text-sm font-medium text-foreground">Do I need to pay?</h3>
                <p className="text-xs text-muted-foreground mt-1.5">
                  No. Sign up, upload a session, and get your first scorecard for free.
                </p>
              </div>
            </div>
          </section>

          {/* ===================== Final CTA ===================== */}
          <section className="cta-panel text-center">
            <p className="section-eyebrow section-eyebrow-dot mx-auto mb-4">Ready when you are</p>
            <h2 className="text-3xl sm:text-4xl font-semibold text-foreground tracking-tight max-w-2xl mx-auto leading-tight">
              Find out what kind of AI engineer you actually are.
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto mt-4 text-lg">
              One session. Eight scores. A clear next step. Upload your transcript and get your
              first scorecard in under a minute.
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap mt-7">
              <button
                type="button"
                onClick={handleGoToDashboard}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_12px_36px_-12px_var(--primary)]"
              >
                Upload your first session
                <ArrowRight className="h-4 w-4" />
              </button>
              <Link
                href="/slate"
                className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-medium text-foreground hover:bg-white/5 transition-colors"
              >
                See The Slate first
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </section>

          {/* ===================== For Teams ===================== */}
          <section className="landing-panel text-center">
            <p className="section-eyebrow section-eyebrow-dot mx-auto mb-3">For Teams</p>
            <h2 className="text-2xl font-semibold text-foreground mb-2">
              Hiring or upskilling for AI fluency?
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto mb-5">
              Slait gives engineering teams an objective way to see how their developers — and
              candidates — actually use AI to ship. Leave your email and we&apos;ll show you how
              it works.
            </p>
            <form
              onSubmit={handleTeamEmailSubmit}
              className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto"
            >
              <input
                type="email"
                value={teamEmail}
                onChange={(e) => {
                  setTeamEmail(e.target.value)
                  setTeamEmailStatus("idle")
                }}
                placeholder="you@company.com"
                required
                disabled={teamEmailStatus === "loading"}
                className="flex-1 rounded-full border border-border bg-white/[0.04] px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <button
                type="submit"
                disabled={teamEmailStatus === "loading"}
                className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {teamEmailStatus === "loading" ? "Submitting…" : "Submit"}
              </button>
            </form>
            {teamEmailMessage && (
              <p
                className={`mt-3 text-sm ${
                  teamEmailStatus === "error" ? "text-red-400" : "text-green-400"
                }`}
              >
                {teamEmailMessage}
              </p>
            )}
          </section>

          {/* ===================== Feedback ===================== */}
          <section className="landing-panel">
            <p className="section-eyebrow section-eyebrow-dot mx-auto mb-3">Feedback</p>
            <h2 className="text-2xl font-semibold text-foreground mb-2 text-center">
              Send us feedback
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto mb-5 text-center">
              Tell us who you are, how to reach you, and what you think. We read every message.
            </p>

            <form onSubmit={handleFeedbackSubmit} className="max-w-lg mx-auto space-y-3">
              <input
                type="text"
                value={feedbackName}
                onChange={(e) => {
                  setFeedbackName(e.target.value)
                  setFeedbackStatus("idle")
                }}
                placeholder="Who are you?"
                required
                disabled={feedbackStatus === "loading"}
                className="w-full rounded-full border border-border bg-white/[0.04] px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <input
                type="email"
                value={feedbackEmail}
                onChange={(e) => {
                  setFeedbackEmail(e.target.value)
                  setFeedbackStatus("idle")
                }}
                placeholder="you@company.com"
                required
                disabled={feedbackStatus === "loading"}
                className="w-full rounded-full border border-border bg-white/[0.04] px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <textarea
                value={feedbackMessage}
                onChange={(e) => {
                  setFeedbackMessage(e.target.value)
                  setFeedbackStatus("idle")
                }}
                placeholder="Your message"
                required
                rows={4}
                disabled={feedbackStatus === "loading"}
                className="w-full rounded-2xl border border-border bg-white/[0.04] px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <button
                type="submit"
                disabled={feedbackStatus === "loading"}
                className="w-full rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {feedbackStatus === "loading" ? "Submitting..." : "Submit feedback"}
              </button>
            </form>

            {feedbackStatusMessage && (
              <p
                className={`mt-3 text-sm text-center ${
                  feedbackStatus === "error" ? "text-red-400" : "text-green-400"
                }`}
              >
                {feedbackStatusMessage}
              </p>
            )}
          </section>

          <Footer />
        </div>
      </div>
    </main>
  )
}
