'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Activity, FileCode, MessageSquare, Plus, RefreshCw,
  ShieldCheck, Save, Download, ChevronDown, ChevronUp,
  Filter, X,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

// ─── Types ──────────────────────────────────────────────────────────────────

export type ActivityType =
  | 'file_generated'
  | 'chat_message'
  | 'project_created'
  | 'project_updated'
  | 'validation'
  | 'version_saved'
  | 'export'

export interface ActivityItem {
  id: string
  type: ActivityType
  description: string
  projectName: string
  projectId: string
  timestamp: string
}

const ACTIVITY_CONFIG: Record<ActivityType, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  file_generated: { icon: FileCode, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/30', label: 'File Generated' },
  chat_message: { icon: MessageSquare, color: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-50 dark:bg-sky-950/30', label: 'Chat Message' },
  project_created: { icon: Plus, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/30', label: 'Project Created' },
  project_updated: { icon: RefreshCw, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-950/30', label: 'Project Updated' },
  validation: { icon: ShieldCheck, color: 'text-teal-600 dark:text-teal-400', bg: 'bg-teal-50 dark:bg-teal-950/30', label: 'Validation' },
  version_saved: { icon: Save, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-950/30', label: 'Version Saved' },
  export: { icon: Download, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-950/30', label: 'Export' },
}

const STORAGE_KEY = 'builderai-activity-feed'
const MAX_ITEMS = 50

// ─── Relative Time ──────────────────────────────────────────────────────────

function getRelativeTime(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 7) return `${diffDay}d ago`
  return date.toLocaleDateString()
}

// ─── Persistence Helpers ─────────────────────────────────────────────────────

function loadActivities(): ActivityItem[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed)) return parsed.slice(0, MAX_ITEMS)
    }
  } catch {}
  return []
}

function saveActivities(items: ActivityItem[]) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)))
  } catch {}
}

// ─── Public: Add an activity ────────────────────────────────────────────────

export function addActivity(item: Omit<ActivityItem, 'id' | 'timestamp'>) {
  const newItem: ActivityItem = {
    ...item,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
  }
  const current = loadActivities()
  const updated = [newItem, ...current].slice(0, MAX_ITEMS)
  saveActivities(updated)
  // Dispatch custom event for real-time updates
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('builderai-activity', { detail: updated }))
  }
}

// ─── Public: Generate mock activities from project data ─────────────────────

export function generateMockActivities(projects: Array<{ id: string; name: string; status: string; createdAt: string; updatedAt: string; files?: any[] }>): ActivityItem[] {
  const items: ActivityItem[] = []
  for (const project of projects) {
    items.push({
      id: `mock-created-${project.id}`,
      type: 'project_created',
      description: `Created project "${project.name}"`,
      projectName: project.name,
      projectId: project.id,
      timestamp: project.createdAt,
    })
    items.push({
      id: `mock-updated-${project.id}`,
      type: 'project_updated',
      description: `Updated project "${project.name}"`,
      projectName: project.name,
      projectId: project.id,
      timestamp: project.updatedAt,
    })
    if (project.files && project.files.length > 0) {
      items.push({
        id: `mock-files-${project.id}`,
        type: 'file_generated',
        description: `Generated ${project.files.length} file${project.files.length > 1 ? 's' : ''} in ${project.name}`,
        projectName: project.name,
        projectId: project.id,
        timestamp: project.updatedAt,
      })
    }
    if (project.status === 'deployed') {
      items.push({
        id: `mock-deployed-${project.id}`,
        type: 'export',
        description: `Exported ${project.name} for deployment`,
        projectName: project.name,
        projectId: project.id,
        timestamp: project.updatedAt,
      })
    }
  }
  // Sort by timestamp descending
  return items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, MAX_ITEMS)
}

// ─── Activity Feed Component ────────────────────────────────────────────────

interface ActivityFeedProps {
  /** Activity items to display; if omitted, loads from localStorage */
  activities?: ActivityItem[]
  /** Whether this is embedded inline (no card wrapper) or as a standalone widget */
  variant?: 'widget' | 'inline' | 'compact'
  /** Max items to show before "View All" */
  maxVisible?: number
  /** Called when project name is clicked */
  onProjectClick?: (projectId: string) => void
  /** Whether to show filter controls */
  showFilters?: boolean
  /** Optional className */
  className?: string
}

