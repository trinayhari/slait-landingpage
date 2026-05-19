'use client'

import React from "react"

import { useRef, useState, useCallback, useEffect } from 'react'
import { ArrowUp, AlertTriangle, X, FileText, Plus } from 'lucide-react'
import { SessionSource } from '@/lib/types'
import { useAuth } from '@/components/AuthProvider'

const TOOLS_DISPLAY: Record<SessionSource, string> = {
  cursor: 'Cursor',
  claude: 'Claude',
  chatgpt: 'Codex',
  copilot: 'Copilot',
  windsurf: 'Windsurf',
  other: 'Other',
}
const ENABLED_SOURCES: SessionSource[] = ['cursor']
interface UploadZoneProps {
  isAnalyzing: boolean
  setIsAnalyzing: (value: boolean) => void
  onProjectComplete: (projectId: string) => void
  fileName: string | null
  setFileName: (value: string | null) => void
  compact?: boolean
  className?: string
  existingProject?: {
    id: string
    name: string
    source: SessionSource
    isPublic: boolean
  }
  orgContext?: {
    slug: string
  }
}

export default function UploadZone({
  isAnalyzing,
  setIsAnalyzing,
  onProjectComplete,
  fileName,
  setFileName,
  compact,
  className,
  existingProject,
  orgContext,
}: UploadZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const claudeMdInputRef = useRef<HTMLInputElement>(null)
  const skillsInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()

  const [selectedSource, setSelectedSource] = useState<SessionSource>('cursor')
  const [projectName, setProjectName] = useState('')
  const [projectDescription, setProjectDescription] = useState('')
  const [projectIsPublic, setProjectIsPublic] = useState(true)
  const [chatLogFiles, setChatLogFiles] = useState<File[]>([])
  const [claudeMdFile, setClaudeMdFile] = useState<File | null>(null)
  const [skillsFiles, setSkillsFiles] = useState<File[]>([])

  useEffect(() => {
    if (existingProject) {
      setSelectedSource(existingProject.source)
      setProjectName(existingProject.name)
      setProjectIsPublic(existingProject.isPublic)
    }
  }, [existingProject])

  const addChatLogFiles = useCallback((newFiles: File[]) => {
    setChatLogFiles((prev) => {
      const existing = new Set(prev.map((f) => `${f.name}:${f.size}`))
      const toAdd = newFiles.filter((f) => !existing.has(`${f.name}:${f.size}`))
      return [...prev, ...toAdd]
    })
    if (newFiles.length > 0) {
      setFileName(newFiles.map((f) => f.name).join(', '))
    }
  }, [setFileName])

  const removeChatLogFile = (index: number) => {
    setChatLogFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const addSkillsFiles = useCallback((newFiles: File[]) => {
    setSkillsFiles((prev) => {
      const existing = new Set(prev.map((f) => `${f.name}:${f.size}`))
      const toAdd = newFiles.filter((f) => !existing.has(`${f.name}:${f.size}`))
      return [...prev, ...toAdd]
    })
  }, [])

  const removeSkillFile = (index: number) => {
    setSkillsFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleAnalyzeProject = async () => {
    if (chatLogFiles.length === 0) return
    if (!existingProject && !projectName.trim()) {
      setError('Project name is required')
      return
    }
    if (!user) {
      setError('You must be signed in to create a project')
      return
    }

    setError(null)
    setIsAnalyzing(true)

    try {
      const sessionsPayload = await Promise.all(
        chatLogFiles.map(async (file) => {
          const text = await file.text()
          return {
            fileName: file.name,
            rawLog: text,
            chatLog: text,
            supplementaryFiles: null as Record<string, string> | null,
          }
        })
      )

      let claudeMd: string | null = null
      if (selectedSource === 'claude' && claudeMdFile) {
        claudeMd = await claudeMdFile.text()
      }

      let skillsFilesPayload: Record<string, string> | null = null
      if (selectedSource === 'claude' && skillsFiles.length > 0) {
        const entries = await Promise.all(skillsFiles.map(async (f) => [f.name, await f.text()] as [string, string]))
        skillsFilesPayload = Object.fromEntries(entries)
      }

      let createRes: Response
      const orgApiBase = orgContext ? `/api/orgs/${orgContext.slug}` : "/api"
      if (existingProject) {
        createRes = await fetch(`${orgApiBase}/projects/${existingProject.id}/sessions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessions: sessionsPayload.map((session) => ({
              fileName: session.fileName,
              sessionLabel: null,
              rawLog: session.rawLog,
              supplementaryFiles: session.supplementaryFiles,
            })),
          }),
        })
      } else {
        const analyzeRes = await fetch('/api/projects/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source: selectedSource,
            projectName: projectName.trim(),
            sessions: sessionsPayload.map((session) => ({
              fileName: session.fileName,
              chatLog: session.chatLog,
              supplementaryFiles: session.supplementaryFiles,
            })),
            claudeMd,
            skillsFiles: skillsFilesPayload,
          }),
        })

        if (!analyzeRes.ok) {
          const errorData = await analyzeRes.json().catch(() => null)
          const errorMsg = errorData?.details || errorData?.error || 'Failed to analyze chat log'
          throw new Error(errorMsg)
        }

        const analyzed = await analyzeRes.json()
        if (!Array.isArray(analyzed.sessionAnalyses) || !analyzed.projectAnalysis) {
          throw new Error('Invalid analyze response')
        }

        createRes = await fetch(`${orgApiBase}/projects`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: projectName.trim(),
            description: projectDescription.trim() || null,
            isPublic: projectIsPublic,
            source: selectedSource,
            claudeMd,
            skillsFiles: skillsFilesPayload,
            projectAnalysis: analyzed.projectAnalysis,
            sessions: analyzed.sessionAnalyses.map((session: {
              fileName: string
              sessionLabel: string | null
              chatLog: string
              supplementaryFiles: Record<string, string> | null
              analysis: unknown
            }) => ({
              fileName: session.fileName,
              sessionLabel: session.sessionLabel,
              rawLog: session.chatLog,
              supplementaryFiles: session.supplementaryFiles,
              analysis: session.analysis,
            })),
          }),
        })
      }

      if (!createRes.ok) {
        const errorData = await createRes.json().catch(() => null)
        const errorMsg = errorData?.error || (existingProject ? 'Failed to append sessions' : 'Failed to create project')
        throw new Error(errorMsg)
      }

      const result = await createRes.json()
      if (!result?.id) {
        throw new Error(existingProject ? 'Sessions were added but no project id returned' : 'Project was created but no id returned')
      }

      setChatLogFiles([])
      setClaudeMdFile(null)
      setSkillsFiles([])
      setFileName(null)
      onProjectComplete(result.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      addChatLogFiles(files)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.currentTarget.files ?? [])
    if (files.length > 0) {
      addChatLogFiles(files)
    }
    e.target.value = ""
  }

  const handleSupplementaryInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.currentTarget.files ?? [])
    if (files.length > 0) {
      addSkillsFiles(files)
    }
    e.target.value = ""
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  const hasFiles = chatLogFiles.length > 0
  const analyzingLabel =
    chatLogFiles.length > 0
      ? `${chatLogFiles.length} session${chatLogFiles.length === 1 ? '' : 's'} selected`
      : fileName

  return (
    <div
      className={`relative w-full flex flex-col transition-all duration-300 ${
        compact ? 'py-1 px-1' : 'py-4 px-2'
      } ${className ?? ''}`}
    >
      <div
        className={`rounded-2xl border border-border bg-white/[0.03] backdrop-blur-[8px] flex-1 flex flex-col min-h-0 transition-all duration-300 ${
          compact ? 'p-3' : 'p-5'
        } ${
          isDragging
            ? 'bg-white/[0.06] shadow-lg shadow-black/30'
            : ''
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleInputChange}
          accept=".md,.txt,.json,.jsonl"
          multiple
          className="sr-only"
        />
        <input
          ref={claudeMdInputRef}
          type="file"
          onChange={(e) => {
            const file = e.currentTarget.files?.[0] ?? null
            setClaudeMdFile(file)
            e.target.value = ""
          }}
          accept=".md,.txt"
          className="sr-only"
        />
        <input
          ref={skillsInputRef}
          type="file"
          onChange={handleSupplementaryInputChange}
          accept=".md,.txt"
          multiple
          className="sr-only"
        />

        {isAnalyzing ? (
          <div className={`flex-1 flex flex-col items-center justify-center ${compact ? 'space-y-1' : 'space-y-4'}`}>
            <div className={`relative ${compact ? 'w-10 h-10' : 'w-16 h-16'}`}>
              <div className="absolute inset-0 border-2 border-primary/30 rounded-full" />
              <div className="absolute inset-0 border-2 border-transparent border-t-primary border-r-primary rounded-full animate-spin" />
              <div className="absolute inset-1 border border-primary/20 rounded-full animate-pulse" />
            </div>
            <div className="text-center">
              <p className={compact ? 'text-sm text-primary' : 'text-lg text-primary'}>Analyzing project...</p>
              <p className="text-xs text-muted-foreground w-full max-w-[22rem] px-1 break-words line-clamp-2 mx-auto">
                {analyzingLabel}
              </p>
            </div>
          </div>
        ) : error ? (
          <div
            className={`flex-1 flex flex-col items-center justify-center cursor-pointer ${compact ? 'space-y-1' : 'space-y-3'}`}
            onClick={handleClick}
          >
            <div className={`rounded-full border-2 border-red-500/50 flex items-center justify-center bg-red-500/10 ${compact ? 'w-8 h-8' : 'w-12 h-12'}`}>
              <AlertTriangle className={compact ? 'w-4 h-4 text-red-400' : 'w-6 h-6 text-red-400'} />
            </div>
            <div className="text-center">
              <p className={compact ? 'text-sm text-red-400' : 'text-lg text-red-400'}>Analysis failed</p>
              <p className="text-xs text-muted-foreground truncate max-w-full px-1">{error}</p>
              {!compact && <p className="text-xs text-muted-foreground mt-2">Click to try again</p>}
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-2 mb-2">
              <div className="text-xs text-muted-foreground">1) Select source</div>
              <div className="grid grid-cols-3 gap-1">
                {(Object.keys(TOOLS_DISPLAY) as SessionSource[]).map((source) => {
                  const isEnabled = existingProject ? source === existingProject.source : ENABLED_SOURCES.includes(source)
                  return (
                  <button
                    key={source}
                    type="button"
                    disabled={!isEnabled}
                    onClick={(e) => {
                      e.stopPropagation()
                      if (!isEnabled) return
                      setSelectedSource(source)
                    }}
                    className={`rounded-md border px-2 py-1 text-xs transition-colors ${
                      !isEnabled
                        ? 'border-border/40 bg-muted/30 text-muted-foreground/60 cursor-not-allowed'
                        : selectedSource === source
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:bg-secondary/30'
                    }`}
                  >
                    {TOOLS_DISPLAY[source]}
                  </button>
                  )
                })}
              </div>
            </div>

            {existingProject ? (
              <div className="space-y-2 mb-2">
                <div className="text-xs text-muted-foreground">2) Existing project</div>
                <div className="rounded-md border border-border/60 bg-background/40 px-2 py-1.5">
                  <p className="text-sm text-foreground">{existingProject.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {existingProject.isPublic ? "Public project" : "Private project"}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2 mb-2">
                <div className="text-xs text-muted-foreground">2) Project details</div>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Project name"
                  className="w-full rounded-md border border-border bg-background/60 px-2 py-1.5 text-sm outline-none focus:border-primary"
                />
                {!compact && (
                  <textarea
                    value={projectDescription}
                    onChange={(e) => setProjectDescription(e.target.value)}
                    placeholder="Optional description"
                    rows={2}
                    className="w-full resize-none rounded-md border border-border bg-background/60 px-2 py-1.5 text-sm outline-none focus:border-primary"
                  />
                )}
                <label className="flex items-center justify-between gap-3 rounded-md border border-border/60 bg-background/40 px-2 py-1.5">
                  <div>
                    <p className="text-xs text-foreground">Public project</p>
                    <p className="text-[11px] text-muted-foreground">
                      {projectIsPublic
                        ? "Visible on your public profile"
                        : "Only visible to you"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setProjectIsPublic((prev) => !prev)
                    }}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      projectIsPublic ? "bg-primary" : "bg-muted"
                    }`}
                    aria-pressed={projectIsPublic}
                    aria-label="Toggle project visibility"
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        projectIsPublic ? "translate-x-4" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </label>
              </div>
            )}

            {/* Drop zone area */}
            <div
              className={`flex flex-col items-center justify-center cursor-pointer rounded-xl transition-colors ${
                compact ? 'py-2' : hasFiles ? 'py-3' : 'py-4'
              } ${isDragging ? 'bg-white/[0.04]' : 'hover:bg-secondary/30'} group`}
              onClick={handleClick}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <div className={`flex flex-col items-center justify-center ${compact ? 'space-y-1' : hasFiles ? 'space-y-1' : 'space-y-2'}`}>
                <div className={`rounded-full border-2 flex items-center justify-center transition-all ${
                  compact || hasFiles ? 'w-7 h-7' : 'w-10 h-10'
                } ${
                  isDragging
                    ? 'border-border bg-secondary/50'
                    : 'border-border/70 group-hover:border-border bg-secondary/30'
                }`}>
                  <ArrowUp className={`transition-colors ${
                    compact || hasFiles ? 'w-3.5 h-3.5' : 'w-5 h-5'
                  } ${isDragging ? 'text-foreground' : 'text-muted-foreground'}`} />
                </div>
                <div className="text-center space-y-0.5">
                  <p className={`${compact || hasFiles ? 'text-sm' : 'text-lg'} text-foreground`}>
                    {hasFiles ? 'Add more session files' : existingProject ? '3) Upload more session files' : '3) Upload session files'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {hasFiles ? 'drop or click to browse' : 'select multiple files or click to browse'}
                  </p>
                </div>
              </div>
            </div>

            {/* File list + supplementary + analyze — all inside the card */}
            {hasFiles && (
              <div className="mt-2 pt-2 border-t border-border/40 space-y-2">
                {/* Chat log files */}
                <div className="flex flex-col gap-0.5">
                  {chatLogFiles.map((file, i) => (
                    <div key={`${file.name}-${file.size}`} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <FileText className="w-3 h-3 text-primary shrink-0" />
                      <span className="flex-1 truncate">{file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
                      <button
                        type="button"
                        onClick={() => removeChatLogFile(i)}
                        className="p-0.5 rounded hover:bg-secondary/60"
                        aria-label={`Remove ${file.name}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Claude-specific files */}
                {selectedSource === 'claude' && !compact && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">4) Claude context (optional)</div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); claudeMdInputRef.current?.click() }}
                        className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-border/50 bg-white/[0.01] py-1.5 px-3 text-xs text-muted-foreground hover:bg-secondary/30 hover:border-border transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                        <span>{claudeMdFile ? 'Replace CLAUDE.md' : 'Add CLAUDE.md'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); skillsInputRef.current?.click() }}
                        className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-border/50 bg-white/[0.01] py-1.5 px-3 text-xs text-muted-foreground hover:bg-secondary/30 hover:border-border transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Skills files</span>
                      </button>
                    </div>
                    {(claudeMdFile || skillsFiles.length > 0) && (
                      <div className="mt-1 flex flex-col gap-0.5">
                        {claudeMdFile && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <FileText className="w-3 h-3 text-amber-400 shrink-0" />
                            <span className="flex-1 truncate">{claudeMdFile.name}</span>
                            <button
                              type="button"
                              onClick={() => setClaudeMdFile(null)}
                              className="p-0.5 rounded hover:bg-secondary/60"
                              aria-label={`Remove ${claudeMdFile.name}`}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                        {skillsFiles.map((file, i) => (
                          <div key={`supp-${file.name}-${file.size}`} className="flex items-center gap-2 text-xs text-muted-foreground">
                            <FileText className="w-3 h-3 text-amber-400 shrink-0" />
                            <span className="flex-1 truncate">{file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
                            <button
                              type="button"
                              onClick={() => removeSkillFile(i)}
                              className="p-0.5 rounded hover:bg-secondary/60"
                              aria-label={`Remove ${file.name}`}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Analyze button */}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleAnalyzeProject() }}
                  className="w-full rounded-lg bg-primary text-primary-foreground py-2 px-4 text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  {existingProject
                    ? `Add to project (${chatLogFiles.length} session${chatLogFiles.length === 1 ? '' : 's'})`
                    : `Analyze project (${chatLogFiles.length} session${chatLogFiles.length === 1 ? '' : 's'})`}
                </button>
              </div>
            )}

            {/* Supported formats hint (only when no files) */}
            {!compact && !hasFiles && (
              <div className="pt-2 border-t border-border/40 mt-1">
                <p className="text-xs text-muted-foreground text-center">
                  Supports .md, .txt, .json, .jsonl files
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
