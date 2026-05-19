'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { AnnotatedTurn, AnnotatedSpan } from '@/lib/types'

interface AnnotatedTranscriptProps {
  turns: AnnotatedTurn[]
  focusedTurnId?: number
  focusedSnippet?: string
}

// Module colors for span highlights
const MODULE_COLORS: Record<string, { bg: string; border: string; text: string; label: string }> = {
  planning: { bg: 'bg-violet-500/20', border: 'border-violet-500/50', text: 'text-violet-300', label: 'Planning' },
  debugging: { bg: 'bg-red-500/20', border: 'border-red-500/50', text: 'text-red-300', label: 'Debugging' },
  constraints: { bg: 'bg-orange-500/20', border: 'border-orange-500/50', text: 'text-orange-300', label: 'Constraints' },
  iteration: { bg: 'bg-blue-500/20', border: 'border-blue-500/50', text: 'text-blue-300', label: 'Iteration' },
  correction: { bg: 'bg-pink-500/20', border: 'border-pink-500/50', text: 'text-pink-300', label: 'Correction' },
  tool_usage: { bg: 'bg-green-500/20', border: 'border-green-500/50', text: 'text-green-300', label: 'Tool Usage' },
  alignment: { bg: 'bg-cyan-500/20', border: 'border-cyan-500/50', text: 'text-cyan-300', label: 'Alignment' },
  repetition: { bg: 'bg-yellow-500/20', border: 'border-yellow-500/50', text: 'text-yellow-300', label: 'Repetition' },
  understanding: { bg: 'bg-teal-500/20', border: 'border-teal-500/50', text: 'text-teal-300', label: 'Understanding' },
  context_management: { bg: 'bg-indigo-500/20', border: 'border-indigo-500/50', text: 'text-indigo-300', label: 'Context Management' },
  negative_prompting: { bg: 'bg-rose-500/20', border: 'border-rose-500/50', text: 'text-rose-300', label: 'Negative Prompting' },
  persona_assignment: { bg: 'bg-amber-500/20', border: 'border-amber-500/50', text: 'text-amber-300', label: 'Persona Assignment' },
  chain_of_thought: { bg: 'bg-lime-500/20', border: 'border-lime-500/50', text: 'text-lime-300', label: 'Chain-of-Thought' },
}

