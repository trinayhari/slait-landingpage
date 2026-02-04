'use client'

import { useState } from 'react'
import { AIUsageAnalysis } from '@/lib/types'
import RadarChart from './RadarChart'
import { CheckCircle, XCircle, AlertCircle, TrendingUp, TrendingDown, ChevronDown, ChevronUp, MessageSquare, Quote } from 'lucide-react'

interface AnalysisResultsProps {
  analysis: AIUsageAnalysis
  onReset: () => void
}

const dimensionLabels = [
  'Planning',
  'Prompt Quality',
  'Debugging',
  'Tool Control',
  'Engineering Judgment'
]

function getHireSignalColor(signal: string) {
  switch (signal) {
    case 'Strong Yes':
      return 'text-green-400 bg-green-500/20 border-green-500/40'
    case 'Yes':
      return 'text-primary bg-primary/20 border-primary/40'
    case 'Borderline':
      return 'text-amber-400 bg-amber-500/20 border-amber-500/40'
    case 'No':
      return 'text-red-400 bg-red-500/20 border-red-500/40'
    default:
      return 'text-muted-foreground bg-secondary border-border'
  }
}

function getScoreColor(score: number) {
  if (score >= 4) return 'text-green-400'
  if (score >= 3) return 'text-primary'
  if (score >= 2) return 'text-amber-400'
  return 'text-red-400'
}

