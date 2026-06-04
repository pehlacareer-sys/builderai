'use client'

import { ProjectFile } from '@/stores/project-store'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Copy, Check, FileCode, Pencil, X, Save, Loader2, ArrowLeft, Search, GitBranch, Replace } from 'lucide-react'
import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { toast } from 'sonner'
import { useIsMobile } from '@/hooks/use-mobile'
import { motion, AnimatePresence } from 'framer-motion'

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

const LANGUAGE_ICON_MAP: Record<string, { icon: React.ElementType; color: string }> = {
  typescript: { icon: FileCode, color: 'text-sky-500' },
  javascript: { icon: FileCode, color: 'text-amber-500' },
  tsx: { icon: FileCode, color: 'text-sky-500' },
  jsx: { icon: FileCode, color: 'text-amber-500' },
  css: { icon: FileCode, color: 'text-purple-500' },
  json: { icon: FileCode, color: 'text-yellow-500' },
  html: { icon: FileCode, color: 'text-orange-500' },
  markdown: { icon: FileCode, color: 'text-gray-500' },
  yaml: { icon: FileCode, color: 'text-rose-500' },
  sql: { icon: FileCode, color: 'text-teal-500' },
  text: { icon: FileCode, color: 'text-muted-foreground' },
}

function getLanguageFromPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() || ''
  return LANGUAGE_MAP[ext] || 'text'
}

// ─── Breadcrumb Path Component ──────────────────────────────────────────────

function BreadcrumbPath({ path, onSegmentClick }: { path: string; onSegmentClick?: (segment: string) => void }) {
  const segments = path.split('/').filter(Boolean)

  return (
    <div className="flex items-center gap-0.5 text-[11px] font-mono overflow-hidden">
      {segments.map((segment, i) => {
        const isLast = i === segments.length - 1
        return (
          <div key={`${segment}-${i}`} className="flex items-center gap-0.5 flex-shrink-0">
            {i > 0 && (
              <span className="text-muted-foreground/40 mx-0.5">/</span>
            )}
            <button
              onClick={() => onSegmentClick?.(segment)}
              className={`hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors truncate max-w-[80px] ${
                isLast ? 'font-medium text-foreground' : 'text-muted-foreground'
              }`}
              title={segment}
            >
              {segment}
            </button>
          </div>
        )
      })}
    </div>
  )
}

// ─── Find & Replace Bar ────────────────────────────────────────────────────

