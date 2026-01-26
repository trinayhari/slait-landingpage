"use client"

import { useState } from "react"
import { ArrowRight, Brain, BarChartBig as ChartBar, Users, Zap, Check, Star, Loader2 } from "lucide-react"

export default function LandingPage() {
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [message, setMessage] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus("loading")

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name }),
      })

      const data = await res.json()

      if (res.ok) {
        setStatus("success")
        setMessage("You're on the list! Check your email for confirmation.")
        setEmail("")
        setName("")
      } else {
        setStatus("error")
        setMessage(data.error || "Something went wrong. Please try again.")
      }
    } catch {
      setStatus("error")
      setMessage("Something went wrong. Please try again.")
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1">
        {/* Header */}
        <header className="w-full py-4 px-6 border-b border-border">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-6 w-6 text-primary" />
              <span className="font-bold text-xl">Slait</span>
            </div>
            <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
              <a href="#features" className="hover:text-foreground transition-colors">Features</a>
              <a href="#how-it-works" className="hover:text-foreground transition-colors">How it Works</a>
              <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
              <a href="#waitlist" className="hover:text-foreground transition-colors">Join Waitlist</a>
            </nav>
          </div>
        </header>

        {/* Hero Section */}
        <section className="w-full py-24 md:py-32 flex justify-center px-4">
          <div className="max-w-4xl flex flex-col items-center text-center gap-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-4 py-1.5 text-sm">
              <Star className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">AI-Powered Candidate Evaluation</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              The fastest way to evaluate{" "}
              <span className="text-primary">take-home assignments</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl">
              Stop spending hours reviewing code submissions. Let AI analyze,
              rank, and surface the best candidates automatically.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <a href="#waitlist">
                <button className="px-6 py-3 bg-primary text-primary-foreground font-medium rounded-lg flex items-center gap-2 hover:opacity-90 transition-opacity animate-pulse-glow">
                  Join the Waitlist <ArrowRight className="h-4 w-4" />
                </button>
              </a>
              <a href="#how-it-works">
                <button className="px-6 py-3 border border-border rounded-lg font-medium hover:bg-muted transition-colors">
                  See How it Works
                </button>
              </a>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="border-y border-border bg-muted/30">
          <div className="w-full py-12 flex justify-center px-4">
            <div className="max-w-6xl w-full grid grid-cols-2 md:grid-cols-4 gap-8">
              {[
                { value: "90%", label: "Time saved on reviews" },
                { value: "500+", label: "Companies using" },
                { value: "50k+", label: "Candidates evaluated" },
                { value: "4.9", label: "Average rating" },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-3xl md:text-4xl font-bold text-primary">{stat.value}</div>
                  <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="w-full py-24 flex flex-col items-center px-4">
          <div className="w-full max-w-6xl flex flex-col items-center">
            <div className="flex flex-col items-center text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Everything you need to hire better
              </h2>
              <p className="text-muted-foreground max-w-2xl">
                Comprehensive tools to create assessments, evaluate submissions,
                and make data-driven hiring decisions.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8 w-full">
              {[
                {
                  icon: Brain,
                  title: "AI-Powered Analysis",
                  description: "Automatically evaluate code quality, test coverage, architecture decisions, and best practices.",
                },
                {
                  icon: ChartBar,
                  title: "Real-time Ranking",
                  description: "Adjust skill weights and instantly see how candidates stack up against each other.",
                },
                {
                  icon: Users,
                  title: "Role-Based Assessments",
                  description: "Create custom assessments for any role with tailored evaluation criteria.",
                },
                {
                  icon: Zap,
                  title: "Instant Feedback",
                  description: "Get detailed insights on each submission including strengths, weaknesses, and a TLDR summary.",
                },
                {
                  icon: Check,
                  title: "Test Case Validation",
                  description: "Auto-run test cases and track pass/fail rates for objective evaluation.",
                },
                {
                  icon: Star,
                  title: "Candidate Experience",
                  description: "Shareable assessment links with live coding environments for candidates.",
                },
              ].map((feature) => (
                <div
                  key={feature.title}
                  className="p-6 rounded-lg border border-border bg-card hover:bg-muted/50 transition-all duration-200 hover:scale-[1.02]"
                >
                  <feature.icon className="h-10 w-10 text-primary mb-4" />
                  <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it Works Section */}
        <section id="how-it-works" className="bg-muted/30 border-y border-border py-24 w-full flex flex-col items-center px-4">
          <div className="w-full max-w-4xl flex flex-col items-center">
            <div className="flex flex-col items-center text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">How it works</h2>
              <p className="text-muted-foreground max-w-2xl">
                Get started in minutes with a simple three-step workflow.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8 w-full">
              {[
                {
                  step: "01",
                  title: "Create Your Role",
                  description: "Define the skills and weights that matter most for the position you're hiring for.",
                },
                {
                  step: "02",
                  title: "Design Assessments",
                  description: "Use AI to generate test cases and evaluation metrics, or create your own from scratch.",
                },
                {
                  step: "03",
                  title: "Review Candidates",
                  description: "AI analyzes submissions and ranks candidates. Adjust weights to surface the best fits.",
                },
              ].map((item) => (
                <div key={item.step} className="relative text-center">
                  <div className="text-6xl font-bold text-primary/20 mb-4">{item.step}</div>
                  <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                  <p className="text-muted-foreground text-sm">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="w-full py-24 flex flex-col items-center px-4">
          <div className="w-full max-w-5xl flex flex-col items-center">
            <div className="flex flex-col items-center text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Simple, transparent pricing</h2>
              <p className="text-muted-foreground max-w-2xl">Start free and scale as you grow. No hidden fees.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8 w-full">
              {[
                {
                  name: "Starter",
                  price: "Free",
                  description: "Perfect for small teams just getting started.",
                  features: ["Up to 3 roles", "10 assessments/month", "Basic AI analysis", "Email support"],
                },
                {
                  name: "Pro",
                  price: "$49",
                  period: "/month",
                  description: "For growing teams with more hiring needs.",
                  features: ["Unlimited roles", "Unlimited assessments", "Advanced AI insights", "Priority support", "Custom evaluation metrics"],
                  popular: true,
                },
                {
                  name: "Enterprise",
                  price: "Custom",
                  description: "For large organizations with custom requirements.",
                  features: ["Everything in Pro", "SSO & SAML", "Dedicated account manager", "Custom integrations", "SLA guarantee"],
                },
              ].map((plan) => (
                <div
                  key={plan.name}
                  className={`p-8 rounded-lg border relative transition-all duration-200 hover:scale-[1.01] ${
                    plan.popular ? "border-primary bg-primary/5" : "border-border bg-card"
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-primary-foreground text-xs font-medium rounded-full">
                      Most Popular
                    </div>
                  )}
                  <h3 className="font-semibold text-lg">{plan.name}</h3>
                  <div className="mt-4 mb-2">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    {plan.period && <span className="text-muted-foreground">{plan.period}</span>}
                  </div>
                  <p className="text-sm text-muted-foreground mb-6">{plan.description}</p>
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <a href="#waitlist">
                    <button
                      className={`w-full py-2 rounded-lg font-medium transition-colors ${
                        plan.popular
                          ? "bg-primary text-primary-foreground hover:opacity-90"
                          : "border border-border hover:bg-muted"
                      }`}
                    >
                      Join Waitlist
                    </button>
                  </a>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Waitlist Section */}
        <section id="waitlist" className="bg-primary/10 border-t border-border w-full py-24 flex flex-col items-center px-4">
          <div className="w-full max-w-xl flex flex-col items-center text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Join the Waitlist</h2>
            <p className="text-muted-foreground mb-8">
              Be the first to know when we launch. Get early access and exclusive updates.
            </p>

            {status === "success" ? (
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-6 text-green-400">
                <Check className="h-8 w-8 mx-auto mb-2" />
                <p className="font-medium">{message}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="w-full space-y-4">
                <input
                  type="text"
                  placeholder="Your name (optional)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="w-full py-3 bg-primary text-primary-foreground font-medium rounded-lg flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {status === "loading" ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Joining...
                    </>
                  ) : (
                    <>
                      Join Waitlist <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
                {status === "error" && (
                  <p className="text-red-400 text-sm">{message}</p>
                )}
              </form>
            )}

            <p className="text-xs text-muted-foreground mt-6">
              We respect your privacy. No spam, ever.
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-12 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <span className="font-semibold">Slait</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Built for hiring teams who value their time.
          </p>
        </div>
      </footer>
    </div>
  )
}
