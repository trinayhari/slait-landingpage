'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AIUsageAnalysis, ModuleScore } from '@/lib/types'
import type { DisplayMessage, ClaudeGeneratedSubtype } from '@/lib/claudeCodeJsonl'
import RadarChart from './RadarChart'
import AnnotatedTranscript from './AnnotatedTranscript'
import { AlertCircle, ChevronDown, ChevronUp, Quote, FileText, MessageSquare, Sparkles } from 'lucide-react'

interface AnalysisResultsProps {
  analysis: AIUsageAnalysis
  onReset: () => void
  savedSessionId?: string | null
  hideScoring?: boolean
  focusedTurnId?: number
  focusedSnippet?: string
}

// 9-module ordered display
const MODULE_ORDER = [
  'planning',
  'debugging',
  'constraints',
  'iteration',
  'correction',
  'tool_usage',
  'repetition',
  'understanding',
  'context_management',
  'negative_prompting',
  'persona_assignment',
  'chain_of_thought',
]

const MODULE_LABELS: Record<string, string> = {
  planning: 'Planning',
  debugging: 'Debugging',
  constraints: 'Constraints',
  iteration: 'Iteration',
  correction: 'Correction',
  tool_usage: 'Tool Usage',
  repetition: 'Repetition',
  understanding: 'Understanding',
  context_management: 'Context Management',
  negative_prompting: 'Negative Prompting',
  persona_assignment: 'Persona Assignment',
  chain_of_thought: 'Chain-of-Thought',
}


function getScoreColor(score: number) {
  if (score >= 4) return 'text-green-400'
  if (score >= 3) return 'text-primary'
  if (score >= 2) return 'text-amber-400'
  return 'text-red-400'
}

function cornerAccents(color = 'border-primary') {
  return (
    <>
      <div className={`absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 ${color} rounded-tl-lg`} />
      <div className={`absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 ${color} rounded-tr-lg`} />
      <div className={`absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 ${color} rounded-bl-lg`} />
      <div className={`absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 ${color} rounded-br-lg`} />
    </>
  )
}

// ── 9-module scores list ──────────────────────────────────────────────────────

