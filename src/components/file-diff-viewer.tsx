'use client'

import { useState, useMemo } from 'react'
import { FileCode, ChevronDown, X, Check, Columns2, Rows3, CheckCircle2, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'

// ─── Types ──────────────────────────────────────────────────────────────

interface DiffLine {
  type: 'added' | 'removed' | 'unchanged'
  content: string
  lineNumberOld?: number
  lineNumberNew?: number
}

export interface FileDiff {
  path: string
  language: string
  oldContent: string | null  // null means new file
  newContent: string | null  // null means deleted file
}

interface FileDiffViewerProps {
  diffs: FileDiff[]
  onAccept?: (path: string) => void
  onReject?: (path: string) => void
  onClose?: () => void
}

// ─── Diff Algorithm ─────────────────────────────────────────────────────

export function computeDiff(oldContent: string | null, newContent: string | null): DiffLine[] {
  if (oldContent === null && newContent === null) return []

  if (oldContent === null) {
    // New file - all lines are added
    return (newContent || '').split('\n').map((line, i) => ({
      type: 'added' as const,
      content: line,
      lineNumberNew: i + 1,
    }))
  }

  if (newContent === null) {
    // Deleted file - all lines are removed
    return oldContent.split('\n').map((line, i) => ({
      type: 'removed' as const,
      content: line,
      lineNumberOld: i + 1,
    }))
  }

  const oldLines = oldContent.split('\n')
  const newLines = newContent.split('\n')
  const result: DiffLine[] = []

  // Find common prefix
  let prefixLen = 0
  while (
    prefixLen < oldLines.length &&
    prefixLen < newLines.length &&
    oldLines[prefixLen] === newLines[prefixLen]
  ) {
    result.push({
      type: 'unchanged',
      content: oldLines[prefixLen],
      lineNumberOld: prefixLen + 1,
      lineNumberNew: prefixLen + 1,
    })
    prefixLen++
  }

  // Find common suffix
  let suffixLen = 0
  while (
    suffixLen < oldLines.length - prefixLen &&
    suffixLen < newLines.length - prefixLen &&
    oldLines[oldLines.length - 1 - suffixLen] === newLines[newLines.length - 1 - suffixLen]
  ) {
    suffixLen++
  }

  // Removed lines (middle of old)
  for (let i = prefixLen; i < oldLines.length - suffixLen; i++) {
    result.push({
      type: 'removed',
      content: oldLines[i],
      lineNumberOld: i + 1,
    })
  }

  // Added lines (middle of new)
  for (let i = prefixLen; i < newLines.length - suffixLen; i++) {
    result.push({
      type: 'added',
      content: newLines[i],
      lineNumberNew: i + 1,
    })
  }

  // Suffix (unchanged)
  for (let i = 0; i < suffixLen; i++) {
    const oldIdx = oldLines.length - suffixLen + i
    const newIdx = newLines.length - suffixLen + i
    result.push({
      type: 'unchanged',
      content: oldLines[oldIdx],
      lineNumberOld: oldIdx + 1,
      lineNumberNew: newIdx + 1,
    })
  }

  return result
}

// ─── Utility ────────────────────────────────────────────────────────────

function getDiffStats(lines: DiffLine[]): { additions: number; deletions: number } {
  let additions = 0
  let deletions = 0
  for (const line of lines) {
    if (line.type === 'added') additions++
    if (line.type === 'removed') deletions++
  }
  return { additions, deletions }
}

function getLanguageColor(language: string): string {
  const colors: Record<string, string> = {
    typescript: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
    javascript: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    tsx: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
    jsx: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    css: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    html: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    json: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    markdown: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
    python: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    rust: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  }
  return colors[language.toLowerCase()] || 'bg-muted text-muted-foreground'
}

// ─── Unified Diff View ──────────────────────────────────────────────────

function UnifiedDiffView({ lines }: { lines: DiffLine[] }) {
  return (
    <div className="font-mono text-xs leading-6">
      {lines.map((line, i) => (
        <div
          key={i}
          className={`flex hover:bg-muted/30 transition-colors ${
            line.type === 'added'
              ? 'bg-emerald-50 dark:bg-emerald-950/20'
              : line.type === 'removed'
              ? 'bg-red-50 dark:bg-red-950/20'
              : ''
          }`}
        >
          <span className="w-12 flex-shrink-0 text-right pr-2 text-muted-foreground/50 select-none border-r border-border/30">
            {line.lineNumberOld ?? ''}
          </span>
          <span className="w-12 flex-shrink-0 text-right pr-2 text-muted-foreground/50 select-none border-r border-border/30">
            {line.lineNumberNew ?? ''}
          </span>
          <span
            className={`w-6 flex-shrink-0 text-center select-none font-bold ${
              line.type === 'added'
                ? 'text-emerald-600 dark:text-emerald-400'
                : line.type === 'removed'
                ? 'text-red-600 dark:text-red-400'
                : 'text-transparent'
            }`}
          >
            {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
          </span>
          <span
            className={`flex-1 pl-2 whitespace-pre-wrap break-all ${
              line.type === 'added'
                ? 'text-emerald-700 dark:text-emerald-300'
                : line.type === 'removed'
                ? 'text-red-700 dark:text-red-300'
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
    } else if (line.type === 'removed') {
      // Collect consecutive removals
      const removals: DiffLine[] = []
      while (i < lines.length && lines[i].type === 'removed') {
        removals.push(lines[i])
        i++
      }
      // Collect consecutive additions
      const additions: DiffLine[] = []
      while (i < lines.length && lines[i].type === 'added') {
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
    } else if (line.type === 'added') {
      pairs.push({ left: null, right: line })
      i++
    } else {
      i++
    }
  }

  return (
    <div className="font-mono text-xs leading-6">
      {pairs.map((pair, idx) => (
        <div key={idx} className="flex hover:bg-muted/20 transition-colors">
          {/* Left side (old) */}
          <div className="flex-1 flex min-w-0 border-r border-border/30">
            <span className="w-12 flex-shrink-0 text-right pr-2 text-muted-foreground/50 select-none">
              {pair.left?.lineNumberOld ?? ''}
            </span>
            <span
              className={`w-6 flex-shrink-0 text-center select-none font-bold ${
                pair.left?.type === 'removed'
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-transparent'
              }`}
            >
              {pair.left?.type === 'removed' ? '-' : ' '}
            </span>
            <span
              className={`flex-1 pl-2 whitespace-pre-wrap break-all ${
                pair.left?.type === 'removed'
                  ? 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300'
                  : 'text-foreground/80'
              }`}
            >
              {pair.left?.content ?? ''}
            </span>
          </div>
          {/* Right side (new) */}
          <div className="flex-1 flex min-w-0">
            <span className="w-12 flex-shrink-0 text-right pr-2 text-muted-foreground/50 select-none">
              {pair.right?.lineNumberNew ?? ''}
            </span>
            <span
              className={`w-6 flex-shrink-0 text-center select-none font-bold ${
                pair.right?.type === 'added'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-transparent'
              }`}
            >
              {pair.right?.type === 'added' ? '+' : ' '}
            </span>
            <span
              className={`flex-1 pl-2 whitespace-pre-wrap break-all ${
                pair.right?.type === 'added'
                  ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300'
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

// ─── Single File Diff Card ──────────────────────────────────────────────

interface SingleFileDiffCardProps {
  diff: FileDiff
  viewMode: 'unified' | 'split'
  defaultOpen?: boolean
  onAccept?: () => void
  onReject?: () => void
  accepted?: boolean
  rejected?: boolean
  index?: number
}

function SingleFileDiffCard({
  diff,
  viewMode,
  defaultOpen = true,
  onAccept,
  onReject,
  accepted,
  rejected,
  index = 0,
}: SingleFileDiffCardProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  const diffLines = useMemo(() => computeDiff(diff.oldContent, diff.newContent), [diff])
  const stats = useMemo(() => getDiffStats(diffLines), [diffLines])

  const isNewFile = diff.oldContent === null
  const isDeletedFile = diff.newContent === null
  const isModified = !isNewFile && !isDeletedFile

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.25 }}
      className={`border rounded-lg overflow-hidden transition-colors ${
        accepted
          ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-950/10'
          : rejected
          ? 'border-red-200 dark:border-red-800 bg-red-50/30 dark:bg-red-950/10 opacity-60'
          : 'border-border'
      }`}
    >
      {/* Card Header */}
      <div
        className="flex items-center gap-2 px-3 py-2 bg-muted/30 cursor-pointer select-none"
        onClick={() => setIsOpen(!isOpen)}
      >
        {/* Collapse Toggle */}
        <motion.div
          animate={{ rotate: isOpen ? 0 : -90 }}
          transition={{ duration: 0.15 }}
        >
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
        </motion.div>

        {/* File Icon */}
        <FileCode className="w-4 h-4 text-muted-foreground flex-shrink-0" />

        {/* File Path */}
        <span className="text-xs font-mono truncate flex-1 min-w-0">
          {diff.path}
        </span>

        {/* Language Badge */}
        <Badge className={`text-[9px] px-1.5 py-0 ${getLanguageColor(diff.language)}`}>
          {diff.language}
        </Badge>

        {/* Status Badge */}
        {isNewFile && (
          <Badge className="text-[9px] px-1.5 py-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
            NEW
          </Badge>
        )}
        {isDeletedFile && (
          <Badge className="text-[9px] px-1.5 py-0 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
            DELETED
          </Badge>
        )}
        {isModified && (
          <Badge className="text-[9px] px-1.5 py-0 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            MODIFIED
          </Badge>
        )}

        {/* Diff Stats Badge */}
        <div className="flex items-center gap-1 text-[10px] font-mono flex-shrink-0">
          <span className="text-emerald-600 dark:text-emerald-400">+{stats.additions}</span>
          <span className="text-muted-foreground/30">│</span>
          <span className="text-red-600 dark:text-red-400">-{stats.deletions}</span>
        </div>

        {/* Accept/Reject Buttons */}
        {onAccept && onReject && !accepted && !rejected && (
          <div className="flex items-center gap-1 flex-shrink-0 ml-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[10px] px-2 hover:bg-emerald-100 hover:text-emerald-700 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-400"
              onClick={(e) => {
                e.stopPropagation()
                onAccept()
              }}
            >
              <Check className="w-3 h-3 mr-0.5" />
              Accept
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[10px] px-2 hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-900/30 dark:hover:text-red-400"
              onClick={(e) => {
                e.stopPropagation()
                onReject()
              }}
            >
              <X className="w-3 h-3 mr-0.5" />
              Reject
            </Button>
          </div>
        )}

        {/* Accepted/Rejected indicator */}
        {accepted && (
          <span className="flex items-center gap-0.5 text-[10px] text-emerald-600 dark:text-emerald-400 flex-shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Accepted
          </span>
        )}
        {rejected && (
          <span className="flex items-center gap-0.5 text-[10px] text-red-600 dark:text-red-400 flex-shrink-0">
            <XCircle className="w-3.5 h-3.5" />
            Rejected
          </span>
        )}
      </div>

      {/* Diff Content - Collapsible */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <ScrollArea className="max-h-96">
              {viewMode === 'unified' ? (
                <UnifiedDiffView lines={diffLines} />
              ) : (
                <SplitDiffView lines={diffLines} />
              )}
            </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── Main FileDiffViewer Component ──────────────────────────────────────

export function FileDiffViewer({ diffs, onAccept, onReject, onClose }: FileDiffViewerProps) {
  const [viewMode, setViewMode] = useState<'unified' | 'split'>('unified')
  const [fileStates, setFileStates] = useState<Record<string, 'accepted' | 'rejected' | 'pending'>>(() => {
    const states: Record<string, 'accepted' | 'rejected' | 'pending'> = {}
    for (const d of diffs) {
      states[d.path] = 'pending'
    }
    return states
  })

  // Aggregate stats
  const allDiffLines = useMemo(
    () => diffs.map((d) => computeDiff(d.oldContent, d.newContent)),
    [diffs]
  )
  const totalStats = useMemo(
    () =>
      allDiffLines.reduce(
        (acc, lines) => {
          const s = getDiffStats(lines)
          return { additions: acc.additions + s.additions, deletions: acc.deletions + s.deletions }
        },
        { additions: 0, deletions: 0 }
      ),
    [allDiffLines]
  )

  const pendingCount = Object.values(fileStates).filter((s) => s === 'pending').length
  const acceptedCount = Object.values(fileStates).filter((s) => s === 'accepted').length
  const rejectedCount = Object.values(fileStates).filter((s) => s === 'rejected').length

  const handleAcceptFile = (path: string) => {
    setFileStates((prev) => ({ ...prev, [path]: 'accepted' }))
    onAccept?.(path)
  }

  const handleRejectFile = (path: string) => {
    setFileStates((prev) => ({ ...prev, [path]: 'rejected' }))
    onReject?.(path)
  }

  const handleAcceptAll = () => {
    const newStates = { ...fileStates }
    for (const d of diffs) {
      if (newStates[d.path] !== 'rejected') {
        newStates[d.path] = 'accepted'
        onAccept?.(d.path)
      }
    }
    setFileStates(newStates)
    toast.success(`Accepted ${diffs.filter((d) => newStates[d.path] === 'accepted').length} file change${diffs.length !== 1 ? 's' : ''}`)
  }

  const handleRejectAll = () => {
    const newStates = { ...fileStates }
    for (const d of diffs) {
      newStates[d.path] = 'rejected'
      onReject?.(d.path)
    }
    setFileStates(newStates)
    toast.info('All changes rejected')
  }

  return (
    <div className="flex flex-col h-full">
      {/* Summary Header */}
      <div className="border-b px-4 py-3 bg-muted/30 flex-shrink-0">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center gap-2">
              <FileCode className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-sm font-semibold">File Changes</span>
            </div>
            <Badge variant="secondary" className="text-[10px] px-1.5">
              {diffs.length} file{diffs.length !== 1 ? 's' : ''}
            </Badge>
            <div className="flex items-center gap-1.5 text-[10px] font-mono">
              <span className="text-emerald-600 dark:text-emerald-400">+{totalStats.additions}</span>
              <span className="text-muted-foreground/30">│</span>
              <span className="text-red-600 dark:text-red-400">-{totalStats.deletions}</span>
            </div>
            {/* Status counts */}
            <div className="flex items-center gap-2 text-[10px]">
              {acceptedCount > 0 && (
                <span className="flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-3 h-3" />
                  {acceptedCount}
                </span>
              )}
              {rejectedCount > 0 && (
                <span className="flex items-center gap-0.5 text-red-600 dark:text-red-400">
                  <XCircle className="w-3 h-3" />
                  {rejectedCount}
                </span>
              )}
              {pendingCount > 0 && (
                <span className="text-muted-foreground">{pendingCount} pending</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
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

            {/* Accept All / Reject All */}
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[10px] hover:bg-red-50 hover:text-red-700 hover:border-red-200 dark:hover:bg-red-950/20 dark:hover:text-red-400"
              onClick={handleRejectAll}
              disabled={rejectedCount === diffs.length}
            >
              <X className="w-3 h-3 mr-1" />
              Reject All
            </Button>
            <Button
              size="sm"
              className="h-7 text-[10px] bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white"
              onClick={handleAcceptAll}
              disabled={acceptedCount + rejectedCount === diffs.length && acceptedCount === 0}
            >
              <Check className="w-3 h-3 mr-1" />
              Accept All
              {pendingCount > 0 && (
                <Badge variant="secondary" className="ml-1 text-[8px] px-1 py-0 bg-emerald-400/20 text-emerald-100">
                  {diffs.filter((d) => fileStates[d.path] !== 'rejected').length}
                </Badge>
              )}
            </Button>

            {/* Close button */}
            {onClose && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
                <X className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Diff Cards List */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          <AnimatePresence>
            {diffs.map((diff, index) => (
              <SingleFileDiffCard
                key={diff.path}
                diff={diff}
                viewMode={viewMode}
                defaultOpen={diffs.length <= 5}
                onAccept={() => handleAcceptFile(diff.path)}
                onReject={() => handleRejectFile(diff.path)}
                accepted={fileStates[diff.path] === 'accepted'}
                rejected={fileStates[diff.path] === 'rejected'}
                index={index}
              />
            ))}
          </AnimatePresence>
        </div>
      </ScrollArea>
    </div>
  )
}

// ─── Diff Dialog (for modal usage) ─────────────────────────────────────

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
  const [fileStates, setFileStates] = useState<Record<string, 'accepted' | 'rejected' | 'pending'>>({})

  // Aggregate stats
  const allDiffLines = useMemo(
    () => fileDiffs.map((d) => computeDiff(d.oldContent, d.newContent)),
    [fileDiffs]
  )
  const totalStats = useMemo(
    () =>
      allDiffLines.reduce(
        (acc, lines) => {
          const s = getDiffStats(lines)
          return { additions: acc.additions + s.additions, deletions: acc.deletions + s.deletions }
        },
        { additions: 0, deletions: 0 }
      ),
    [allDiffLines]
  )

  // Reset states when dialog opens
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      const states: Record<string, 'accepted' | 'rejected' | 'pending'> = {}
      for (const f of fileDiffs) {
        states[f.path] = 'pending'
      }
      setFileStates(states)
      setViewMode('unified')
    }
    onOpenChange(newOpen)
  }

  const handleAcceptFile = (path: string) => {
    setFileStates((prev) => ({ ...prev, [path]: 'accepted' }))
  }

  const handleRejectFile = (path: string) => {
    setFileStates((prev) => ({ ...prev, [path]: 'rejected' }))
  }

  const handleAcceptAll = () => {
    const acceptedPaths = fileDiffs
      .filter((f) => fileStates[f.path] !== 'rejected')
      .map((f) => f.path)
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

  const pendingCount = Object.values(fileStates).filter((s) => s === 'pending').length
  const acceptedCount = Object.values(fileStates).filter((s) => s === 'accepted').length
  const rejectedCount = Object.values(fileStates).filter((s) => s === 'rejected').length

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-[90vw] lg:max-w-[1100px] h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-4 py-3 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2 text-sm">
                <FileCode className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
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
              {/* Summary counts */}
              <div className="flex items-center gap-1.5 text-[10px]">
                <span className="text-emerald-600 dark:text-emerald-400">+{totalStats.additions}</span>
                <span className="text-muted-foreground/30">│</span>
                <span className="text-red-600 dark:text-red-400">-{totalStats.deletions}</span>
              </div>
              <div className="flex items-center gap-2 text-[10px]">
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

        {/* Diff Cards */}
        <ScrollArea className="flex-1">
          <div className="p-3 space-y-2">
            <AnimatePresence>
              {fileDiffs.map((diff, index) => (
                <SingleFileDiffCard
                  key={diff.path}
                  diff={diff}
                  viewMode={viewMode}
                  defaultOpen={fileDiffs.length <= 5}
                  onAccept={() => handleAcceptFile(diff.path)}
                  onReject={() => handleRejectFile(diff.path)}
                  accepted={fileStates[diff.path] === 'accepted'}
                  rejected={fileStates[diff.path] === 'rejected'}
                  index={index}
                />
              ))}
            </AnimatePresence>
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="border-t px-4 py-2.5 flex items-center justify-between flex-shrink-0 bg-muted/30">
          <div className="text-[10px] text-muted-foreground">
            {fileDiffs.length} file{fileDiffs.length !== 1 ? 's' : ''} with changes to review
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[10px] hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/20 dark:hover:text-red-400"
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
                  {fileDiffs.filter((f) => fileStates[f.path] !== 'rejected').length}
                </Badge>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
