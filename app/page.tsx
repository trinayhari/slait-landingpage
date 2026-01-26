"use client";

import { useState, useEffect, useRef } from "react";
import {
  ArrowRight,
  FileArchive,
  Mail,
  FolderOpen,
  MessageSquare,
  Clock,
  Users,
  Check,
  Loader2,
  Link2,
  Brain,
  XCircle,
  AlertTriangle,
  Shuffle,
} from "lucide-react";

export default function LandingPage() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [message, setMessage] = useState("");
  const [showWaitlistForm, setShowWaitlistForm] = useState(false);
  const waitlistRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Typing animation state for hero
  const words = ["broken", "outdated", "chaos"];
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [currentText, setCurrentText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const word = words[currentWordIndex];
    const typingSpeed = isDeleting ? 50 : 100;

    const timeout = setTimeout(() => {
      if (!isDeleting) {
        if (currentText.length < word.length) {
          setCurrentText(word.slice(0, currentText.length + 1));
        } else {
          setTimeout(() => setIsDeleting(true), 2000);
        }
      } else {
        if (currentText.length > 0) {
          setCurrentText(word.slice(0, currentText.length - 1));
        } else {
          setIsDeleting(false);
          setCurrentWordIndex((prev) => (prev + 1) % words.length);
        }
      }
    }, typingSpeed);

    return () => clearTimeout(timeout);
  }, [currentText, isDeleting, currentWordIndex, words]);

  const openWaitlistForm = () => {
    setShowWaitlistForm(true);
    setTimeout(() => {
      waitlistRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      nameInputRef.current?.focus();
    }, 50);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name }),
      });

      const data = await res.json();

      if (res.ok) {
        setStatus("success");
        setMessage("You're on the list. We'll be in touch.");
        setEmail("");
        setName("");
      } else {
        setStatus("error");
        setMessage(data.error || "Something went wrong. Please try again.");
      }
    } catch {
      setStatus("error");
      setMessage("Something went wrong. Please try again.");
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1">
        {/* Floating Glassmorphic Header */}
        <header className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-5xl py-3 px-6 rounded-2xl border border-white/10 bg-background/60 backdrop-blur-xl shadow-lg shadow-black/10 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-6 w-6 text-primary" />
              <span className="font-bold text-xl">Slait</span>
            </div>
            <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
              <a
                href="#problem"
                className="hover:text-foreground transition-colors hover:text-primary"
              >
                The Problem
              </a>
              <a
                href="#solution"
                className="hover:text-foreground transition-colors hover:text-primary"
              >
                Solution
              </a>
              <a
                href="#waitlist"
                className="px-4 py-1.5 bg-primary/10 border border-primary/30 rounded-full text-primary hover:bg-primary/20 transition-all"
                onClick={openWaitlistForm}
              >
                Get Early Access
              </a>
            </nav>
          </div>
        </header>

        {/* Spacer for fixed header */}
        <div className="h-20"></div>

        {/* Hero Section */}
        <section
          id="waitlist"
          className="w-full py-24 md:py-32 flex justify-center px-4"
        >
          <div className="max-w-4xl flex flex-col items-center text-center gap-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-4 py-1.5 text-sm animate-fade-in hover-glow">
              <span className="text-muted-foreground">
                For teams that let candidates use AI
              </span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight animate-fade-in-delay-1">
              Hiring is{" "}
              <span className="text-primary text-glow inline-block min-w-[4ch]">
                {currentText}
                <span className="animate-blink">|</span>
              </span>
              <br />
              <span className="text-muted-foreground">in the age of AI.</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl animate-fade-in-delay-2">
              The problem is not that candidates use AI. The problem is you have no way to evaluate how they use it. No system to manage submissions. No consistency in reviews. Just inbox triage and lost context.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-4 animate-fade-in-delay-3">
              <button
                type="button"
                onClick={openWaitlistForm}
                className="px-6 py-3 bg-primary text-primary-foreground font-medium rounded-lg flex items-center gap-2 hover:opacity-90 transition-all animate-pulse-glow hover:scale-105"
              >
                Get Early Access <ArrowRight className="h-4 w-4" />
              </button>
              <a href="#problem">
                <button className="px-6 py-3 border border-border rounded-lg font-medium hover:bg-muted transition-all hover-glow hover:scale-105">
                  See the Problem
                </button>
              </a>
            </div>
          </div>
        </section>

        {/* Chaos Animation Section */}
        <section className="w-full py-16 flex justify-center px-4 overflow-hidden">
          <div className="relative w-full max-w-4xl h-32 md:h-40">
            {/* Floating chaotic elements */}
            <div className="absolute left-[5%] top-[20%] animate-chaos-float-1">
              <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                <FileArchive className="h-4 w-4" />
                <span>submission_v3_final.zip</span>
              </div>
            </div>
            <div className="absolute left-[25%] top-[60%] animate-chaos-float-2">
              <div className="flex items-center gap-2 px-3 py-2 bg-orange-500/10 border border-orange-500/30 rounded-lg text-orange-400 text-sm">
                <Mail className="h-4 w-4" />
                <span>Re: Re: Re: Take-home</span>
              </div>
            </div>
            <div className="absolute right-[30%] top-[10%] animate-chaos-float-3">
              <div className="flex items-center gap-2 px-3 py-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-yellow-400 text-sm">
                <FolderOpen className="h-4 w-4" />
                <span>Google Drive link expired</span>
              </div>
            </div>
            <div className="absolute right-[5%] top-[50%] animate-chaos-float-4">
              <div className="flex items-center gap-2 px-3 py-2 bg-purple-500/10 border border-purple-500/30 rounded-lg text-purple-400 text-sm">
                <MessageSquare className="h-4 w-4" />
                <span>the api key is expired</span>
              </div>
            </div>
            <div className="absolute left-[45%] top-[75%] animate-chaos-float-5">
              <div className="flex items-center gap-2 px-3 py-2 bg-pink-500/10 border border-pink-500/30 rounded-lg text-pink-400 text-sm">
                <Clock className="h-4 w-4" />
                <span>2 weeks ago</span>
              </div>
            </div>
          </div>
        </section>

        {/* Problem Section */}
        <section
          id="problem"
          className="w-full py-24 flex flex-col items-center px-4 bg-muted/20 border-y border-border"
        >
          <div className="w-full max-w-5xl">
            <div className="flex flex-col items-center text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 animate-fade-in">
                Logistics are broken
              </h2>
              <p className="text-muted-foreground max-w-2xl animate-fade-in-delay-1">
                Managing take-home assignments should not feel like this.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-16">
              {[
                {
                  icon: XCircle,
                  title: "Traditional assessments are gameable",
                  description:
                    "LeetCode and timed tests reward memorization and speed. AI makes them trivial to pass. They tell you nothing about how someone actually thinks.",
                  color: "red",
                },
                {
                  icon: Clock,
                  title: "Reviews are slow and inconsistent",
                  description:
                    "Every reviewer evaluates differently. Some skim. Some over-index on style. There is no shared rubric, no calibration, no memory.",
                  color: "orange",
                },
                {
                  icon: Shuffle,
                  title: "Context gets lost everywhere",
                  description:
                    "Submissions arrive via email, zip files, Google Drive links, GitHub repos. Notes live in Slack. Feedback lives in someone's head.",
                  color: "yellow",
                },
                {
                  icon: AlertTriangle,
                  title: "No single source of truth",
                  description:
                    "There is no place where assignments, submissions, and reviews live together. Every hire starts from scratch.",
                  color: "purple",
                },
              ].map((item, index) => (
                <div
                  key={item.title}
                  className={`p-6 rounded-lg border border-${item.color}-500/20 bg-${item.color}-500/5 animate-card-${index + 1} hover:border-${item.color}-500/40 transition-all`}
                >
                  <item.icon className={`h-8 w-8 text-${item.color}-400 mb-4`} />
                  <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                  <p className="text-muted-foreground text-sm">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* What Slait Is NOT */}
        <section className="w-full py-24 flex flex-col items-center px-4">
          <div className="w-full max-w-4xl">
            <div className="flex flex-col items-center text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 animate-fade-in">
                What Slait is not
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  label: "Not an ATS",
                  description: "You already have one. We integrate, not replace.",
                },
                {
                  label: "Not another coding test",
                  description: "No LeetCode. No timed puzzles. No gotchas.",
                },
                {
                  label: "Not an AI judge",
                  description: "AI assists reviewers. It does not replace them.",
                },
              ].map((item, index) => (
                <div
                  key={item.label}
                  className={`p-6 rounded-lg border border-border bg-card text-center animate-card-${index + 1}`}
                >
                  <div className="text-2xl font-bold text-muted-foreground mb-2 line-through decoration-primary/50">
                    {item.label}
                  </div>
                  <p className="text-muted-foreground text-sm">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Solution Section */}
        <section
          id="solution"
          className="w-full py-24 flex flex-col items-center px-4 animate-gradient"
        >
          <div className="w-full max-w-4xl">
            <div className="flex flex-col items-center text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 animate-fade-in">
                One place for everything
              </h2>
              <p className="text-muted-foreground max-w-2xl animate-fade-in-delay-1">
                Slait is a system of record for take-home assignments and work trials. A second brain for your reviewers. Built for teams that embrace AI.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-6">
                {[
                  {
                    icon: Link2,
                    title: "One link per candidate",
                    description:
                      "No emails. No zip files. No chaos. Every submission lives in one place with full context preserved.",
                  },
                  {
                    icon: Users,
                    title: "Consistent reviews",
                    description:
                      "Shared rubrics. Calibrated scoring. Every reviewer sees the same context and evaluates the same way.",
                  },
                  {
                    icon: Brain,
                    title: "Evaluate reasoning, not output",
                    description:
                      "Good engineering is about tradeoffs, architecture decisions, and understanding. We help you see how candidates think.",
                  },
                ].map((item, index) => (
                  <div
                    key={item.title}
                    className={`flex gap-4 p-4 rounded-lg border border-border bg-card/50 hover:bg-card transition-all hover-glow animate-card-${index + 1}`}
                  >
                    <div className="shrink-0">
                      <item.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">{item.title}</h3>
                      <p className="text-muted-foreground text-sm">
                        {item.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Visual representation */}
              <div className="flex items-center justify-center">
                <div className="relative w-full max-w-sm aspect-square">
                  {/* Central hub */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center animate-pulse-glow">
                    <Brain className="h-10 w-10 text-primary" />
                  </div>

                  {/* Orbiting elements */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 animate-orbit-1">
                    <div className="px-3 py-1.5 bg-card border border-border rounded-lg text-xs">
                      Assignments
                    </div>
                  </div>
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 animate-orbit-2">
                    <div className="px-3 py-1.5 bg-card border border-border rounded-lg text-xs">
                      Submissions
                    </div>
                  </div>
                  <div className="absolute top-1/2 left-0 -translate-y-1/2 animate-orbit-3">
                    <div className="px-3 py-1.5 bg-card border border-border rounded-lg text-xs">
                      Reviews
                    </div>
                  </div>
                  <div className="absolute top-1/2 right-0 -translate-y-1/2 animate-orbit-4">
                    <div className="px-3 py-1.5 bg-card border border-border rounded-lg text-xs">
                      Context
                    </div>
                  </div>

                  {/* Connection lines */}
                  <svg className="absolute inset-0 w-full h-full" style={{ zIndex: -1 }}>
                    <line x1="50%" y1="15%" x2="50%" y2="40%" stroke="rgba(34, 211, 238, 0.3)" strokeWidth="1" strokeDasharray="4" />
                    <line x1="50%" y1="60%" x2="50%" y2="85%" stroke="rgba(34, 211, 238, 0.3)" strokeWidth="1" strokeDasharray="4" />
                    <line x1="15%" y1="50%" x2="40%" y2="50%" stroke="rgba(34, 211, 238, 0.3)" strokeWidth="1" strokeDasharray="4" />
                    <line x1="60%" y1="50%" x2="85%" y2="50%" stroke="rgba(34, 211, 238, 0.3)" strokeWidth="1" strokeDasharray="4" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Who This Is For */}
        <section className="w-full py-24 flex flex-col items-center px-4 bg-muted/20 border-y border-border">
          <div className="w-full max-w-4xl">
            <div className="flex flex-col items-center text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 animate-fade-in">
                Built for AI-native teams
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-6 text-center">
              {[
                {
                  title: "Founders",
                  description: "Who need to hire fast without sacrificing signal",
                },
                {
                  title: "Engineering Managers",
                  description: "Who want consistent, defensible hiring decisions",
                },
                {
                  title: "Hiring Teams",
                  description: "Who allow Cursor, Copilot, Claude and care about real ability",
                },
              ].map((item, index) => (
                <div
                  key={item.title}
                  className={`p-6 rounded-lg border border-primary/20 bg-primary/5 animate-card-${index + 1}`}
                >
                  <h3 className="font-semibold text-lg mb-2 text-primary">
                    {item.title}
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Vision Section */}
        <section className="w-full py-24 flex flex-col items-center px-4">
          <div className="w-full max-w-3xl text-center">
            <blockquote className="text-2xl md:text-3xl font-medium text-foreground leading-relaxed animate-fade-in">
              &ldquo;The future of technical hiring is not about catching people using AI. It is about understanding how they leverage it to solve real problems.&rdquo;
            </blockquote>
            <p className="mt-6 text-muted-foreground animate-fade-in-delay-1">
              We are building the infrastructure for that future.
            </p>
          </div>
        </section>

        {/* CTA Section */}
        <section className="w-full py-24 flex flex-col items-center px-4 animate-gradient">
          <div className="w-full max-w-xl flex flex-col items-center text-center gap-6">
            {showWaitlistForm ? (
              <div
                ref={waitlistRef}
                className="w-full flex flex-col items-center text-center gap-6 animate-fade-in"
              >
                <h2 className="text-2xl md:text-3xl font-bold">
                  Get early access
                </h2>
                <p className="text-muted-foreground">
                  We are rolling out to a small group of teams. Join the waitlist to be first in line.
                </p>

                {status === "success" ? (
                  <div className="bg-primary/10 border border-primary/30 rounded-lg p-6 text-primary animate-scale-up w-full">
                    <Check className="h-8 w-8 mx-auto mb-2" />
                    <p className="font-medium">{message}</p>
                  </div>
                ) : (
                  <form
                    onSubmit={handleSubmit}
                    className="w-full space-y-4"
                  >
                    <input
                      ref={nameInputRef}
                      type="text"
                      placeholder="Your name (optional)"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all hover-glow"
                    />
                    <input
                      type="email"
                      placeholder="Work email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all hover-glow"
                    />
                    <button
                      type="submit"
                      disabled={status === "loading"}
                      className="w-full py-3 bg-primary text-primary-foreground font-medium rounded-lg flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50 animate-pulse-glow hover:scale-[1.02]"
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
                      <p className="text-red-400 text-sm animate-fade-in">
                        {message}
                      </p>
                    )}
                  </form>
                )}

                <p className="text-xs text-muted-foreground">
                  No spam. Just updates when we launch.
                </p>
              </div>
            ) : (
              <>
                <h2 className="text-2xl md:text-3xl font-bold animate-fade-in">
                  Ready to fix hiring?
                </h2>
                <p className="text-muted-foreground animate-fade-in-delay-1">
                  Join the waitlist for early access.
                </p>
                <button
                  type="button"
                  onClick={openWaitlistForm}
                  className="px-8 py-4 bg-primary text-primary-foreground font-medium rounded-lg flex items-center gap-2 hover:opacity-90 transition-all animate-pulse-glow hover:scale-105"
                >
                  Get Early Access <ArrowRight className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-12 px-4 animate-fade-in">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <span className="font-semibold">Slait</span>
          </div>
          <p className="text-sm text-muted-foreground">
            The system of record for technical hiring.
          </p>
        </div>
      </footer>
    </div>
  );
}
