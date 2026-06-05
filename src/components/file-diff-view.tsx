'use client'

import { useState, useMemo } from 'react'
import { diffLines } from 'diff'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Columns2, Rows3, Check, X, FileCode,
  ChevronRight, CheckCircle2, XCircle, ArrowLeft, ArrowRight,
} from 'lucide-react'
import { toast } from 'sonner'

// ─── Diff Utilities ─────────────────────────────────────────────────────

export interface FileDiff {
  path: string
  oldContent: string
  newContent: string
  language?: string
}

interface DiffLine {
  type: 'add' | 'remove' | 'unchanged'
  oldLineNum?: number
  newLineNum?: number
  content: string
}

function computeDiff(oldContent: string, newContent: string): DiffLine[] {
  const changes = diffLines(oldContent, newContent)
  const lines: DiffLine[] = []
  let oldLine = 1
  let newLine = 1

  for (const change of changes) {
    const changeLines = change.value.replace(/\n$/, '').split('\n')
    for (const line of changeLines) {
      if (line === '' && change.value === '') continue
      if (change.added) {
        lines.push({ type: 'add', newLineNum: newLine++, content: line })
      } else if (change.removed) {
        lines.push({ type: 'remove', oldLineNum: oldLine++, content: line })
      } else {
        lines.push({ type: 'unchanged', oldLineNum: oldLine++, newLineNum: newLine++, content: line })
      }
    }
  }

  return lines
}

function getDiffStats(lines: DiffLine[]): { additions: number; deletions: number } {
  let additions = 0
  let deletions = 0
  for (const line of lines) {
    if (line.type === 'add') additions++
    if (line.type === 'remove') deletions++
  }
  return { additions, deletions }
}

// ─── Unified Diff View ──────────────────────────────────────────────────

