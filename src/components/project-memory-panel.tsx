'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Brain, Plus, Search, Trash2, FileCode, Shield,
  Wrench, Info, Loader2, X, ChevronDown, ChevronUp,
} from 'lucide-react'
import { toast } from 'sonner'

// ─── Types ──────────────────────────────────────────────────────────────────

interface MemoryItem {
  id: string
  type: string
  key: string
  value: string
  createdAt: string
  updatedAt: string
}

interface ProjectMemoryPanelProps {
  projectId: string
}

// ─── Type Config ────────────────────────────────────────────────────────────

const MEMORY_TYPES = [
  { value: 'requirement', label: 'Requirement', icon: FileCode, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  { value: 'architecture', label: 'Architecture', icon: Wrench, color: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400' },
  { value: 'constraint', label: 'Constraint', icon: Shield, color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  { value: 'context', label: 'Context', icon: Info, color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
] as const

function getTypeConfig(type: string) {
  return MEMORY_TYPES.find((t) => t.value === type) || MEMORY_TYPES[3]
}

// ─── Relative time ──────────────────────────────────────────────────────────

function relativeTime(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then
  if (diffMs < 60000) return 'Just now'
  if (diffMs < 3600000) return `${Math.floor(diffMs / 60000)}m ago`
  if (diffMs < 86400000) return `${Math.floor(diffMs / 3600000)}h ago`
  if (diffMs < 604800000) return `${Math.floor(diffMs / 86400000)}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ─── Add Memory Dialog ──────────────────────────────────────────────────────

function AddMemoryDialog({
  open,
  onOpenChange,
  projectId,
  onAdded,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  onAdded: () => void
}) {
  const [type, setType] = useState('requirement')
  const [key, setKey] = useState('')
  const [value, setValue] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!key.trim() || !value.trim()) {
      toast.error('Please fill in all fields')
      return
    }
    setSubmitting(true)
    try {
      await api.upsertMemory(projectId, type, key.trim(), value.trim())
      toast.success('Memory added')
      setKey('')
      setValue('')
      setType('requirement')
      onOpenChange(false)
      onAdded()
    } catch {
      toast.error('Failed to add memory')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-emerald-600" />
            Add Memory
          </DialogTitle>
          <DialogDescription>Add a new memory item to help AI understand your project better.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs">Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MEMORY_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    <span className="flex items-center gap-2">
                      <t.icon className="w-3.5 h-3.5" />
                      {t.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Key</Label>
            <Input
              placeholder="e.g., tech_stack, auth_method"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Value</Label>
            <Textarea
              placeholder="Describe the requirement, decision, or context..."
              value={value}
              onChange={(e) => setValue(e.target.value)}
              rows={3}
              className="text-sm resize-none"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="h-8">
            Cancel
          </Button>
          <Button
            size="sm"
            className="h-8 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white"
            onClick={handleSubmit}
            disabled={submitting || !key.trim() || !value.trim()}
          >
            {submitting ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Plus className="w-3.5 h-3.5 mr-1" />}
            Add Memory
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Memory Item Card ───────────────────────────────────────────────────────

function MemoryItemCard({
  item,
  onDelete,
}: {
  item: MemoryItem
  onDelete: (type: string, key: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const config = getTypeConfig(item.type)

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await onDelete(item.type, item.key)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.15 }}
      className="rounded-lg border p-3 hover:border-emerald-200 dark:hover:border-emerald-800 transition-colors group"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0 flex-1">
          <Badge variant="secondary" className={`text-[9px] px-1.5 h-4 flex-shrink-0 ${config.color}`}>
            <config.icon className="w-2.5 h-2.5 mr-0.5" />
            {config.label}
          </Badge>
          <div className="min-w-0">
            <p className="text-xs font-medium truncate">{item.key}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <span className="text-[9px] text-muted-foreground">{relativeTime(item.updatedAt)}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
          </Button>
        </div>
      </div>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <p className="text-[11px] text-muted-foreground leading-relaxed mt-2 pl-1 border-l-2 border-emerald-200 dark:border-emerald-800">
              {item.value}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── Main Panel ─────────────────────────────────────────────────────────────

export function ProjectMemoryPanel({ projectId }: ProjectMemoryPanelProps) {
  const [memories, setMemories] = useState<MemoryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [filterType, setFilterType] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [addDialogOpen, setAddDialogOpen] = useState(false)

  const loadMemories = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.getMemory(projectId, filterType !== 'all' ? filterType : undefined)
      setMemories(data || [])
    } catch {
      toast.error('Failed to load memory')
    } finally {
      setLoading(false)
    }
  }, [projectId, filterType])

  useEffect(() => {
    loadMemories()
  }, [loadMemories])

  const handleDelete = async (type: string, key: string) => {
    try {
      await api.deleteMemory(projectId, type, key)
      toast.success('Memory deleted')
      await loadMemories()
    } catch {
      toast.error('Failed to delete memory')
    }
  }

  // Filter memories by search query
  const filteredMemories = memories.filter((m) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      m.key.toLowerCase().includes(q) ||
      m.value.toLowerCase().includes(q) ||
      m.type.toLowerCase().includes(q)
    )
  })

  // Group memories by type
  const groupedMemories: Record<string, MemoryItem[]> = {}
  for (const m of filteredMemories) {
    if (!groupedMemories[m.type]) groupedMemories[m.type] = []
    groupedMemories[m.type].push(m)
  }

  // Sort groups by the MEMORY_TYPES order
  const sortedGroups = Object.entries(groupedMemories).sort((a, b) => {
    const aIdx = MEMORY_TYPES.findIndex((t) => t.value === a[0])
    const bIdx = MEMORY_TYPES.findIndex((t) => t.value === b[0])
    return (aIdx === -1 ? 99 : aIdx) - (bIdx === -1 ? 99 : bIdx)
  })

  const typeCounts: Record<string, number> = {}
  for (const m of memories) {
    typeCounts[m.type] = (typeCounts[m.type] || 0) + 1
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b px-3 py-2 flex items-center justify-between bg-muted/30">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-xs font-medium text-muted-foreground">Project Memory</span>
          <Badge variant="secondary" className="text-[10px] px-1.5">
            {memories.length}
          </Badge>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-6 text-[10px] border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 min-h-[44px] md:min-h-0"
          onClick={() => setAddDialogOpen(true)}
        >
          <Plus className="w-3 h-3 mr-1" />
          Add Memory
        </Button>
      </div>

      {/* Search & Filter Bar */}
      {memories.length > 0 && (
        <div className="px-3 py-2 border-b space-y-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
            <Input
              placeholder="Search memory..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-7 text-xs pl-7 pr-7"
            />
            {searchQuery && (
              <button
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setSearchQuery('')}
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          <div className="flex gap-1 flex-wrap">
            <Button
              variant={filterType === 'all' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-5 text-[9px] px-2"
              onClick={() => setFilterType('all')}
            >
              All ({memories.length})
            </Button>
            {MEMORY_TYPES.map((t) => {
              const count = typeCounts[t.value] || 0
              if (count === 0) return null
              return (
                <Button
                  key={t.value}
                  variant={filterType === t.value ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-5 text-[9px] px-2"
                  onClick={() => setFilterType(t.value)}
                >
                  <t.icon className="w-2.5 h-2.5 mr-0.5" />
                  {t.label} ({count})
                </Button>
              )
            })}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : memories.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 px-4">
            <div className="w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center">
              <Brain className="w-7 h-7 text-emerald-400 dark:text-emerald-500" />
            </div>
            <div className="text-center">
              <h3 className="text-sm font-medium text-muted-foreground">No memory yet</h3>
              <p className="text-xs text-muted-foreground/70 mt-1 max-w-[200px]">
                Start chatting with AI to build project memory, or add items manually
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
              onClick={() => setAddDialogOpen(true)}
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add Memory
            </Button>
          </div>
        ) : filteredMemories.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 px-4">
            <Search className="w-6 h-6 text-muted-foreground/40" />
            <p className="text-xs text-muted-foreground">No results found</p>
          </div>
        ) : (
          <ScrollArea className="h-full">
            <div className="p-3 space-y-3">
              {sortedGroups.map(([type, items]) => {
                const config = getTypeConfig(type)
                return (
                  <div key={type}>
                    <div className="flex items-center gap-1.5 mb-2">
                      <config.icon className="w-3 h-3 text-muted-foreground" />
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                        {config.label}s
                      </span>
                      <Badge variant="secondary" className="text-[9px] px-1 h-3.5">
                        {items.length}
                      </Badge>
                    </div>
                    <div className="space-y-1.5">
                      <AnimatePresence>
                        {items.map((item) => (
                          <MemoryItemCard
                            key={item.id}
                            item={item}
                            onDelete={handleDelete}
                          />
                        ))}
                      </AnimatePresence>
                    </div>
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Add Memory Dialog */}
      <AddMemoryDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        projectId={projectId}
        onAdded={loadMemories}
      />
    </div>
  )
}
