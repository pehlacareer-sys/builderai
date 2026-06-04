'use client'

import { ProjectFile } from '@/stores/project-store'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Copy, Check, FileCode, Pencil, X, Save, Loader2 } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { toast } from 'sonner'

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
  onSave?: (fileId: string, content: string) => Promise<void>
  hasUnsavedChanges?: boolean
}

export function CodeViewer({ file, onSave, hasUnsavedChanges }: CodeViewerProps) {
  const [copied, setCopied] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [editContent, setEditContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [hasLocalChanges, setHasLocalChanges] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // When file changes, exit edit mode
  useEffect(() => {
    setEditMode(false)
    setEditContent('')
    setHasLocalChanges(false)
  }, [file?.id])

  // When entering edit mode, populate textarea
  useEffect(() => {
    if (editMode && file) {
      setEditContent(file.content)
      setHasLocalChanges(false)
      // Focus textarea after a tick
      setTimeout(() => textareaRef.current?.focus(), 50)
    }
  }, [editMode, file?.id])

  // Track local changes
  useEffect(() => {
    if (editMode && file) {
      setHasLocalChanges(editContent !== file.content)
    }
  }, [editContent, editMode, file])

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
    await navigator.clipboard.writeText(editMode ? editContent : file.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleToggleEdit = () => {
    if (editMode) {
      // Cancel editing
      setEditMode(false)
      setEditContent('')
      setHasLocalChanges(false)
    } else {
      setEditMode(true)
    }
  }

  const handleSave = async () => {
    if (!onSave || !hasLocalChanges) return
    setSaving(true)
    try {
      await onSave(file.id, editContent)
      setEditMode(false)
      setHasLocalChanges(false)
      toast.success('File saved')
    } catch (err) {
      toast.error('Failed to save file')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setEditMode(false)
    setEditContent('')
    setHasLocalChanges(false)
  }

  const showUnsavedDot = hasUnsavedChanges || hasLocalChanges

  return (
    <div className="flex flex-col h-full">
      {/* File Header */}
      <div className="border-b px-4 py-2 flex items-center justify-between bg-muted/30">
        <div className="flex items-center gap-2 min-w-0">
          {showUnsavedDot && (
            <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" title="Unsaved changes" />
          )}
          <FileCode className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <span className="text-sm font-mono truncate">{file.path}</span>
          <Badge variant="secondary" className="text-[10px] px-1.5 flex-shrink-0">
            {language}
          </Badge>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {editMode ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={handleCancel}
                disabled={saving}
              >
                <X className="w-3 h-3 mr-1" />
                Cancel
              </Button>
              <Button
                variant="default"
                size="sm"
                className="h-6 px-2 text-xs bg-emerald-600 hover:bg-emerald-700"
                onClick={handleSave}
                disabled={saving || !hasLocalChanges}
              >
                {saving ? (
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                ) : (
                  <Save className="w-3 h-3 mr-1" />
                )}
                Save
              </Button>
            </>
          ) : (
            <>
              <button
                onClick={handleToggleEdit}
                className="p-1.5 rounded-md hover:bg-muted transition-colors"
                title="Edit file"
              >
                <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
              <button
                onClick={handleCopy}
                className="p-1.5 rounded-md hover:bg-muted transition-colors"
                title="Copy code"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Code Content */}
      {editMode ? (
        <div className="flex-1 overflow-hidden">
          <textarea
            ref={textareaRef}
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="w-full h-full resize-none bg-[#282c34] text-[#abb2bf] font-mono text-[0.8125rem] leading-[1.6] p-4 outline-none border-none focus:ring-0"
            spellCheck={false}
          />
        </div>
      ) : (
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
      )}
    </div>
  )
}