function UnifiedDiffView({ lines }: { lines: DiffLine[] }) {
  return (
    <div className="font-mono text-xs leading-5">
      {lines.map((line, i) => (
        <div
          key={i}
          className={`flex ${
            line.type === 'add'
              ? 'bg-emerald-500/10'
              : line.type === 'remove'
              ? 'bg-red-500/10'
              : ''
          }`}
        >
          <span className="w-12 flex-shrink-0 text-right pr-2 text-muted-foreground/50 select-none border-r border-border/30">
            {line.oldLineNum ?? ''}
          </span>
          <span className="w-12 flex-shrink-0 text-right pr-2 text-muted-foreground/50 select-none border-r border-border/30">
            {line.newLineNum ?? ''}
          </span>
          <span
            className={`w-5 flex-shrink-0 text-center select-none ${
              line.type === 'add'
                ? 'text-emerald-500'
                : line.type === 'remove'
                ? 'text-red-500'
                : 'text-transparent'
            }`}
          >
            {line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '}
          </span>
          <span
            className={`flex-1 pl-1 whitespace-pre-wrap break-all ${
              line.type === 'add'
                ? 'text-emerald-400'
                : line.type === 'remove'
                ? 'text-red-400'
                : 'text-foreground/80'
            }`}
          >
            {line.content}
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── Split Diff View ────────────────────────────────────────────────────

function SplitDiffView({ lines }: { lines: DiffLine[] }) {
  // Build paired lines for split view
  const pairs: Array<{
    left: DiffLine | null
    right: DiffLine | null
  }> = []

  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (line.type === 'unchanged') {
      pairs.push({ left: line, right: line })
      i++
    } else if (line.type === 'remove') {
      // Collect consecutive removals
      const removals: DiffLine[] = []
      while (i < lines.length && lines[i].type === 'remove') {
        removals.push(lines[i])
        i++
      }
      // Collect consecutive additions
      const additions: DiffLine[] = []
      while (i < lines.length && lines[i].type === 'add') {
        additions.push(lines[i])
        i++
      }
      // Pair them up
      const maxLen = Math.max(removals.length, additions.length)
      for (let j = 0; j < maxLen; j++) {
        pairs.push({
          left: j < removals.length ? removals[j] : null,
          right: j < additions.length ? additions[j] : null,
        })
      }
    } else if (line.type === 'add') {
      pairs.push({ left: null, right: line })
      i++
    } else {
      i++
    }
  }

  return (
    <div className="font-mono text-xs leading-5">
      {pairs.map((pair, idx) => (
        <div key={idx} className="flex">
          {/* Left side (old) */}
          <div className="flex-1 flex min-w-0 border-r border-border/30">
            <span className="w-12 flex-shrink-0 text-right pr-2 text-muted-foreground/50 select-none">
              {pair.left?.oldLineNum ?? ''}
            </span>
            <span
              className={`w-5 flex-shrink-0 text-center select-none ${
                pair.left?.type === 'remove' ? 'text-red-500' : 'text-transparent'
              }`}
            >
              {pair.left?.type === 'remove' ? '-' : ' '}
            </span>
            <span
              className={`flex-1 pl-1 whitespace-pre-wrap break-all ${
                pair.left?.type === 'remove'
                  ? 'bg-red-500/10 text-red-400'
                  : 'text-foreground/80'
              }`}
            >
              {pair.left?.content ?? ''}
            </span>
          </div>
          {/* Right side (new) */}
          <div className="flex-1 flex min-w-0">
            <span className="w-12 flex-shrink-0 text-right pr-2 text-muted-foreground/50 select-none">
              {pair.right?.newLineNum ?? ''}
            </span>
            <span
              className={`w-5 flex-shrink-0 text-center select-none ${
                pair.right?.type === 'add' ? 'text-emerald-500' : 'text-transparent'
              }`}
            >
              {pair.right?.type === 'add' ? '+' : ' '}
            </span>
            <span
              className={`flex-1 pl-1 whitespace-pre-wrap break-all ${
                pair.right?.type === 'add'
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'text-foreground/80'
              }`}
            >
              {pair.right?.content ?? ''}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Single File Diff View ──────────────────────────────────────────────

export function FileDiffView({
  fileDiff,
  viewMode = 'unified',
  onAccept,
  onReject,
  accepted,
  rejected,
}: {
  fileDiff: FileDiff
  viewMode?: 'unified' | 'split'
  onAccept?: () => void
  onReject?: () => void
  accepted?: boolean
  rejected?: boolean
}) {
  const lines = useMemo(() => computeDiff(fileDiff.oldContent, fileDiff.newContent), [fileDiff])
  const stats = useMemo(() => getDiffStats(lines), [lines])
  const isModified = fileDiff.oldContent !== fileDiff.newContent
  const isNewFile = fileDiff.oldContent === ''
  const isDeleted = fileDiff.newContent === ''

  return (
    <div className="flex flex-col h-full">
      {/* File Header */}
      <div className="border-b px-3 py-2 flex items-center justify-between bg-muted/30 flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <FileCode className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          <span className="text-xs font-mono truncate">{fileDiff.path}</span>
          {isNewFile && (
            <Badge className="text-[9px] px-1.5 py-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
              NEW
            </Badge>
          )}
          {isDeleted && (
            <Badge className="text-[9px] px-1.5 py-0 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
              DELETED
            </Badge>
          )}
          {isModified && !isNewFile && !isDeleted && (
            <Badge className="text-[9px] px-1.5 py-0 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              MODIFIED
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Stats */}
          <div className="flex items-center gap-1.5 text-[10px]">
            <span className="text-emerald-500 font-medium">+{stats.additions}</span>
            <span className="text-red-500 font-medium">-{stats.deletions}</span>
          </div>
          {/* Accept/Reject buttons */}
          {onAccept && onReject && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className={`h-6 text-[10px] px-2 ${accepted ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : ''}`}
                onClick={onAccept}
                disabled={rejected}
              >
                <Check className="w-3 h-3 mr-0.5" />
                Accept
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={`h-6 text-[10px] px-2 ${rejected ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : ''}`}
                onClick={onReject}
                disabled={accepted}
              >
                <X className="w-3 h-3 mr-0.5" />
                Reject
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Diff Content */}
      <ScrollArea className="flex-1">
        <div className="min-w-0">
          {viewMode === 'unified' ? (
            <UnifiedDiffView lines={lines} />
          ) : (
            <SplitDiffView lines={lines} />
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

// ─── Diff Dialog ────────────────────────────────────────────────────────

interface DiffDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  fileDiffs: FileDiff[]
  onAcceptAll: (acceptedPaths: string[]) => void
  onRejectAll?: () => void
}

export function DiffDialog({
  open,
  onOpenChange,
  fileDiffs,
  onAcceptAll,
  onRejectAll,
}: DiffDialogProps) {
  const [viewMode, setViewMode] = useState<'unified' | 'split'>('unified')
  const [activeFileIdx, setActiveFileIdx] = useState(0)
  const [fileStates, setFileStates] = useState<Record<string, 'accepted' | 'rejected' | 'pending'>>({})

  // Reset states when dialog opens
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      const states: Record<string, 'accepted' | 'rejected' | 'pending'> = {}
      for (const f of fileDiffs) {
        states[f.path] = 'pending'
      }
      setFileStates(states)
      setActiveFileIdx(0)
    }
    onOpenChange(newOpen)
  }

  const handleAcceptFile = (path: string) => {
    setFileStates(prev => ({ ...prev, [path]: 'accepted' }))
  }

  const handleRejectFile = (path: string) => {
    setFileStates(prev => ({ ...prev, [path]: 'rejected' }))
  }

  const handleAcceptAll = () => {
    const acceptedPaths = fileDiffs
      .filter(f => fileStates[f.path] !== 'rejected')
      .map(f => f.path)
    // Mark all non-rejected as accepted
    const newStates = { ...fileStates }
    for (const f of fileDiffs) {
      if (newStates[f.path] !== 'rejected') {
        newStates[f.path] = 'accepted'
      }
    }
    setFileStates(newStates)
    onAcceptAll(acceptedPaths)
    onOpenChange(false)
    toast.success(`Accepted ${acceptedPaths.length} file change${acceptedPaths.length !== 1 ? 's' : ''}`)
  }

  const handleRejectAll = () => {
    const newStates = { ...fileStates }
    for (const f of fileDiffs) {
      newStates[f.path] = 'rejected'
    }
    setFileStates(newStates)
    onRejectAll?.()
    onOpenChange(false)
    toast.info('All changes rejected')
  }

  const pendingCount = Object.values(fileStates).filter(s => s === 'pending').length
  const acceptedCount = Object.values(fileStates).filter(s => s === 'accepted').length
  const rejectedCount = Object.values(fileStates).filter(s => s === 'rejected').length

  const activeFile = fileDiffs[activeFileIdx]

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-[90vw] lg:max-w-[1200px] h-[85vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-4 py-3 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2 text-sm">
                Review Changes
                <Badge variant="secondary" className="text-[10px] px-1.5">
                  {fileDiffs.length} file{fileDiffs.length !== 1 ? 's' : ''}
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-[11px] mt-0.5">
                Review and accept or reject the AI-generated file changes
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              {/* View Mode Toggle */}
              <div className="flex items-center border rounded-md overflow-hidden">
                <Button
                  variant={viewMode === 'unified' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-7 text-[10px] px-2 rounded-none"
                  onClick={() => setViewMode('unified')}
                >
                  <Rows3 className="w-3 h-3 mr-1" />
                  Unified
                </Button>
                <Button
                  variant={viewMode === 'split' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-7 text-[10px] px-2 rounded-none"
                  onClick={() => setViewMode('split')}
                >
                  <Columns2 className="w-3 h-3 mr-1" />
                  Split
                </Button>
              </div>
              {/* Summary */}
              <div className="flex items-center gap-1.5 text-[10px]">
                {acceptedCount > 0 && (
                  <span className="flex items-center gap-0.5 text-emerald-500">
                    <CheckCircle2 className="w-3 h-3" />
                    {acceptedCount}
                  </span>
                )}
                {rejectedCount > 0 && (
                  <span className="flex items-center gap-0.5 text-red-500">
                    <XCircle className="w-3 h-3" />
                    {rejectedCount}
                  </span>
                )}
                {pendingCount > 0 && (
                  <span className="text-muted-foreground">{pendingCount} pending</span>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Body: File tabs + Diff content */}
        <div className="flex flex-1 overflow-hidden">
          {/* File tabs sidebar */}
          <div className="w-56 border-r flex-shrink-0 flex flex-col">
            <div className="px-3 py-2 border-b text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              Changed Files
            </div>
            <ScrollArea className="flex-1">
              <div className="p-1.5 space-y-0.5">
                {fileDiffs.map((file, idx) => {
                  const state = fileStates[file.path]
                  const isActive = idx === activeFileIdx
                  const lines = computeDiff(file.oldContent, file.newContent)
                  const stats = getDiffStats(lines)

                  return (
                    <button
                      key={file.path}
                      onClick={() => setActiveFileIdx(idx)}
                      className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-left transition-colors text-xs ${
                        isActive
                          ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-200'
                          : 'hover:bg-muted/50 text-foreground'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          {state === 'accepted' ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                          ) : state === 'rejected' ? (
                            <XCircle className="w-3 h-3 text-red-500 flex-shrink-0" />
                          ) : (
                            <FileCode className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                          )}
                          <span className="font-mono truncate text-[11px]">
                            {file.path.split('/').pop()}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[9px] text-muted-foreground pl-[18px]">
                          <span className="text-emerald-500">+{stats.additions}</span>
                          <span className="text-red-500">-{stats.deletions}</span>
                        </div>
                      </div>
                      {isActive && (
                        <ChevronRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                      )}
                    </button>
                  )
                })}
              </div>
            </ScrollArea>
          </div>

          {/* Diff content */}
          <div className="flex-1 overflow-hidden">
            {activeFile && (
              <FileDiffView
                fileDiff={activeFile}
                viewMode={viewMode}
                onAccept={() => handleAcceptFile(activeFile.path)}
                onReject={() => handleRejectFile(activeFile.path)}
                accepted={fileStates[activeFile.path] === 'accepted'}
                rejected={fileStates[activeFile.path] === 'rejected'}
              />
            )}
          </div>
        </div>

        {/* Footer: Navigation + Action buttons */}
        <div className="border-t px-4 py-2.5 flex items-center justify-between flex-shrink-0 bg-muted/30">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[10px]"
              onClick={() => setActiveFileIdx(Math.max(0, activeFileIdx - 1))}
              disabled={activeFileIdx === 0}
            >
              <ArrowLeft className="w-3 h-3 mr-1" />
              Previous
            </Button>
            <span className="text-[10px] text-muted-foreground">
              {activeFileIdx + 1} / {fileDiffs.length}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[10px]"
              onClick={() => setActiveFileIdx(Math.min(fileDiffs.length - 1, activeFileIdx + 1))}
              disabled={activeFileIdx === fileDiffs.length - 1}
            >
              Next
              <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[10px]"
              onClick={handleRejectAll}
            >
              <X className="w-3 h-3 mr-1" />
              Reject All
            </Button>
            <Button
              size="sm"
              className="h-7 text-[10px] bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white"
              onClick={handleAcceptAll}
              disabled={acceptedCount + rejectedCount === fileDiffs.length && acceptedCount === 0}
            >
              <Check className="w-3 h-3 mr-1" />
              Accept All
              {pendingCount > 0 && (
                <Badge variant="secondary" className="ml-1 text-[8px] px-1 py-0 bg-emerald-400/20 text-emerald-100">
                  {fileDiffs.filter(f => fileStates[f.path] !== 'rejected').length}
                </Badge>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
