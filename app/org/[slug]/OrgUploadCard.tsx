"use client"

import { useState } from "react"
import UploadZone from "@/components/UploadZone"

export default function OrgUploadCard({ slug }: { slug: string }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)

  return (
    <UploadZone
      compact
      isAnalyzing={isAnalyzing}
      setIsAnalyzing={setIsAnalyzing}
      fileName={fileName}
      setFileName={setFileName}
      onProjectComplete={(projectId) => {
        window.location.href = `/org/${slug}/project/${projectId}`
      }}
      orgContext={{ slug }}
    />
  )
}
