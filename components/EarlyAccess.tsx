'use client'

import { useState } from 'react'
import { Mail, ArrowRight } from 'lucide-react'

export default function EarlyAccess() {
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setIsSubmitting(true)
    // Simulate submission - replace with actual API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    setIsSubmitting(false)
    setIsSubmitted(true)
  }

  return (
    <div className="w-full h-full flex flex-col">
      {/* Main card */}
      <div className="glass-card p-5 flex-1 flex flex-col justify-between">
        {/* Corner accents */}
        <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-primary rounded-tl-lg" />
        <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-primary rounded-tr-lg" />
        <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-primary rounded-bl-lg" />
        <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-primary rounded-br-lg" />

        {/* Content */}
        <div className="text-center space-y-2 mb-4">
          <h2 className="text-2xl font-bold text-foreground">Interested?</h2>

          <p className="text-base text-primary">
            Sign up for early access
          </p>

          <p className="text-sm text-muted-foreground">
            Implement this into your hiring workflow
          </p>
        </div>

        {/* Form */}
        {isSubmitted ? (
          <div className="mt-4 text-center">
            <p className="text-primary text-sm">Thanks! We&apos;ll be in touch.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-2">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full pl-10 pr-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                required
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? 'Submitting...' : (
                <>
                  Get Early Access
                  <ArrowRight className="w-3 h-3" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Note */}
        <p className="mt-3 text-center text-xs text-muted-foreground">
          No spam, just launch updates.
        </p>
      </div>
    </div>
  )
}
