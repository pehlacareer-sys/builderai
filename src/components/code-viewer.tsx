'use client'

import { ProjectFile } from '@/stores/project-store'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Copy, Check, FileCode, Pencil, X, Save, Loader2, ArrowLeft, Search, GitBranch, Replace, Hash, Eye, Navigation, Wrench } from 'lucide-react'
import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { toast } from 'sonner'
import { useIsMobile } from '@/hooks/use-mobile'
import { motion, AnimatePresence } from 'framer-motion'
import { getLanguageFromPath } from '@/lib/file-utils'

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

// Bracket pair colors for visual colorization
const BRACKET_COLORS = [
  '#ffd700', // gold
  '#da70d6', // orchid
  '#179fff', // deep sky blue
  '#10b981', // emerald
  '#ef4444', // red
]

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
      initial={{ opacity: 0, y: -8, height: 0 }}
      animate={{ opacity: 1, y: 0, height: 'auto' }}
      exit={{ opacity: 0, y: -8, height: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="border-b bg-muted/30 px-3 py-2 overflow-hidden"
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

// ─── Go To Line Dialog ────────────────────────────────────────────────────

function GoToLineDialog({ maxLine, onGoToLine, onClose }: {
  maxLine: number
  onGoToLine: (line: number) => void
  onClose: () => void
}) {
  const [lineInput, setLineInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const line = parseInt(lineInput, 10)
    if (line >= 1 && line <= maxLine) {
      onGoToLine(line)
      onClose()
    } else {
      toast.error(`Line must be between 1 and ${maxLine}`)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -5 }}
      className="absolute top-2 left-1/2 -translate-x-1/2 z-30 glass-card rounded-lg shadow-lg border border-border/50 px-3 py-2 flex items-center gap-2"
    >
      <Hash className="w-3.5 h-3.5 text-muted-foreground" />
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <Input
          ref={inputRef}
          value={lineInput}
          onChange={(e) => setLineInput(e.target.value)}
          placeholder={`1-${maxLine}`}
          className="h-7 w-24 text-xs"
          type="number"
          min={1}
          max={maxLine}
        />
        <Button type="submit" size="sm" variant="secondary" className="h-7 text-[10px] px-2">
          Go
        </Button>
      </form>
      <button onClick={onClose} className="p-1 rounded hover:bg-muted transition-colors">
        <X className="w-3 h-3 text-muted-foreground" />
      </button>
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
  const [editingLine, setEditingLine] = useState<number | null>(null)
  const [showGoToLine, setShowGoToLine] = useState(false)
  const [cursorLine, setCursorLine] = useState<number | null>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; word: string } | null>(null)
  const [hoveredLineNum, setHoveredLineNum] = useState<number | null>(null)
  const [miniMapTooltip, setMiniMapTooltip] = useState<{ y: number; lineRange: string } | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const codeRef = useRef<HTMLDivElement>(null)
  const isMobile = useIsMobile()

  // When file changes, exit edit mode
  useEffect(() => {
    setEditMode(false)
    setEditContent('')
    setHasLocalChanges(false)
    setShowFindReplace(false)
    setShowGoToLine(false)
    setEditingLine(null)
    setCursorLine(null)
    setContextMenu(null)
    setHoveredLineNum(null)
    setMiniMapTooltip(null)
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

  // Keyboard shortcuts for Ctrl+F and Ctrl+G
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f' && !editMode && file) {
        e.preventDefault()
        setShowFindReplace(true)
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'g' && !editMode && file) {
        e.preventDefault()
        setShowGoToLine(true)
      }
      if (e.key === 'Escape') {
        if (showFindReplace) {
          setShowFindReplace(false)
          setHighlightedLines([])
        }
        if (showGoToLine) setShowGoToLine(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [editMode, file, showFindReplace, showGoToLine])

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

  // Go to line handler
  const handleGoToLine = useCallback((lineNum: number) => {
    if (!codeRef.current) return
    // Scroll to the line in the code area
    const lineHeight = isMobile ? 12 * 1.6 : 13 * 1.6
    const scrollTarget = (lineNum - 1) * lineHeight
    codeRef.current.scrollTop = scrollTarget - 50
    setCursorLine(lineNum)
    // Clear cursor line after 3 seconds
    setTimeout(() => setCursorLine(null), 3000)
  }, [isMobile])

  // Track cursor line in edit mode
  const handleTextareaCursorChange = useCallback(() => {
    if (!textareaRef.current) return
    const textarea = textareaRef.current
    const textBeforeCursor = textarea.value.substring(0, textarea.selectionStart)
    const currentLine = textBeforeCursor.split('\n').length
    setEditingLine(currentLine)
  }, [])

  // Compute indentation guides data (must be before early return)
  const fileContent = file?.content || ''
  const indentGuides = useMemo(() => {
    const lines = fileContent.split('\n')
    const maxIndent = Math.max(
      ...lines.slice(0, 200).map(line => {
        const match = line.match(/^(\s*)/)
        return match ? Math.floor(match[1].length / 2) : 0
      }),
      0
    )
    return Array.from({ length: Math.min(maxIndent, 8) }, (_, i) => i + 1)
  }, [fileContent])

  // Compute bracket colorization for display (must be before early return)
  const bracketColorMap = useMemo(() => {
    const content = fileContent
    const stack: { char: string; pos: number; depth: number }[] = []
    const colorMap = new Map<number, number>()

    for (let i = 0; i < content.length; i++) {
      const char = content[i]
      if (char === '(' || char === '[' || char === '{') {
        const depth = stack.length
        stack.push({ char, pos: i, depth })
        colorMap.set(i, depth % BRACKET_COLORS.length)
      } else if (char === ')' || char === ']' || char === '}') {
        const opening = stack.pop()
        if (opening) {
          colorMap.set(i, opening.depth % BRACKET_COLORS.length)
        }
      }
    }
    return colorMap
  }, [fileContent])

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
      setEditingLine(null)
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
      setEditingLine(null)
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
    setEditingLine(null)
  }

  const showUnsavedDot = hasUnsavedChanges || hasLocalChanges

  const lineCount = file.content.split('\n').length
  const wordCount = file.content.split(/\s+/).filter(Boolean).length

  // Line height for calculations
  const lineHeight = isMobile ? 12 * 1.6 : 13 * 1.6

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
            {editingLine && (
              <Badge variant="secondary" className="text-[9px] px-1 h-4">
                Ln {editingLine}
              </Badge>
            )}
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
                    onClick={() => setShowGoToLine(true)}
                    className="p-1.5 sm:p-2 rounded-md hover:bg-muted transition-colors min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
                    title="Go to Line (Ctrl+G)"
                  >
                    <Hash className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
                  </button>
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
        <div className="flex-1 overflow-hidden relative">
          {/* Editing line indicator */}
          {editingLine && (
            <div className="absolute top-0 left-0 right-0 z-10 pointer-events-none">
              <div
                className="bg-emerald-500/10 dark:bg-emerald-500/5 border-l-2 border-emerald-500"
                style={{
                  top: `${(editingLine - 1) * lineHeight}px`,
                  height: `${lineHeight}px`,
                  position: 'absolute',
                  left: 0,
                  right: 0,
                }}
              />
            </div>
          )}
          <textarea
            ref={textareaRef}
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            onKeyUp={handleTextareaCursorChange}
            onClick={handleTextareaCursorChange}
            className={`w-full h-full resize-none bg-[#282c34] text-[#abb2bf] font-mono leading-[1.6] p-3 sm:p-4 outline-none border-none focus:ring-0 edit-glow-border rounded-none ${
              isMobile ? 'text-[13px]' : 'text-[0.8125rem]'
            }`}
            spellCheck={false}
          />
        </div>
      ) : (
        <ScrollArea className="flex-1 relative">
          {/* Code fade overlays */}
          <div className="code-fade-overlay-top" />
          <div className="code-fade-overlay-bottom" />
          <div className={`relative ${editMode ? '' : ''}`} ref={codeRef}>
            {/* Indentation guides overlay */}
            {indentGuides.length > 0 && (
              <div className="absolute inset-0 pointer-events-none" style={{ padding: isMobile ? '0.75rem' : '1rem' }}>
                {indentGuides.map((indent) => (
                  <div
                    key={`indent-${indent}`}
                    className="absolute top-0 bottom-0 border-l border-emerald-500/5 dark:border-emerald-500/3"
                    style={{
                      left: `${indent * 2}ch`,
                    }}
                  />
                ))}
              </div>
            )}
            {/* Line highlight overlay */}
            {(hoveredLine !== null || highlightedLines.length > 0 || cursorLine !== null) && (
              <div className="absolute inset-0 pointer-events-none" style={{ padding: isMobile ? '0.75rem' : '1rem' }}>
                {/* Highlighted search lines */}
                {highlightedLines.map(lineNum => (
                  <div
                    key={`search-${lineNum}`}
                    className="absolute left-0 right-0 bg-emerald-500/10 dark:bg-emerald-500/5"
                    style={{
                      top: `${(lineNum - 1) * lineHeight}px`,
                      height: `${lineHeight}px`,
                    }}
                  />
                ))}
                {/* Cursor line (from Go To Line) */}
                {cursorLine !== null && !highlightedLines.includes(cursorLine) && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute left-0 right-0 bg-emerald-500/15 dark:bg-emerald-500/8 border-l-2 border-emerald-500"
                    style={{
                      top: `${(cursorLine - 1) * lineHeight}px`,
                      height: `${lineHeight}px`,
                    }}
                  />
                )}
                {/* Hovered line number highlight */}
                {hoveredLineNum !== null && !highlightedLines.includes(hoveredLineNum) && hoveredLineNum !== cursorLine && (
                  <div
                    className="absolute left-0 right-0 bg-emerald-500/[0.04] dark:bg-emerald-500/[0.02]"
                    style={{
                      top: `${(hoveredLineNum - 1) * lineHeight}px`,
                      height: `${lineHeight}px`,
                    }}
                  />
                )}
                {/* Hovered line (original) */}
                {hoveredLine !== null && !highlightedLines.includes(hoveredLine) && hoveredLine !== cursorLine && hoveredLine !== hoveredLineNum && (
                  <div
                    className="absolute left-0 right-0 bg-muted/20"
                    style={{
                      top: `${(hoveredLine - 1) * lineHeight}px`,
                      height: `${lineHeight}px`,
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
                cursor: 'pointer',
              }}
              wrapLines
              wrapLongLines
              lineNumberContainerStyle={{}}
              onContextMenu={(e) => {
                e.preventDefault()
                const selection = window.getSelection()
                const word = selection?.toString() || ''
                setContextMenu({ x: e.clientX, y: e.clientY, word })
              }}
              onMouseLeave={() => setContextMenu(null)}
            >
              {file.content}
            </SyntaxHighlighter>

            {/* Line number hover tracking */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ padding: isMobile ? '0.75rem' : '1rem' }}
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect()
                const y = e.clientY - rect.top - (isMobile ? 12 : 16)
                const lineNum = Math.floor(y / lineHeight) + 1
                if (lineNum >= 1 && lineNum <= lineCount) {
                  setHoveredLineNum(lineNum)
                }
              }}
              onMouseLeave={() => setHoveredLineNum(null)}
            />

            {/* Right-click Context Menu */}
            {contextMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute z-50 glass-effect rounded-lg py-1 shadow-lg min-w-[180px]"
                style={{
                  left: Math.min(contextMenu.x - (codeRef.current?.getBoundingClientRect().left || 0), 300),
                  top: Math.min(contextMenu.y - (codeRef.current?.getBoundingClientRect().top || 0), 400),
                }}
              >
                <button
                  onClick={() => { toast.info('Go to Definition coming soon!'); setContextMenu(null) }}
                  className="flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-colors text-left"
                >
                  <Navigation className="w-3 h-3 text-emerald-500" />
                  Go to Definition
                </button>
                <button
                  onClick={() => { toast.info('Find References coming soon!'); setContextMenu(null) }}
                  className="flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-colors text-left"
                >
                  <Search className="w-3 h-3 text-teal-500" />
                  Find References
                </button>
                <button
                  onClick={() => { toast.info('Rename coming soon!'); setContextMenu(null) }}
                  className="flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-colors text-left"
                >
                  <Wrench className="w-3 h-3 text-amber-500" />
                  Rename
                </button>
                {contextMenu.word && (
                  <div className="px-3 py-1 border-t border-border/30 mt-1 pt-1.5">
                    <span className="text-[10px] text-muted-foreground">Selected: </span>
                    <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">{contextMenu.word}</span>
                  </div>
                )}
              </motion.div>
            )}

            {/* Mini-map Tooltip */}
            <div
              className="absolute right-0 top-0 bottom-0 w-3 bg-muted/20 cursor-pointer z-20"
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect()
                const y = e.clientY - rect.top
                const ratio = y / rect.height
                const startLine = Math.max(1, Math.floor(ratio * lineCount))
                const endLine = Math.min(lineCount, startLine + Math.ceil(rect.height / lineHeight))
                setMiniMapTooltip({ y: e.clientY - (codeRef.current?.getBoundingClientRect().top || 0), lineRange: `Lines ${startLine}-${endLine}` })
              }}
              onMouseLeave={() => setMiniMapTooltip(null)}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect()
                const y = e.clientY - rect.top
                const ratio = y / rect.height
                const targetLine = Math.max(1, Math.floor(ratio * lineCount))
                handleGoToLine(targetLine)
              }}
            >
              {/* Mini-map content representation */}
              <div className="absolute inset-0.5 space-y-px overflow-hidden opacity-30">
                {Array.from({ length: Math.min(lineCount, 60) }).map((_, i) => (
                  <div
                    key={i}
                    className="h-px bg-muted-foreground/30 rounded"
                    style={{ width: `${20 + Math.random() * 60}%` }}
                  />
                ))}
              </div>
            </div>
            {miniMapTooltip && (
              <div
                className="absolute right-4 z-30 px-2 py-1 rounded-md bg-popover text-popover-foreground border border-border/50 shadow-md text-[10px] font-mono pointer-events-none"
                style={{ top: miniMapTooltip.y - 8 }}
              >
                {miniMapTooltip.lineRange}
              </div>
            )}
          </div>

          {/* Go To Line Dialog */}
          <AnimatePresence>
            {showGoToLine && (
              <GoToLineDialog
                maxLine={lineCount}
                onGoToLine={handleGoToLine}
                onClose={() => setShowGoToLine(false)}
              />
            )}
          </AnimatePresence>
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
            {editMode && editingLine && (
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <span className="w-1 h-1 rounded-full bg-emerald-500" />
                Editing Ln {editingLine}
              </span>
            )}
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