export function ActivityFeed({
  activities: externalActivities,
  variant = 'widget',
  maxVisible = 10,
  onProjectClick,
  showFilters = true,
  className = '',
}: ActivityFeedProps) {
  const [internalActivities, setInternalActivities] = useState<ActivityItem[]>(loadActivities)
  const [expanded, setExpanded] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [activeFilter, setActiveFilter] = useState<ActivityType | 'all'>('all')

  // Listen for activity updates
  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<ActivityItem[]>
      if (customEvent.detail) {
        setInternalActivities(customEvent.detail)
      }
    }
    window.addEventListener('builderai-activity', handler)
    return () => window.removeEventListener('builderai-activity', handler)
  }, [])

  // Use external activities if provided, otherwise internal
  const activities = externalActivities || internalActivities

  // Filter activities
  const filteredActivities = useMemo(() => {
    if (activeFilter === 'all') return activities
    return activities.filter(a => a.type === activeFilter)
  }, [activities, activeFilter])

  // Visible items
  const visibleActivities = expanded ? filteredActivities : filteredActivities.slice(0, maxVisible)
  const hasMore = filteredActivities.length > maxVisible

  const handleRefresh = useCallback(() => {
    setInternalActivities(loadActivities())
  }, [])

  const isCompact = variant === 'compact'
  const isInline = variant === 'inline'

  return (
    <div className={`${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <Activity className="w-3.5 h-3.5 text-emerald-500" />
          Activity
          <Badge variant="secondary" className="text-[9px] px-1.5 h-4 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800">
            {filteredActivities.length}
          </Badge>
          {collapsed ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
        </button>
        <div className="flex items-center gap-1">
          {showFilters && !isCompact && (
            <FilterDropdown activeFilter={activeFilter} onFilterChange={setActiveFilter} />
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleRefresh}
            title="Refresh activity"
          >
            <RefreshCw className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {isInline ? (
              <InlineList
                activities={visibleActivities}
                onProjectClick={onProjectClick}
                isCompact={isCompact}
              />
            ) : (
              <WidgetList
                activities={visibleActivities}
                onProjectClick={onProjectClick}
              />
            )}

            {/* View All / Collapse */}
            {hasMore && (
              <div className="mt-2 text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300"
                  onClick={() => setExpanded(!expanded)}
                >
                  {expanded ? 'Show Less' : `View All (${filteredActivities.length})`}
                </Button>
              </div>
            )}

            {filteredActivities.length === 0 && (
              <div className="py-6 text-center">
                <Activity className="w-6 h-6 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">No activity yet</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Widget-style list (card with timeline) ──────────────────────────────────

function WidgetList({
  activities,
  onProjectClick,
}: {
  activities: ActivityItem[]
  onProjectClick?: (projectId: string) => void
}) {
  return (
    <div className="rounded-lg border bg-card/80 backdrop-blur-sm overflow-hidden">
      <div className="relative pl-5 pr-3 py-1">
        {/* Vertical timeline line */}
        {activities.length > 1 && (
          <div className="absolute left-[17px] top-4 bottom-4 w-px bg-gradient-to-b from-emerald-300 via-teal-300 to-transparent dark:from-emerald-700 dark:via-teal-700" />
        )}
        <div className="divide-y divide-border/50">
          {activities.map((item, i) => {
            const config = ACTIVITY_CONFIG[item.type]
            const Icon = config.icon
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-start gap-3 py-2.5 relative group hover:bg-muted/20 transition-colors px-2 -mx-2 rounded"
              >
                {/* Timeline dot */}
                <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 z-10 mt-0.5 ring-2 ring-background ${config.bg} ${config.color}`}>
                  <Icon className="w-2.5 h-2.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs leading-relaxed">{item.description}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {onProjectClick ? (
                      <button
                        onClick={() => onProjectClick(item.projectId)}
                        className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 hover:underline truncate max-w-[120px]"
                      >
                        {item.projectName}
                      </button>
                    ) : (
                      <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 truncate max-w-[120px]">
                        {item.projectName}
                      </span>
                    )}
                    <span className="text-[9px] text-muted-foreground/60">
                      {getRelativeTime(item.timestamp)}
                    </span>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Inline list (simple rows) ──────────────────────────────────────────────

function InlineList({
  activities,
  onProjectClick,
  isCompact,
}: {
  activities: ActivityItem[]
  onProjectClick?: (projectId: string) => void
  isCompact?: boolean
}) {
  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="divide-y">
        {activities.map((item, i) => {
          const config = ACTIVITY_CONFIG[item.type]
          const Icon = config.icon
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className={`flex items-center gap-3 hover:bg-muted/30 transition-colors ${isCompact ? 'px-2 py-1.5' : 'px-3 py-2.5'}`}
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${config.bg} ${config.color}`}>
                <Icon className="w-3 h-3" />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`truncate ${isCompact ? 'text-[10px]' : 'text-xs'}`}>
                  <span className="font-medium">{item.description}</span>
                </p>
              </div>
              {!isCompact && (
                <>
                  {onProjectClick ? (
                    <button
                      onClick={() => onProjectClick(item.projectId)}
                      className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 hover:underline flex-shrink-0"
                    >
                      {item.projectName}
                    </button>
                  ) : (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                      {item.projectName}
                    </span>
                  )}
                </>
              )}
              <span className={`text-muted-foreground flex-shrink-0 ${isCompact ? 'text-[8px]' : 'text-[10px]'}`}>
                {getRelativeTime(item.timestamp)}
              </span>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Filter Dropdown ─────────────────────────────────────────────────────────

function FilterDropdown({
  activeFilter,
  onFilterChange,
}: {
  activeFilter: ActivityType | 'all'
  onFilterChange: (f: ActivityType | 'all') => void
}) {
  const [open, setOpen] = useState(false)

  const filterOptions: Array<{ value: ActivityType | 'all'; label: string }> = [
    { value: 'all', label: 'All' },
    { value: 'file_generated', label: 'Files' },
    { value: 'chat_message', label: 'Chat' },
    { value: 'project_created', label: 'Created' },
    { value: 'project_updated', label: 'Updated' },
    { value: 'validation', label: 'Validation' },
    { value: 'version_saved', label: 'Version' },
    { value: 'export', label: 'Export' },
  ]

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        className="h-6 px-1.5 text-[10px] gap-1"
        onClick={() => setOpen(!open)}
      >
        <Filter className="w-2.5 h-2.5" />
        {activeFilter !== 'all' && (
          <span className="text-emerald-600 dark:text-emerald-400">
            {ACTIVITY_CONFIG[activeFilter]?.label || activeFilter}
          </span>
        )}
      </Button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -4 }}
              transition={{ duration: 0.1 }}
              className="absolute right-0 top-full mt-1 z-50 rounded-lg border bg-popover p-1 shadow-lg min-w-[140px]"
            >
              {filterOptions.map(opt => {
                const isActive = activeFilter === opt.value
                return (
                  <button
                    key={opt.value}
                    onClick={() => {
                      onFilterChange(opt.value)
                      setOpen(false)
                    }}
                    className={`w-full text-left px-2.5 py-1.5 text-xs rounded-md transition-colors flex items-center gap-2 ${
                      isActive
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'
                        : 'hover:bg-muted text-foreground'
                    }`}
                  >
                    {opt.value !== 'all' && (
                      <span className={`w-2 h-2 rounded-full ${ACTIVITY_CONFIG[opt.value].bg}`} />
                    )}
                    {opt.label}
                    {isActive && <X className="w-2.5 h-2.5 ml-auto" onClick={(e) => { e.stopPropagation(); onFilterChange('all'); setOpen(false) }} />}
                  </button>
                )
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Activity Bell (latest 3 on hover) ──────────────────────────────────────

export function ActivityBell({ activities }: { activities: ActivityItem[] }) {
  const [open, setOpen] = useState(false)
  const recentActivities = activities.slice(0, 3)

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 relative"
        onClick={() => setOpen(!open)}
        title="Recent activity"
      >
        <Activity className="w-3.5 h-3.5" />
        {activities.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 text-white text-[7px] flex items-center justify-center font-bold">
            {activities.length > 9 ? '9+' : activities.length}
          </span>
        )}
      </Button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -4 }}
              transition={{ duration: 0.1 }}
              className="absolute right-0 top-full mt-1 z-50 w-72 rounded-lg border bg-popover shadow-lg overflow-hidden"
            >
              <div className="px-3 py-2 border-b bg-muted/30">
                <span className="text-xs font-semibold">Recent Activity</span>
              </div>
              {recentActivities.length === 0 ? (
                <div className="py-4 text-center text-xs text-muted-foreground">
                  No recent activity
                </div>
              ) : (
                <div className="divide-y">
                  {recentActivities.map(item => {
                    const config = ACTIVITY_CONFIG[item.type]
                    const Icon = config.icon
                    return (
                      <div key={item.id} className="flex items-start gap-2 px-3 py-2">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${config.bg} ${config.color}`}>
                          <Icon className="w-2.5 h-2.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] leading-relaxed truncate">{item.description}</p>
                          <span className="text-[9px] text-muted-foreground">
                            {getRelativeTime(item.timestamp)}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
