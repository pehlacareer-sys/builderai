'use client'

import { ProjectFile } from '@/stores/project-store'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Copy, Check, FileCode } from 'lucide-react'
import { useState } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'

const LANGUAGE_MAP: Record<string, string> = {
  typescript: 'typescript',
  javascript: 'javascript',
  jsx: 'jsx',
  tsx: 'tsx',
  css: 'css',
  json: 'json',
  html: 'html',
  markdown: 'markdown',
  yaml: 'yaml',
  prisma: 'typescript',
  sql: 'sql',
  plaintext: 'text',
}

function getLanguageFromPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() || ''
  return LANGUAGE_MAP[ext] || 'text'
}

interface CodeViewerProps {
  file: ProjectFile | null
}

export function CodeViewer({ file }: CodeViewerProps) {
  const [copied, setCopied] = useState(false)

  if (!file) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <FileCode className="w-12 h-12 text-muted-foreground/30 mb-3" />
        <h3 className="text-lg font-medium text-muted-foreground">No file selected</h3>
        <p className="text-sm text-muted-foreground/60 mt-1">
          Select a file from the tree or generate code with AI
        </p>
      </div>
    )
  }

  const language = file.language || getLanguageFromPath(file.path)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(file.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col h-full">
      {/* File Header */}
      <div className="border-b px-4 py-2 flex items-center justify-between bg-muted/30">
        <div className="flex items-center gap-2 min-w-0">
          <FileCode className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <span className="text-sm font-mono truncate">{file.path}</span>
          <Badge variant="secondary" className="text-[10px] px-1.5 flex-shrink-0">
            {language}
          </Badge>
        </div>
        <button
          onClick={handleCopy}
          className="p-1.5 rounded-md hover:bg-muted transition-colors flex-shrink-0"
          title="Copy code"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-emerald-500" />
          ) : (
            <Copy className="w-3.5 h-3.5 text-muted-foreground" />
          )}
        </button>
      </div>

      {/* Code Content */}
      <ScrollArea className="flex-1">
        <div className="relative">
          <SyntaxHighlighter
            language={language}
            style={oneDark}
            customStyle={{
              margin: 0,
              padding: '1rem',
              background: 'transparent',
              fontSize: '0.8125rem',
              lineHeight: '1.6',
            }}
            showLineNumbers
            lineNumberStyle={{
              minWidth: '3em',
              paddingRight: '1em',
              color: '#6b7280',
              userSelect: 'none',
            }}
            wrapLines
            wrapLongLines
          >
            {file.content}
          </SyntaxHighlighter>
        </div>
      </ScrollArea>
    </div>
  )
}