function FindReplaceBar({ content, onClose, onHighlight }: {
  content: string
  onClose: () => void
  onHighlight: (indices: number[]) => void
}) {
  const [findText, setFindText] = useState('')
  const [replaceText, setReplaceText] = useState('')
  const [showReplace, setShowReplace] = useState(false)
  const [currentMatch, setCurrentMatch] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const matches = useMemo(() => {
    if (!findText) return []
    const indices: number[] = []
    const lowerContent = content.toLowerCase()
    const lowerFind = findText.toLowerCase()
    let idx = lowerContent.indexOf(lowerFind)
    while (idx !== -1) {
      indices.push(idx)
      idx = lowerContent.indexOf(lowerFind, idx + 1)
    }
    return indices
  }, [content, findText])

  useEffect(() => {
    onHighlight(matches)
  }, [matches, onHighlight])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -5 }}
      className="border-b bg-muted/30 px-3 py-2"
    >
      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center gap-1.5">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={findText}
              onChange={(e) => { setFindText(e.target.value); setCurrentMatch(0) }}
              placeholder="Find..."
              className="h-7 pl-7 text-xs"
            />
          </div>
          <span className="text-[10px] text-muted-foreground whitespace-nowrap min-w-[40px] text-center">
            {findText ? `${Math.min(currentMatch + 1, matches.length)}/${matches.length}` : '0/0'}
          </span>
          <button
            onClick={() => setShowReplace(!showReplace)}
            className="p-1 rounded hover:bg-muted transition-colors"
            title="Toggle replace"
          >
            <Replace className="w-3 h-3 text-muted-foreground" />
          </button>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-muted transition-colors">
          <X className="w-3 h-3 text-muted-foreground" />
        </button>
      </div>
      {showReplace && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className="mt-1.5 flex items-center gap-1.5"
        >
          <Input
            value={replaceText}
            onChange={(e) => setReplaceText(e.target.value)}
            placeholder="Replace..."
            className="h-7 text-xs flex-1"
          />
          <Button size="sm" variant="secondary" className="h-7 text-[10px] px-2">
            Replace
          </Button>
          <Button size="sm" variant="secondary" className="h-7 text-[10px] px-2">
            All
          </Button>
        </motion.div>
      )}
    </motion.div>
  )
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
  const [showFindReplace, setShowFindReplace] = useState(false)
  const [highlightedLines, setHighlightedLines] = useState<number[]>([])
  const [hoveredLine, setHoveredLine] = useState<number | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const isMobile = useIsMobile()

  // When file changes, exit edit mode
  useEffect(() => {
    setEditMode(false)
    setEditContent('')
    setHasLocalChanges(false)
    setShowFindReplace(false)
  }, [file?.id])

  // When entering edit mode, populate textarea
  useEffect(() => {
    if (editMode && file) {
      setEditContent(file.content)
      setHasLocalChanges(false)
      setTimeout(() => textareaRef.current?.focus(), 50)
    }
  }, [editMode, file?.id])

  // Track local changes
  useEffect(() => {
    if (editMode && file) {
      setHasLocalChanges(editContent !== file.content)
    }
  }, [editContent, editMode, file])

  // Keyboard shortcut for Ctrl+F
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f' && !editMode && file) {
        e.preventDefault()
        setShowFindReplace(true)
      }
      if (e.key === 'Escape' && showFindReplace) {
        setShowFindReplace(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [editMode, file, showFindReplace])

  const handleHighlight = useCallback((indices: number[]) => {
    // Convert character indices to line numbers
    if (!file || indices.length === 0) {
      setHighlightedLines([])
      return
    }
    const lines = file.content.split('\n')
    const lineIndices: number[] = []
    let charIdx = 0
    for (let i = 0; i < lines.length; i++) {
      if (indices.includes(charIdx)) {
        lineIndices.push(i + 1)
      }
      charIdx += lines[i].length + 1
    }
    setHighlightedLines(lineIndices)
  }, [file])

  if (!file) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-6 sm:p-8">
        <FileCode className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground/30 mb-3 animate-float" />
        <h3 className="text-base sm:text-lg font-medium text-muted-foreground">No file selected</h3>
        <p className="text-xs sm:text-sm text-muted-foreground/60 mt-1">
          Select a file from the tree or generate code with AI
        </p>
      </div>
    )
  }

  const language = file.language || getLanguageFromPath(file.path)
  const langConfig = LANGUAGE_ICON_MAP[language] || LANGUAGE_ICON_MAP.text
  const LangIcon = langConfig.icon

  const handleCopy = async () => {
    await navigator.clipboard.writeText(editMode ? editContent : file.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleToggleEdit = () => {
    if (editMode) {
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

  const lineCount = file.content.split('\n').length
  const wordCount = file.content.split(/\s+/).filter(Boolean).length

  return (
    <div className={`flex flex-col h-full ${editMode && isMobile ? 'fixed inset-0 z-50 bg-background' : ''}`}>
      {/* Mobile Edit Mode Top Bar */}
      {editMode && isMobile && (
        <div className="border-b bg-background flex items-center justify-between px-3 h-12 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="h-9 min-h-[44px] text-sm"
            onClick={handleCancel}
            disabled={saving}
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Done
          </Button>
          <div className="flex items-center gap-1">
            {showUnsavedDot && (
              <span className="w-2 h-2 rounded-full bg-amber-500" title="Unsaved changes" />
            )}
            <span className="text-xs font-mono truncate max-w-[150px]">{file.path}</span>
          </div>
          <Button
            variant="default"
            size="sm"
            className="h-9 min-h-[44px] text-sm bg-emerald-600 hover:bg-emerald-700"
            onClick={handleSave}
            disabled={saving || !hasLocalChanges}
          >
            {saving ? (
              <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5 mr-1" />
            )}
            Save
          </Button>
        </div>
      )}

      {/* File Header */}
      {!(editMode && isMobile) && (
        <div className="border-b bg-muted/30">
          {/* Breadcrumb row */}
          <div className="px-3 sm:px-4 py-1.5 flex items-center justify-between">
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
              {showUnsavedDot && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0"
                  title="Unsaved changes"
                />
              )}
              <LangIcon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${langConfig.color} flex-shrink-0`} />
              <BreadcrumbPath path={file.path} />
              <Badge variant="secondary" className="text-[9px] sm:text-[10px] px-1 sm:px-1.5 flex-shrink-0">
                {language}
              </Badge>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {editMode ? (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs hidden sm:flex"
                    onClick={handleCancel}
                    disabled={saving}
                  >
                    <X className="w-3 h-3 mr-1" />
                    Cancel
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    className="h-6 px-2 text-xs bg-emerald-600 hover:bg-emerald-700 hidden sm:flex"
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
                    onClick={() => setShowFindReplace(!showFindReplace)}
                    className="p-1.5 sm:p-2 rounded-md hover:bg-muted transition-colors min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
                    title="Find & Replace (Ctrl+F)"
                  >
                    <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
                  </button>
                  <button
                    onClick={handleToggleEdit}
                    className="p-1.5 sm:p-2 rounded-md hover:bg-muted transition-colors min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
                    title="Edit file"
                  >
                    <Pencil className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
                  </button>
                  <button
                    onClick={handleCopy}
                    className="p-1.5 sm:p-2 rounded-md hover:bg-muted transition-colors min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
                    title="Copy code"
                  >
                    {copied ? (
                      <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
                    )}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Find & Replace Bar */}
          <AnimatePresence>
            {showFindReplace && !editMode && (
              <FindReplaceBar
                content={file.content}
                onClose={() => { setShowFindReplace(false); setHighlightedLines([]) }}
                onHighlight={handleHighlight}
              />
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Code Content */}
      {editMode ? (
        <div className="flex-1 overflow-hidden">
          <textarea
            ref={textareaRef}
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className={`w-full h-full resize-none bg-[#282c34] text-[#abb2bf] font-mono leading-[1.6] p-3 sm:p-4 outline-none border-none focus:ring-0 ${
              isMobile ? 'text-[13px]' : 'text-[0.8125rem]'
            }`}
            spellCheck={false}
          />
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="relative">
            {/* Line highlight overlay */}
            {(hoveredLine !== null || highlightedLines.length > 0) && (
              <div className="absolute inset-0 pointer-events-none" style={{ padding: isMobile ? '0.75rem' : '1rem' }}>
                {/* Highlighted search lines */}
                {highlightedLines.map(lineNum => (
                  <div
                    key={`search-${lineNum}`}
                    className="absolute left-0 right-0 bg-emerald-500/10 dark:bg-emerald-500/5"
                    style={{
                      top: `${(lineNum - 1) * 1.6 * (isMobile ? 12 : 13)}px`,
                      height: `${1.6 * (isMobile ? 12 : 13)}px`,
                    }}
                  />
                ))}
                {/* Hovered line */}
                {hoveredLine !== null && !highlightedLines.includes(hoveredLine) && (
                  <div
                    className="absolute left-0 right-0 bg-muted/20"
                    style={{
                      top: `${(hoveredLine - 1) * 1.6 * (isMobile ? 12 : 13)}px`,
                      height: `${1.6 * (isMobile ? 12 : 13)}px`,
                    }}
                  />
                )}
              </div>
            )}
            <SyntaxHighlighter
              language={language}
              style={oneDark}
              customStyle={{
                margin: 0,
                padding: isMobile ? '0.75rem' : '1rem',
                background: 'transparent',
                fontSize: isMobile ? '12px' : '0.8125rem',
                lineHeight: '1.6',
              }}
              showLineNumbers
              lineNumberStyle={{
                minWidth: isMobile ? '2em' : '3em',
                paddingRight: '1em',
                color: '#6b7280',
                userSelect: 'none',
                fontSize: isMobile ? '10px' : undefined,
              }}
              wrapLines
              wrapLongLines
              lineNumberContainerStyle={{
                // We handle line hover via the overlay above
              }}
            >
              {file.content}
            </SyntaxHighlighter>
          </div>
        </ScrollArea>
      )}

      {/* Footer bar with git-like status */}
      {!(editMode && isMobile) && (
        <div className="border-t px-3 py-1 flex items-center justify-between bg-muted/30 text-[10px] text-muted-foreground flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <LangIcon className={`w-2.5 h-2.5 ${langConfig.color}`} />
              {language.toUpperCase()}
            </span>
            <span>Ln {lineCount}</span>
            <span className="hidden sm:inline">{wordCount} words</span>
          </div>
          <div className="flex items-center gap-3">
            {showUnsavedDot && (
              <span className="flex items-center gap-1 text-amber-500">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                Modified
              </span>
            )}
            <span className="flex items-center gap-1">
              <GitBranch className="w-2.5 h-2.5" />
              main
            </span>
            <span>UTF-8</span>
          </div>
        </div>
      )}
    </div>
  )
}