function renderAnnotatedText(
  text: string,
  spans: AnnotatedSpan[],
  selectedModules?: Set<string>
): React.ReactNode[] {
  if (!spans || spans.length === 0) return [<span key="full">{text}</span>]
  const displaySpans = selectedModules?.size
    ? spans.filter((span) => selectedModules.has(span.module_id))
    : spans
  if (displaySpans.length === 0) return [<span key="full">{text}</span>]

  // Group spans by (start, end) — multiple modules can tag the same chunk
  type SpanGroup = { start: number; end: number; moduleIds: string[] }
  const sorted = [...displaySpans].sort((a, b) => a.start - b.start)
  const groups: SpanGroup[] = []

  for (const span of sorted) {
    const start = Math.min(span.start, text.length)
    const end = Math.min(span.end, text.length)
    if (start >= end) continue

    const existing = groups.find(g => g.start === start && g.end === end)
    if (existing) {
      if (!existing.moduleIds.includes(span.module_id)) existing.moduleIds.push(span.module_id)
    } else {
      // Skip if overlapping with last group (keep non-overlapping groups only)
      const last = groups[groups.length - 1]
      if (!last || start >= last.end) {
        groups.push({ start, end, moduleIds: [span.module_id] })
      }
    }
  }

  const nodes: React.ReactNode[] = []
  let cursor = 0

  for (const group of groups) {
    // Plain text before this group
    if (group.start > cursor) {
      nodes.push(<span key={`plain-${cursor}`}>{text.slice(cursor, group.start)}</span>)
    }

    const primaryColors = MODULE_COLORS[group.moduleIds[0]] || {
      bg: 'bg-primary/20', border: 'border-primary/50', text: 'text-primary', label: group.moduleIds[0]
    }
    const tooltip = group.moduleIds
      .map(id => MODULE_COLORS[id]?.label ?? id)
      .join(' · ')

    nodes.push(
      <mark
        key={`span-${group.start}`}
        className={`${primaryColors.bg} border-b ${primaryColors.border} rounded-sm px-0.5 not-italic text-white`}
        title={tooltip}
      >
        {text.slice(group.start, group.end)}
        {group.moduleIds.length > 1 && (
          <span className="inline-flex gap-px ml-0.5 align-middle relative -top-px">
            {group.moduleIds.map(id => {
              const c = MODULE_COLORS[id]
              return (
                <span
                  key={id}
                  className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${c?.bg ?? 'bg-zinc-400'}`}
                />
              )
            })}
          </span>
        )}
      </mark>
    )
    cursor = group.end
  }

  if (cursor < text.length) {
    nodes.push(<span key="plain-tail">{text.slice(cursor)}</span>)
  }

  return nodes
}

export default function AnnotatedTranscript({ turns, focusedTurnId, focusedSnippet }: AnnotatedTranscriptProps) {
  const [expandedTurns, setExpandedTurns] = useState<Set<number>>(new Set())
  const [selectedModules, setSelectedModules] = useState<Set<string>>(new Set())
  const transcriptRef = useRef<HTMLDivElement | null>(null)

  const resolvedFocusTurnId = useMemo(() => {
    if (focusedTurnId != null) return focusedTurnId
    if (!focusedSnippet) return null
    const normalizedSnippet = focusedSnippet.replace(/\s+/g, ' ').trim().toLowerCase()
    if (!normalizedSnippet) return null

    const match = turns.find((turn) => {
      const user = turn.user_text.replace(/\s+/g, ' ').trim().toLowerCase()
      const assistant = (turn.assistant_text ?? '').replace(/\s+/g, ' ').trim().toLowerCase()
      return user.includes(normalizedSnippet) || assistant.includes(normalizedSnippet)
    })
    return match?.turn_id ?? null
  }, [turns, focusedTurnId, focusedSnippet])

  useEffect(() => {
    if (resolvedFocusTurnId == null) return
    const el = transcriptRef.current?.querySelector(`[data-turn-id="${resolvedFocusTurnId}"]`) as HTMLElement | null
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [resolvedFocusTurnId])

  useEffect(() => {
    if (resolvedFocusTurnId != null) {
      // Ensure the focused turn is not hidden by stale module filters.
      setSelectedModules(new Set())
    }
  }, [resolvedFocusTurnId])

  // Collect all module IDs that appear in spans
  const activeModules = new Set<string>()
  for (const turn of turns) {
    for (const span of turn.spans || []) {
      activeModules.add(span.module_id)
    }
  }

  const toggleTurn = (id: number) => {
    setExpandedTurns(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const sortedModules = [...activeModules].sort((a, b) => {
    const labelA = MODULE_COLORS[a]?.label ?? a
    const labelB = MODULE_COLORS[b]?.label ?? b
    return labelA.localeCompare(labelB)
  })

  const filteredTurns = selectedModules.size
    ? turns.filter((turn) => (turn.spans ?? []).some((span) => selectedModules.has(span.module_id)))
    : turns

  const toggleModule = (moduleId: string) => {
    setSelectedModules((prev) => {
      const next = new Set(prev)
      if (next.has(moduleId)) next.delete(moduleId)
      else next.add(moduleId)
      return next
    })
  }

  return (
    <div className="space-y-4">
      {/* Module color legend */}
      {activeModules.size > 0 && (
        <div className="flex flex-wrap gap-2 pb-3 border-b border-border">
          <button
            type="button"
            onClick={() => setSelectedModules(new Set())}
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs rounded-full border transition-colors ${
              selectedModules.size === 0
                ? 'bg-primary/20 text-primary border-primary/50'
                : 'bg-secondary/30 text-muted-foreground border-border hover:text-foreground'
            }`}
            title="Show all modules"
          >
            All
          </button>
          {sortedModules.map(moduleId => {
            const colors = MODULE_COLORS[moduleId] || { bg: 'bg-primary/20', text: 'text-primary', label: moduleId, border: 'border-primary/50' }
            const isSelected = selectedModules.has(moduleId)
            return (
              <button
                key={moduleId}
                type="button"
                onClick={() => toggleModule(moduleId)}
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs rounded-full border transition-opacity ${
                  isSelected || selectedModules.size === 0
                    ? `${colors.bg} ${colors.text} ${colors.border}`
                    : 'bg-secondary/20 text-muted-foreground border-border opacity-80 hover:opacity-100'
                }`}
                title={`${isSelected ? 'Hide' : 'Show'} ${colors.label}`}
              >
                <span className={`w-2 h-2 rounded-full ${colors.bg} border ${colors.border}`} />
                {colors.label}
              </button>
            )
          })}
        </div>
      )}

      {/* Turns */}
      <div ref={transcriptRef} className="space-y-3">
        {filteredTurns.map((turn, idx) => {
          const hasSpans = turn.spans && turn.spans.length > 0
          const isExpanded = expandedTurns.has(turn.turn_id)
          const prevTurn = idx > 0 ? filteredTurns[idx - 1] : null
          const isNewSession = prevTurn != null
            && turn.session_index != null
            && prevTurn.session_index != null
            && turn.session_index !== prevTurn.session_index

          const isFocusedTurn = resolvedFocusTurnId === turn.turn_id

          return (
            <div
              key={turn.turn_id}
              data-turn-id={turn.turn_id}
              className={`space-y-2 rounded-md transition-colors ${
                isFocusedTurn ? 'bg-primary/10 ring-1 ring-primary/40 p-2' : ''
              }`}
            >
              {isNewSession && (
                <div className="flex items-center gap-3 py-2">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground font-mono px-2">Session {(turn.session_index ?? 0) + 1}</span>
                  <div className="flex-1 h-px bg-border" />
                </div>
              )}
              {/* User message */}
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center">
                  <span className="text-xs text-primary font-mono">U</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white leading-relaxed whitespace-pre-wrap">
                    {hasSpans
                      ? renderAnnotatedText(turn.user_text, turn.spans, selectedModules)
                      : turn.user_text}
                  </p>
                </div>
              </div>

              {/* Assistant message (collapsible) */}
              {turn.assistant_text && (
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-secondary border border-border flex items-center justify-center">
                    <span className="text-xs text-muted-foreground font-mono">A</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <button
                      onClick={() => toggleTurn(turn.turn_id)}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors mb-1 flex items-center gap-1"
                    >
                      {isExpanded ? '▾ Hide response' : '▸ Show response'}
                    </button>
                    {isExpanded && (
                      <p className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap">
                        {turn.assistant_text}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
        {filteredTurns.length === 0 && (
          <p className="text-sm text-muted-foreground py-4">
            No transcript turns match the selected module filter.
          </p>
        )}
      </div>
    </div>
  )
}