function ModuleScoresList({ moduleScores, weights }: {
  moduleScores: Record<string, ModuleScore>
  weights: Record<string, number>
}) {
  const [expandedModule, setExpandedModule] = useState<string | null>(null)
  const toggle = (id: string) => setExpandedModule(prev => prev === id ? null : id)
  const ordered = MODULE_ORDER.filter(id => moduleScores[id])

  return (
    <div className="space-y-3">
      {ordered.map((id) => {
        const mod = moduleScores[id]
        const label = MODULE_LABELS[id] || id
        const weight = Math.round((weights[id] ?? 0) * 100)
        const isOpen = expandedModule === id

        return (
          <div key={id}>
            <button
              onClick={() => toggle(id)}
              className="w-full text-left hover:bg-secondary/30 -mx-2 px-2 py-1 rounded transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-foreground">{label}</span>
                  <span className="text-xs text-muted-foreground">·{weight}%</span>
                  {isOpen
                    ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                    : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                  }
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        mod.score >= 4 ? 'bg-green-400' :
                        mod.score >= 3 ? 'bg-primary' :
                        mod.score >= 2 ? 'bg-amber-400' : 'bg-red-400'
                      }`}
                      style={{ width: `${(mod.score / 5) * 100}%` }}
                    />
                  </div>
                  <span className={`text-sm font-bold ${getScoreColor(mod.score)}`}>
                    {mod.score.toFixed(1)}
                  </span>
                </div>
              </div>
            </button>

            {isOpen && (
              <div className="mt-2 ml-2 pl-3 border-l-2 border-primary/30 space-y-3">
                <p className="text-sm text-muted-foreground">{mod.explanation}</p>
                {mod.evidence && mod.evidence.length > 0 && (
                  <div className="space-y-2">
                    {mod.evidence.slice(0, 3).map((quote, i) => (
                      <blockquote key={i} className="text-xs italic text-foreground/80 bg-secondary/30 px-3 py-2 rounded border-l-2 border-primary/50">
                        &ldquo;{quote}&rdquo;
                      </blockquote>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Legacy 5-dim scores list ──────────────────────────────────────────────────

function LegacyDimensionList({ analysis }: { analysis: AIUsageAnalysis }) {
  const [expandedDimension, setExpandedDimension] = useState<string | null>(null)
  const toggle = (key: string) => setExpandedDimension(prev => prev === key ? null : key)
  const dimensionScores = analysis.dimensionScores ?? {
    planning: 0,
    promptIteration: 0,
    debugging: 0,
    toolControl: 0,
    engineeringJudgment: 0,
  }

  const dims = [
    { key: 'planning', label: 'Planning', score: dimensionScores.planning, evidence: analysis.dimensionEvidence?.planning },
    { key: 'promptIteration', label: 'Prompt Iteration', score: dimensionScores.promptIteration, evidence: analysis.dimensionEvidence?.promptIteration },
    { key: 'debugging', label: 'Debugging', score: dimensionScores.debugging, evidence: analysis.dimensionEvidence?.debugging },
    { key: 'toolControl', label: 'Tool Control', score: dimensionScores.toolControl, evidence: analysis.dimensionEvidence?.toolControl },
    { key: 'engineeringJudgment', label: 'Engineering Judgment', score: dimensionScores.engineeringJudgment, evidence: analysis.dimensionEvidence?.engineeringJudgment },
  ]

  return (
    <div className="space-y-4">
      {dims.map((dim) => (
        <div key={dim.key} className="space-y-2">
          <button
            onClick={() => dim.evidence && toggle(dim.key)}
            className={`w-full text-left ${dim.evidence ? 'cursor-pointer hover:bg-secondary/30 -mx-2 px-2 py-1 rounded transition-colors' : ''}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-foreground">{dim.label}</span>
                {dim.evidence && (
                  expandedDimension === dim.key
                    ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                    : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="w-24 h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      dim.score >= 4 ? 'bg-green-400' :
                      dim.score >= 3 ? 'bg-primary' :
                      dim.score >= 2 ? 'bg-amber-400' : 'bg-red-400'
                    }`}
                    style={{ width: `${(dim.score / 5) * 100}%` }}
                  />
                </div>
                <span className={`text-sm font-bold ${getScoreColor(dim.score)}`}>{dim.score}</span>
              </div>
            </div>
          </button>

          {expandedDimension === dim.key && dim.evidence && (
            <div className="relative mt-3 pl-4 space-y-4 border-l-2 border-primary/30">
              <p className="text-sm text-muted-foreground">{dim.evidence.explanation}</p>
              {dim.evidence.examples && dim.evidence.examples.length > 0 && (
                <div className="space-y-4">
                  {dim.evidence.examples.map((example, i) => (
                    <div key={i} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <Quote className="w-3 h-3" />
                          Citation {i + 1}
                        </p>
                        {example.location && (
                          <span className="text-xs text-primary/80 bg-primary/10 px-2 py-0.5 rounded flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            {example.location}
                          </span>
                        )}
                      </div>
                      <blockquote className="relative text-sm italic text-foreground/80 bg-secondary/30 px-3 py-2 rounded border-l-2 border-primary/50">
                        &ldquo;{example.excerpt}&rdquo;
                      </blockquote>
                      <p className="text-sm text-muted-foreground flex items-start gap-2">
                        <MessageSquare className="w-3.5 h-3.5 mt-0.5 shrink-0 text-primary" />
                        {example.analysis}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Full transcript with Claude-generated badges ─────────────────────────────

const SUBTYPE_LABEL: Record<ClaudeGeneratedSubtype, string> = {
  tool_result: 'Tool result',
  sidechain: 'Sub-agent',
  system_reminder: 'System reminder',
  command: 'Slash command',
  attachment: 'Attachment',
  thinking: 'Thinking',
  tool_use: 'Tool call',
}

function FullTranscriptWithBadges({ messages }: { messages: DisplayMessage[] }) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const toggle = (id: number) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  return (
    <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1 no-scrollbar">
      {messages.map((msg) => {
        const isClaudeGenerated = msg.kind === 'claude_generated'
        const isUser = msg.role === 'user'
        const subtypeLabel = msg.subtype ? SUBTYPE_LABEL[msg.subtype] : null

        const avatarBg = isClaudeGenerated
          ? 'bg-amber-500/10 border-amber-500/40'
          : isUser
            ? 'bg-primary/20 border-primary/40'
            : 'bg-secondary border-border'
        const avatarText = isClaudeGenerated
          ? 'text-amber-300'
          : isUser
            ? 'text-primary'
            : 'text-muted-foreground'
        const avatarChar = isClaudeGenerated ? '★' : isUser ? 'U' : 'A'

        // Long claude-generated noise (tool output, thinking) collapses by default.
        const collapsible =
          isClaudeGenerated &&
          (msg.subtype === 'tool_result' || msg.subtype === 'thinking' || msg.text.length > 600)
        const isOpen = !collapsible || expanded.has(msg.id)
        const preview = msg.text.length > 200 ? `${msg.text.slice(0, 200).trim()}…` : msg.text

        return (
          <div key={msg.id} className="flex gap-3">
            <div
              className={`flex-shrink-0 w-6 h-6 rounded-full border flex items-center justify-center ${avatarBg}`}
            >
              <span className={`text-xs font-mono ${avatarText}`}>{avatarChar}</span>
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              {isClaudeGenerated && (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-amber-300">
                    <Sparkles className="w-2.5 h-2.5" />
                    Claude generated
                  </span>
                  {subtypeLabel && (
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      {subtypeLabel}
                    </span>
                  )}
                  <span className="text-[10px] text-muted-foreground/70">excluded from scoring</span>
                </div>
              )}
              <p
                className={`text-sm whitespace-pre-wrap leading-relaxed ${
                  isClaudeGenerated
                    ? 'text-muted-foreground/80 italic'
                    : isUser
                      ? 'text-foreground'
                      : 'text-foreground/85'
                }`}
              >
                {isOpen ? msg.text : preview}
              </p>
              {collapsible && (
                <button
                  type="button"
                  onClick={() => toggle(msg.id)}
                  className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  {isOpen ? '▾ Hide' : '▸ Show full'}
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AnalysisResults({
  analysis,
  onReset,
  savedSessionId,
  hideScoring = false,
  focusedTurnId,
  focusedSnippet,
}: AnalysisResultsProps) {
  const [transcriptView, setTranscriptView] = useState<'annotated' | 'full'>('annotated')

  const isNewFormat = !!analysis.moduleEval
  const moduleScores = analysis.moduleEval?.module_scores ?? {}
  const weights = analysis.moduleEval?.weights ?? {}
  const dimensionScores = analysis.dimensionScores ?? {
    planning: 0,
    promptIteration: 0,
    debugging: 0,
    toolControl: 0,
    engineeringJudgment: 0,
  }

  // Build radar data
  let radarData: number[]
  let radarLabels: string[]

  if (isNewFormat) {
    const orderedIds = MODULE_ORDER.filter(id => moduleScores[id])
    radarData = orderedIds.map(id => (moduleScores[id].score / 5) * 100)
    radarLabels = orderedIds.map(id => MODULE_LABELS[id] || id)
  } else {
    radarData = [
      (dimensionScores.planning / 5) * 100,
      (dimensionScores.promptIteration / 5) * 100,
      (dimensionScores.debugging / 5) * 100,
      (dimensionScores.toolControl / 5) * 100,
      (dimensionScores.engineeringJudgment / 5) * 100,
    ]
    radarLabels = ['Planning', 'Prompt Quality', 'Debugging', 'Tool Control', 'Engineering Judgment']
  }

  const hasTranscript = !!analysis.annotatedTurns && analysis.annotatedTurns.length > 0
  const useSessionSplitLayout = !!savedSessionId && hasTranscript
  const isSessionDetailView = !!savedSessionId
  const radarSize = useSessionSplitLayout ? 240 : 280
  const cardClassName = isSessionDetailView
    ? "rounded-2xl border border-border bg-white/[0.03] backdrop-blur-[8px]"
    : "glass-card"

  const transcriptCard = hasTranscript ? (
    <div className={`${cardClassName} p-6`}>
      {!isSessionDetailView && cornerAccents()}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm text-muted-foreground">Transcript</h3>
        <div className="flex items-center gap-1 bg-secondary rounded-lg p-1">
          <button
            onClick={() => setTranscriptView('annotated')}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${
              transcriptView === 'annotated'
                ? 'bg-primary/20 text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Annotated
          </button>
          <button
            onClick={() => setTranscriptView('full')}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${
              transcriptView === 'full'
                ? 'bg-primary/20 text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Full
          </button>
        </div>
      </div>

      {transcriptView === 'annotated' ? (
        <div className="max-h-[70vh] overflow-y-auto pr-1 no-scrollbar">
          <AnnotatedTranscript
            turns={analysis.annotatedTurns!}
            focusedTurnId={focusedTurnId}
            focusedSnippet={focusedSnippet}
          />
        </div>
      ) : analysis.displayMessages && analysis.displayMessages.length > 0 ? (
        <FullTranscriptWithBadges messages={analysis.displayMessages} />
      ) : (
        <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1 no-scrollbar">
          {analysis.annotatedTurns!.map((turn, idx) => {
            const prevTurn = idx > 0 ? analysis.annotatedTurns![idx - 1] : null
            const isNewSession = prevTurn != null
              && turn.session_index != null
              && prevTurn.session_index != null
              && turn.session_index !== prevTurn.session_index

            return (
              <div key={turn.turn_id} className="space-y-2">
                {isNewSession && (
                  <div className="flex items-center gap-3 py-2">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs text-muted-foreground font-mono px-2">Session {(turn.session_index ?? 0) + 1}</span>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                )}
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center">
                    <span className="text-xs text-primary font-mono">U</span>
                  </div>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{turn.user_text}</p>
                </div>
                {turn.assistant_text && (
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-secondary border border-border flex items-center justify-center">
                      <span className="text-xs text-muted-foreground font-mono">A</span>
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{turn.assistant_text}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  ) : null

  useEffect(() => {
    if ((focusedTurnId != null || focusedSnippet) && hasTranscript) {
      setTranscriptView('annotated')
    }
  }, [focusedTurnId, focusedSnippet, hasTranscript])

  if (hideScoring) {
    return (
      <div className={savedSessionId ? "w-full" : "w-full max-w-5xl mx-auto"}>
        {transcriptCard ?? (
          <div className={`${cardClassName} p-6`}>
            {!isSessionDetailView && cornerAccents()}
            <p className="text-sm text-muted-foreground">No annotated transcript available for this session.</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={savedSessionId ? "w-full" : "w-full max-w-5xl mx-auto"}>
      {useSessionSplitLayout ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <div className="lg:sticky lg:top-24">
            {transcriptCard}
          </div>
          <div className="space-y-6">
            {/* Header Card */}
            <div className={`${cardClassName} p-6`}>
              {!isSessionDetailView && cornerAccents()}
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                {/* Overall Score */}
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">Overall Score</p>
                  <div className={`text-6xl font-bold ${getScoreColor(analysis.overallScore)}`}>
                    {Number(analysis.overallScore).toFixed(1)}
                    <span className="text-2xl text-muted-foreground">/5</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2">
                  {!savedSessionId && (
                    <Link
                      href="/?signup=true"
                      className="text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      Sign up to save results and rank on The Slate
                    </Link>
                  )}
                </div>
              </div>
            </div>

            {/* Radar + Scores */}
            <div className="grid grid-cols-1 2xl:grid-cols-2 gap-6 items-start">
              <div className={`${cardClassName} p-6`}>
                {!isSessionDetailView && cornerAccents()}
                <h3 className="text-sm text-muted-foreground mb-4">
                  {isNewFormat ? 'Module Breakdown' : 'Dimension Breakdown'}
                </h3>
                <RadarChart data={radarData} labels={radarLabels} size={radarSize} />
              </div>

              <div className={`${cardClassName} p-6`}>
                {!isSessionDetailView && cornerAccents()}
                <h3 className="text-sm text-muted-foreground mb-4">
                  {isNewFormat ? 'Module Scores' : 'Scores by Dimension'}
                </h3>
                {isNewFormat
                  ? <ModuleScoresList moduleScores={moduleScores} weights={weights} />
                  : <LegacyDimensionList analysis={analysis} />
                }
              </div>
            </div>

            {/* Detected Patterns */}
            {analysis.detectedPatterns.length > 0 && (
              <div className={`${cardClassName} p-6`}>
                {!isSessionDetailView && cornerAccents('border-amber-500')}
                <div className="flex items-center gap-2 mb-4">
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm text-amber-400">Detected Patterns</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {analysis.detectedPatterns.map((pattern, i) => (
                    <span key={i} className="px-3 py-1 text-xs bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full">
                      {pattern}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Header Card */}
          <div className={`${cardClassName} p-6`}>
            {!isSessionDetailView && cornerAccents()}
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              {/* Overall Score */}
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Overall Score</p>
                <div className={`text-6xl font-bold ${getScoreColor(analysis.overallScore)}`}>
                  {Number(analysis.overallScore).toFixed(1)}
                  <span className="text-2xl text-muted-foreground">/5</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-2">
                {!savedSessionId && (
                  <Link
                    href="/?signup=true"
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    Sign up to save results and rank on The Slate
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* Radar + Scores */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <div className={`${cardClassName} p-4`}>
              {!isSessionDetailView && cornerAccents()}
              <h3 className="text-sm text-muted-foreground mb-4">
                {isNewFormat ? 'Module Breakdown' : 'Dimension Breakdown'}
              </h3>
              <RadarChart data={radarData} labels={radarLabels} size={radarSize} />
            </div>

            <div className={`${cardClassName} p-6`}>
              {!isSessionDetailView && cornerAccents()}
              <h3 className="text-sm text-muted-foreground mb-4">
                {isNewFormat ? 'Module Scores' : 'Scores by Dimension'}
              </h3>
              {isNewFormat
                ? <ModuleScoresList moduleScores={moduleScores} weights={weights} />
                : <LegacyDimensionList analysis={analysis} />
              }
            </div>
          </div>

          {/* Detected Patterns */}
          {analysis.detectedPatterns.length > 0 && (
            <div className={`${cardClassName} p-6`}>
              {!isSessionDetailView && cornerAccents('border-amber-500')}
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm text-amber-400">Detected Patterns</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {analysis.detectedPatterns.map((pattern, i) => (
                  <span key={i} className="px-3 py-1 text-xs bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full">
                    {pattern}
                  </span>
                ))}
              </div>
            </div>
          )}

          {transcriptCard}
        </div>
      )}
    </div>
  )
}
