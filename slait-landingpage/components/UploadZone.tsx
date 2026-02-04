'use client'

import React from "react"

import { useRef, useState } from 'react'
import { ArrowUp } from 'lucide-react'

interface UploadZoneProps {
  isAnalyzing: boolean
  setIsAnalyzing: (value: boolean) => void
}

export default function UploadZone({ isAnalyzing, setIsAnalyzing }: UploadZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)

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

  const handleFile = (file: File) => {
    setFileName(file.name)
    setIsAnalyzing(true)

    // Simulate analysis
    setTimeout(() => {
      setIsAnalyzing(false)
    }, 3000)
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
      className={`relative w-full py-12 px-8 transition-all duration-300 ${
        isDragging ? 'scale-105' : 'scale-100'
      }`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Dithered background */}
      <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity" style={{
        backgroundImage: 'linear-gradient(45deg, transparent 25%, rgba(0, 212, 255, 0.08) 25%, rgba(0, 212, 255, 0.08) 50%, transparent 50%, transparent 75%, rgba(0, 212, 255, 0.08) 75%, rgba(0, 212, 255, 0.08)), linear-gradient(45deg, transparent 25%, rgba(0, 212, 255, 0.08) 25%, rgba(0, 212, 255, 0.08) 50%, transparent 50%, transparent 75%, rgba(0, 212, 255, 0.08) 75%, rgba(0, 212, 255, 0.08))',
        backgroundSize: '4px 4px',
        backgroundPosition: '0 0, 2px 2px'
      }} />

      {/* Main upload box */}
      <div 
        className={`relative bg-card/50 border border-border rounded-lg p-12 transition-all duration-300 backdrop-blur-sm ${
          isDragging
            ? 'bg-primary/10 shadow-lg shadow-primary/30'
            : 'hover:bg-secondary/40'
        } cursor-pointer group`}
        onClick={handleClick}
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
          accept=".json,.txt,.log,.md,.js,.ts,.jsx,.tsx,.py"
          className="hidden"
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
              <p className="text-lg font-mono text-primary scan-glow">
                Analyzing session...
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {fileName}
              </p>
            </div>
          </div>
        ) : fileName ? (
          // File selected state
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="w-12 h-12 rounded-full border-2 border-primary/50 flex items-center justify-center bg-primary/10">
              <ArrowUp className="w-6 h-6 text-primary" />
            </div>
            <div className="text-center">
              <p className="text-lg font-mono text-primary">Ready to analyze</p>
              <p className="text-sm text-muted-foreground mt-1">{fileName}</p>
              <p className="text-xs text-muted-foreground mt-2">Drop another file or click to browse</p>
            </div>
          </div>
        ) : (
          // Default state
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all ${
              isDragging 
                ? 'border-primary bg-primary/20' 
                : 'border-primary/40 group-hover:border-primary/60 bg-primary/10'
            }`}>
              <ArrowUp className={`w-6 h-6 transition-colors ${
                isDragging ? 'text-primary' : 'text-primary/60'
              }`} />
            </div>
            <div className="text-center space-y-1">
              <p className="text-xl font-mono text-foreground">
                Drop your code session file
              </p>
              <p className="text-sm text-muted-foreground">
                or click to browse
              </p>
            </div>
            <div className="pt-2 border-t border-border/50 w-full">
              <p className="text-xs font-mono text-muted-foreground text-center">
                Supports .json, .txt, .log, .md, .js, .ts
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Terminal command below */}
      <div className="mt-8 text-center font-mono text-sm">
        <p className="text-muted-foreground">
          <span className="text-primary">$</span> slait analyze --session <span className="text-primary">{fileName || '[file]'}</span> <span className="text-primary animate-pulse">|</span>
        </p>
      </div>
    </div>
  )
}