export default function AnalysisResults({ analysis, onReset }: AnalysisResultsProps) {
  const [expandedDimensions, setExpandedDimensions] = useState<Set<string>>(new Set())

  const toggleDimension = (key: string) => {
    const newExpanded = new Set(expandedDimensions)
    if (newExpanded.has(key)) {
      newExpanded.delete(key)
    } else {
      newExpanded.add(key)
    }
    setExpandedDimensions(newExpanded)
  }

  // Convert 1-5 scores to 0-100 for radar chart
  const radarData = [
    (analysis.dimensionScores.planning / 5) * 100,
    (analysis.dimensionScores.promptIteration / 5) * 100,
    (analysis.dimensionScores.debugging / 5) * 100,
    (analysis.dimensionScores.toolControl / 5) * 100,
    (analysis.dimensionScores.engineeringJudgment / 5) * 100,
  ]

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Header Card */}
      <div className="relative bg-card/50 border border-border rounded-lg p-6 backdrop-blur-sm">
        {/* Corner accents */}
        <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-primary rounded-tl-lg" />
        <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-primary rounded-tr-lg" />
        <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-primary rounded-bl-lg" />
        <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-primary rounded-br-lg" />

        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Overall Score */}
          <div className="text-center">
            <p className="text-xs font-mono text-muted-foreground mb-1">overall score</p>
            <div className={`text-6xl font-bold font-mono ${getScoreColor(analysis.overallScore)}`}>
              {analysis.overallScore}
              <span className="text-2xl text-muted-foreground">/5</span>
            </div>
            <div className="flex items-center justify-center gap-2 mt-2">
              <span className="text-xs font-mono text-muted-foreground">confidence:</span>
              <span className={`text-xs font-mono ${
                analysis.confidence === 'High' ? 'text-green-400' :
                analysis.confidence === 'Medium' ? 'text-amber-400' : 'text-red-400'
              }`}>
                {analysis.confidence}
              </span>
            </div>
          </div>

          {/* Hire Signal */}
          <div className={`px-6 py-3 rounded-lg border ${getHireSignalColor(analysis.hireSignal)}`}>
            <p className="text-xs font-mono opacity-70 mb-1">hire signal</p>
            <p className="text-2xl font-bold font-mono">{analysis.hireSignal}</p>
          </div>

          {/* Reset Button */}
          <button
            onClick={onReset}
            className="px-4 py-2 bg-secondary hover:bg-secondary/80 border border-border rounded-lg text-sm font-mono text-muted-foreground hover:text-foreground transition-colors"
          >
            Analyze Another
          </button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Radar Chart */}
        <div className="relative bg-card/50 border border-border rounded-lg p-6 backdrop-blur-sm">
          <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-primary rounded-tl-lg" />
          <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-primary rounded-tr-lg" />
          <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-primary rounded-bl-lg" />
          <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-primary rounded-br-lg" />

          <h3 className="text-sm font-mono text-muted-foreground mb-4">
            <span className="text-primary">$</span> dimension breakdown
          </h3>
          <RadarChart data={radarData} labels={dimensionLabels} size={280} />
        </div>

        {/* Dimension Scores List with Expandable Evidence */}
        <div className="relative bg-card/50 border border-border rounded-lg p-6 backdrop-blur-sm">
          <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-primary rounded-tl-lg" />
          <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-primary rounded-tr-lg" />
          <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-primary rounded-bl-lg" />
          <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-primary rounded-br-lg" />

          <h3 className="text-sm font-mono text-muted-foreground mb-4">
            <span className="text-primary">$</span> scores by dimension
          </h3>
          <div className="space-y-4">
            {[
              { key: 'planning', label: 'Planning', score: analysis.dimensionScores.planning, evidence: analysis.dimensionEvidence?.planning },
              { key: 'promptIteration', label: 'Prompt Iteration', score: analysis.dimensionScores.promptIteration, evidence: analysis.dimensionEvidence?.promptIteration },
              { key: 'debugging', label: 'Debugging', score: analysis.dimensionScores.debugging, evidence: analysis.dimensionEvidence?.debugging },
              { key: 'toolControl', label: 'Tool Control', score: analysis.dimensionScores.toolControl, evidence: analysis.dimensionEvidence?.toolControl },
              { key: 'engineeringJudgment', label: 'Engineering Judgment', score: analysis.dimensionScores.engineeringJudgment, evidence: analysis.dimensionEvidence?.engineeringJudgment },
            ].map((dim) => (
              <div key={dim.key} className="space-y-2">
                <button
                  onClick={() => dim.evidence && toggleDimension(dim.key)}
                  className={`w-full text-left ${dim.evidence ? 'cursor-pointer hover:bg-secondary/30 -mx-2 px-2 py-1 rounded transition-colors' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono text-foreground">{dim.label}</span>
                      {dim.evidence && (
                        expandedDimensions.has(dim.key)
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
                      <span className={`text-sm font-mono font-bold ${getScoreColor(dim.score)}`}>
                        {dim.score}
                      </span>
                    </div>
                  </div>
                </button>

                {/* Expanded Evidence Section */}
                {expandedDimensions.has(dim.key) && dim.evidence && (
                  <div className="relative mt-3 pl-4 space-y-4 border-l-2 border-primary/30">
                    {/* Explanation */}
                    <p className="text-sm text-muted-foreground">{dim.evidence.explanation}</p>

                    {/* Example Citations */}
                    {dim.evidence.examples && dim.evidence.examples.length > 0 && (
                      <div className="space-y-4">
                        {dim.evidence.examples.map((example, i) => (
                          <div key={i} className="space-y-2">
                            <p className="text-xs font-mono text-muted-foreground flex items-center gap-1.5">
                              <Quote className="w-3 h-3" />
                              Citation {i + 1}
                            </p>
                            <blockquote className="relative text-sm italic text-foreground/80 bg-secondary/30 px-3 py-2 rounded border-l-2 border-primary/50">
                              "{example.excerpt}"
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
        </div>
      </div>

      {/* Strengths & Weaknesses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Strengths */}
        <div className="relative bg-card/50 border border-border rounded-lg p-6 backdrop-blur-sm">
          <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-green-500 rounded-tl-lg" />
          <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-green-500 rounded-tr-lg" />
          <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-green-500 rounded-bl-lg" />
          <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-green-500 rounded-br-lg" />

          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-green-400" />
            <h3 className="text-sm font-mono text-green-400">strengths</h3>
          </div>
          <ul className="space-y-2">
            {analysis.strengths.length > 0 ? (
              analysis.strengths.map((strength, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                  <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                  <span>{strength}</span>
                </li>
              ))
            ) : (
              <li className="text-sm text-muted-foreground">No notable strengths identified</li>
            )}
          </ul>
        </div>

        {/* Weaknesses */}
        <div className="relative bg-card/50 border border-border rounded-lg p-6 backdrop-blur-sm">
          <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-red-500 rounded-tl-lg" />
          <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-red-500 rounded-tr-lg" />
          <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-red-500 rounded-bl-lg" />
          <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-red-500 rounded-br-lg" />

          <div className="flex items-center gap-2 mb-4">
            <TrendingDown className="w-4 h-4 text-red-400" />
            <h3 className="text-sm font-mono text-red-400">weaknesses</h3>
          </div>
          <ul className="space-y-2">
            {analysis.weaknesses.length > 0 ? (
              analysis.weaknesses.map((weakness, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                  <XCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                  <span>{weakness}</span>
                </li>
              ))
            ) : (
              <li className="text-sm text-muted-foreground">No notable weaknesses identified</li>
            )}
          </ul>
        </div>
      </div>

      {/* Detected Patterns */}
      {analysis.detectedPatterns.length > 0 && (
        <div className="relative bg-card/50 border border-border rounded-lg p-6 backdrop-blur-sm">
          <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-amber-500 rounded-tl-lg" />
          <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-amber-500 rounded-tr-lg" />
          <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-amber-500 rounded-bl-lg" />
          <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-amber-500 rounded-br-lg" />

          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-mono text-amber-400">detected patterns</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {analysis.detectedPatterns.map((pattern, i) => (
              <span
                key={i}
                className="px-3 py-1 text-xs font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full"
              >
                {pattern}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Key Evidence Citations */}
      {analysis.exampleEvidence && analysis.exampleEvidence.length > 0 && (
        <div className="relative bg-card/50 border border-border rounded-lg p-6 backdrop-blur-sm">
          <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-cyan-500 rounded-tl-lg" />
          <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-cyan-500 rounded-tr-lg" />
          <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-cyan-500 rounded-bl-lg" />
          <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-cyan-500 rounded-br-lg" />

          <div className="flex items-center gap-2 mb-4">
            <Quote className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-mono text-cyan-400">key evidence</h3>
          </div>
          <div className="space-y-4">
            {analysis.exampleEvidence.map((evidence, i) => (
              <div key={i} className="relative pl-4 border-l-2 border-cyan-500/30">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground flex items-start gap-2">
                    <MessageSquare className="w-3.5 h-3.5 mt-0.5 shrink-0 text-cyan-400" />
                    {evidence.behavior}
                  </p>
                  <p className="text-sm text-muted-foreground ml-5">
                    {evidence.why_it_matters}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="relative bg-card/50 border border-border rounded-lg p-6 backdrop-blur-sm">
        <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-primary rounded-tl-lg" />
        <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-primary rounded-tr-lg" />
        <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-primary rounded-bl-lg" />
        <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-primary rounded-br-lg" />

        <h3 className="text-sm font-mono text-muted-foreground mb-3">
          <span className="text-primary">$</span> executive summary
        </h3>
        <p className="text-foreground leading-relaxed">{analysis.summary}</p>
      </div>
    </div>
  )
}
