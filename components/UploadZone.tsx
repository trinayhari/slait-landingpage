'use client'

import React from "react"

import { useRef, useState, useEffect } from 'react'
import { ArrowUp, AlertTriangle } from 'lucide-react'
import { AIUsageAnalysis } from '@/lib/types'

const tools = ['Cursor', 'Codex', 'Claude Code']

interface UploadZoneProps {
  isAnalyzing: boolean
  setIsAnalyzing: (value: boolean) => void
  onAnalysisComplete: (analysis: AIUsageAnalysis) => void
  fileName: string | null
  setFileName: (value: string | null) => void
}

export default function UploadZone({ isAnalyzing, setIsAnalyzing, onAnalysisComplete, fileName, setFileName }: UploadZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toolIndex, setToolIndex] = useState(0)
  const [toolAnimState, setToolAnimState] = useState<'idle' | 'exit' | 'enter'>('idle')

  useEffect(() => {
    const interval = setInterval(() => {
      setToolAnimState('exit')
      setTimeout(() => {
        setToolIndex((prev) => (prev + 1) % tools.length)
        setToolAnimState('enter')
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setToolAnimState('idle')
          })
        })
      }, 300)
    }, 2500)

    return () => clearInterval(interval)
  }, [])

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

    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      handleFile(files[0])
    }
  }

  const handleFile = async (file: File) => {
    setFileName(file.name)
    setError(null)
    setIsAnalyzing(true)

    try {
      // Read the file content
      const content = await file.text()
      console.log('[Slait] File read successfully, length:', content.length)

      // Call the API
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ chatLog: content }),
      })

      console.log('[Slait] API response status:', response.status)

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        const errorMsg = errorData?.details || errorData?.error || 'Failed to analyze chat log'
        console.error('[Slait] API error:', errorMsg)
        throw new Error(errorMsg)
      }

      const analysis: AIUsageAnalysis = await response.json()
      console.log('[Slait] Analysis received:', {
        overallScore: analysis.overallScore,
        hireSignal: analysis.hireSignal,
        hasEvidence: !!analysis.dimensionEvidence,
      })
      onAnalysisComplete(analysis)
    } catch (err) {
      console.error('[Slait] Error analyzing file:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files
    if (files && files.length > 0) {
      handleFile(files[0])
    }
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div
      className={`relative w-full py-4 px-2 transition-all duration-300 cursor-pointer ${
        isDragging ? 'scale-105' : 'scale-100'
      }`}
      onClick={handleClick}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Dithered background */}
      <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{
        backgroundImage: 'linear-gradient(45deg, transparent 25%, rgba(0, 212, 255, 0.08) 25%, rgba(0, 212, 255, 0.08) 50%, transparent 50%, transparent 75%, rgba(0, 212, 255, 0.08) 75%, rgba(0, 212, 255, 0.08)), linear-gradient(45deg, transparent 25%, rgba(0, 212, 255, 0.08) 25%, rgba(0, 212, 255, 0.08) 50%, transparent 50%, transparent 75%, rgba(0, 212, 255, 0.08) 75%, rgba(0, 212, 255, 0.08))',
        backgroundSize: '4px 4px',
        backgroundPosition: '0 0, 2px 2px'
      }} />

      {/* Try it out header */}
      <p className="text-center text-lg font-semibold text-foreground mb-3">Try it out</p>

      {/* Main upload box */}
      <div
        className={`relative bg-card/50 border border-border rounded-lg p-6 transition-all duration-300 backdrop-blur-sm ${
          isDragging
            ? 'bg-primary/10 shadow-lg shadow-primary/30'
            : 'hover:bg-secondary/40'
        } group`}
      >
        {/* Corner accents - matching CandidateGallery */}
        <div className={`absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 rounded-tl-lg transition-colors ${isDragging ? 'border-primary' : 'border-primary'}`} />
        <div className={`absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 rounded-tr-lg transition-colors ${isDragging ? 'border-primary' : 'border-primary'}`} />
        <div className={`absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 rounded-bl-lg transition-colors ${isDragging ? 'border-primary' : 'border-primary'}`} />
        <div className={`absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 rounded-br-lg transition-colors ${isDragging ? 'border-primary' : 'border-primary'}`} />
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleInputChange}
          accept=".md,.txt,.json,.jsonl"
          className="sr-only"
        />

        {isAnalyzing ? (
          // Analyzing state
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 border-2 border-primary/30 rounded-full" />
              <div className="absolute inset-0 border-2 border-transparent border-t-primary border-r-primary rounded-full animate-spin" />
              <div className="absolute inset-1 border border-primary/20 rounded-full animate-pulse" />
            </div>
            <div className="text-center">
              <p className="text-lg text-primary">
                Analyzing session...
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {fileName}
              </p>
            </div>
          </div>
        ) : error ? (
          // Error state
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="w-12 h-12 rounded-full border-2 border-red-500/50 flex items-center justify-center bg-red-500/10">
              <AlertTriangle className="w-6 h-6 text-red-400" />
            </div>
            <div className="text-center">
              <p className="text-lg text-red-400">Analysis failed</p>
              <p className="text-sm text-muted-foreground mt-1">{error}</p>
              <p className="text-xs text-muted-foreground mt-2">Click to try again</p>
            </div>
          </div>
        ) : fileName ? (
          // File selected state
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="w-12 h-12 rounded-full border-2 border-primary/50 flex items-center justify-center bg-primary/10">
              <ArrowUp className="w-6 h-6 text-primary" />
            </div>
            <div className="text-center">
              <p className="text-lg text-primary">Ready to analyze</p>
              <p className="text-sm text-muted-foreground mt-1">{fileName}</p>
              <p className="text-xs text-muted-foreground mt-2">Drop another file or click to browse</p>
            </div>
          </div>
        ) : (
          // Default state
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all ${
              isDragging
                ? 'border-primary bg-primary/20'
                : 'border-primary/40 group-hover:border-primary/60 bg-primary/10'
            }`}>
              <ArrowUp className={`w-5 h-5 transition-colors ${
                isDragging ? 'text-primary' : 'text-primary/60'
              }`} />
            </div>
            <div className="text-center space-y-1">
              <p className="text-lg text-foreground">
                Drop to analyze your session
              </p>
              <p className="text-base text-muted-foreground">
                with{' '}
                <span
                  className="inline-flex overflow-hidden transition-[width] duration-300 ease-in-out"
                  style={{ width: `${tools[toolIndex].length}ch` }}
                >
                  <span
                    className="text-primary font-bold whitespace-nowrap"
                    style={{
                      transform: toolAnimState === 'exit' ? 'translateY(100%)' : toolAnimState === 'enter' ? 'translateY(-100%)' : 'translateY(0)',
                      opacity: toolAnimState === 'idle' ? 1 : 0,
                      transition: toolAnimState === 'enter' ? 'none' : 'all 300ms ease-in-out',
                    }}
                  >
                    {tools[toolIndex]}
                  </span>
                </span>
              </p>
              <p className="text-xs text-muted-foreground pt-1">
                or click to browse
              </p>
            </div>
            <div className="pt-2 border-t border-border/50 w-full">
              <p className="text-xs text-muted-foreground text-center">
                Supports .md, .txt, .json, .jsonl files
              </p>
            </div>
          </div>
        )}
      </div>

    </div>
  )
}
