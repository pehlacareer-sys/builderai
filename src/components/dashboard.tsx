'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { useProjectStore } from '@/stores/project-store'
import { Button } from '@/components/ui/button'
import { BrandButton } from '@/components/ui/brand-button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { ThemeToggle } from '@/components/theme-toggle'
import { KeyboardShortcutHelp } from '@/components/keyboard-shortcut-help'
import { api } from '@/lib/api'
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, FolderKanban, Clock, ArrowRight, Loader2,
  Globe, Zap, LogOut, Trash2, Sparkles, Layers, Rocket, Bot,
  FileCode, Search, LayoutGrid, List, Download,
  ChevronRight, Upload, BookOpen, Activity, CheckCircle2,
  MessageSquare, DownloadCloud, Eye, Code2, Shield, X
} from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { TemplatesMarketplace, type Template } from '@/components/templates-marketplace'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { ActivityFeed, generateMockActivities, type ActivityItem } from '@/components/activity-feed'

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  building: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  ready: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  deployed: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400',
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  building: 'Building',
  ready: 'Ready',
  deployed: 'Deployed',
}

const STATUS_ICONS: Record<string, React.ElementType> = {
  draft: FileCode,
  building: Loader2,
  ready: Sparkles,
  deployed: Globe,
}

// ─── Animated Counter for Stats ────────────────────────────────────────────

function StatCounter({ value, duration = 1200 }: { value: number; duration?: number }) {
  const [count, setCount] = useState(0)
  const [shimmering, setShimmering] = useState(true)

  useEffect(() => {
    const startTime = performance.now()
    const step = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = Math.floor(eased * value)
      setCount(current)
      if (progress < 1) requestAnimationFrame(step)
      else setShimmering(false)
    }
    requestAnimationFrame(step)
  }, [value, duration])

  return <span className={shimmering ? 'stat-shimmer' : ''}>{count}</span>
}

// ─── Activity Feed Item ────────────────────────────────────────────────────

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

function getActivityIcon(action: string): React.ElementType {
  if (action === 'created') return Plus
  if (action === 'updated') return FileCode
  if (action === 'deployed') return Globe
  return Activity
}

// ─── Dashboard Skeleton Shimmer ────────────────────────────────────────────

function DashboardSkeletonShimmer() {
  return (
    <div className="space-y-6 animate-shimmer">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-40 rounded-lg" />
        ))}
      </div>
    </div>
  )
}

// ─── Getting Started Checklist ────────────────────────────────────────────

function GettingStartedChecklist({ projectCount }: { projectCount: number }) {
  const getInitialState = () => {
    const defaults: Record<string, boolean> = {
      'create-project': projectCount > 0,
      'chat-ai': false,
      'explore-viewer': false,
      'run-validation': false,
      'deploy-project': false,
    }
    if (typeof window === 'undefined') return defaults
    try {
      const saved = localStorage.getItem('builderai-getting-started')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (projectCount > 0) parsed['create-project'] = true
        return { ...defaults, ...parsed }
      }
    } catch {}
    return defaults
  }

  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>(getInitialState)

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem('builderai-getting-started', JSON.stringify(checkedItems))
  }, [checkedItems])

  const toggleItem = (key: string) => {
    setCheckedItems(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const allDone = Object.values(checkedItems).every(Boolean)

  const items = [
    { key: 'create-project', label: 'Create your first project', icon: Plus, desc: 'Start a new AI-powered project' },
    { key: 'chat-ai', label: 'Chat with AI assistant', icon: MessageSquare, desc: 'Describe what you want to build' },
    { key: 'explore-viewer', label: 'Explore the code viewer', icon: Eye, desc: 'View and edit generated files' },
    { key: 'run-validation', label: 'Run validation checks', icon: Shield, desc: 'Check code quality and health' },
    { key: 'deploy-project', label: 'Deploy your project', icon: Rocket, desc: 'Ship to production with one click' },
  ]

  if (allDone) return null

  const completedCount = Object.values(checkedItems).filter(Boolean).length
  const progressPercent = (completedCount / items.length) * 100

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="mb-6 sm:mb-8"
    >
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
          <Rocket className="w-3.5 h-3.5 text-emerald-500" />
          Getting Started
        </h2>
        <span className="text-xs text-muted-foreground">{Math.round(progressPercent)}% complete</span>
      </div>
      {/* Progress bar */}
      <div className="mb-3 h-1.5 rounded-full bg-muted overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progressPercent}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-3">
        {items.map((item, i) => {
          const isDone = checkedItems[item.key]
          return (
            <motion.button
              key={item.key}
              onClick={() => toggleItem(item.key)}
              className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                isDone
                  ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800'
                  : 'bg-card border-border hover:border-emerald-200 dark:hover:border-emerald-800 hover:shadow-md'
              }`}
              whileHover={{ scale: 1.01, y: -1 }}
              whileTap={{ scale: 0.99 }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.05 }}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                isDone
                  ? 'bg-emerald-500 text-white'
                  : 'bg-muted text-muted-foreground'
              }`}>
                {isDone ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <item.icon className="w-4 h-4" />
                )}
              </div>
              <div className="min-w-0">
                <div className={`text-xs font-semibold transition-colors ${isDone ? 'line-through text-emerald-600 dark:text-emerald-400' : ''}`}>
                  {item.label}
                </div>
                <div className="text-[10px] text-muted-foreground">{item.desc}</div>
              </div>
            </motion.button>
          )
        })}
      </div>
    </motion.div>
  )
}

// ─── Recent Activity Timeline (Desktop sidebar) ────────────────────────────

function RecentActivityTimeline({ activities }: { activities: Array<{ id: string; name: string; action: string; date: string; status: string }> }) {
  if (activities.length === 0) return null

  return (
    <div className="hidden xl:block w-64 flex-shrink-0">
      <div className="sticky top-20">
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-emerald-500" />
          Recent Activity
        </h2>
        <div className="relative pl-4">
          {/* Vertical timeline line */}
          <div className="absolute left-[7px] top-2 bottom-2 w-px bg-gradient-to-b from-emerald-300 via-teal-300 to-transparent dark:from-emerald-700 dark:via-teal-700" />
          <div className="space-y-0">
            {activities.map((activity, i) => {
              const Icon = getActivityIcon(activity.action)
              return (
                <motion.div
                  key={`${activity.id}-${activity.action}-${i}`}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-start gap-3 py-2 relative"
                >
                  {/* Timeline dot */}
                  <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0 z-10 mt-0.5 ${
                    activity.action === 'created'
                      ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 ring-2 ring-emerald-200 dark:ring-emerald-800'
                      : activity.action === 'deployed'
                      ? 'bg-sky-100 text-sky-600 dark:bg-sky-950/50 dark:text-sky-400 ring-2 ring-sky-200 dark:ring-sky-800'
                      : 'bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400 ring-2 ring-amber-200 dark:ring-amber-800'
                  }`}>
                    <Icon className="w-2 h-2" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs truncate">
                      <span className="font-medium">{activity.name}</span>
                    </p>
                    <p className="text-[10px] text-muted-foreground capitalize">{activity.action}</p>
                    <span className="text-[9px] text-muted-foreground/60">
                      {getRelativeTime(activity.date)}
                    </span>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export function Dashboard({ onShowTour }: { onShowTour?: () => void }) {
  const { user, logout } = useAuthStore()
  const { projects, loadProjects, createProject, selectProject, deleteProject } = useProjectStore()
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [creating, setCreating] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [loading, setLoading] = useState(true)
  const [showTemplates, setShowTemplates] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Welcome banner dismissed state (localStorage)
  const [showWelcomeBanner, setShowWelcomeBanner] = useState(() => {
    if (typeof window === 'undefined') return true
    try {
      return !localStorage.getItem('builderai-welcome-dismissed')
    } catch { return true }
  })

  const handleDismissBanner = useCallback(() => {
    setShowWelcomeBanner(false)
    try {
      localStorage.setItem('builderai-welcome-dismissed', 'true')
    } catch {}
  }, [])

  // Project reorder state (localStorage)
  const [projectOrder, setProjectOrder] = useState<string[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      const stored = localStorage.getItem('builderai-project-order')
      return stored ? JSON.parse(stored) : []
    } catch { return [] }
  })
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  // Simulate skeleton loading on initial mount
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800)
    return () => clearTimeout(timer)
  }, [])

  // Keyboard shortcuts for dashboard
  useKeyboardShortcuts({
    shortcuts: [
      {
        key: 'k',
        ctrlKey: true,
        metaKey: true,
        description: 'Focus search',
        category: 'navigation',
        action: () => {
          searchInputRef.current?.focus()
        },
      },
    ],
  })

  const handleCreate = async () => {
    if (!newName.trim()) return
    setCreating(true)
    try {
      const project = await createProject(newName.trim(), newDesc.trim() || undefined)
      setShowCreate(false)
      setNewName('')
      setNewDesc('')
      // Confetti/sparkle effect
      setShowConfetti(true)
      setTimeout(() => setShowConfetti(false), 2000)
      await selectProject(project.id)
    } catch {
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    await deleteProject(id)
  }

  const handleUseTemplate = async (template: Template) => {
    setCreating(true)
    try {
      const project = await createProject(template.name, template.description)
      setShowTemplates(false)
      await selectProject(project.id)
      toast.success(`Created project from "${template.name}" template`)
    } catch {
      toast.error('Failed to create project from template')
    } finally {
      setCreating(false)
    }
  }

  const filteredProjects = projects.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Sort by custom order if available
  const sortedProjects = useMemo(() => {
    if (projectOrder.length === 0) return filteredProjects
    const ordered = [...filteredProjects].sort((a, b) => {
      const aIdx = projectOrder.indexOf(a.id)
      const bIdx = projectOrder.indexOf(b.id)
      if (aIdx === -1 && bIdx === -1) return 0
      if (aIdx === -1) return 1
      if (bIdx === -1) return -1
      return aIdx - bIdx
    })
    return ordered
  }, [filteredProjects, projectOrder])

  const handleDragStart = useCallback((id: string) => {
    setDraggedId(id)
  }, [])

  const handleDragOverCard = useCallback((e: React.DragEvent, id: string) => {
    e.preventDefault()
    setDragOverId(id)
  }, [])

  const handleDragEnd = useCallback(() => {
    if (draggedId && dragOverId && draggedId !== dragOverId) {
      const newOrder = sortedProjects.map(p => p.id)
      const fromIdx = newOrder.indexOf(draggedId)
      const toIdx = newOrder.indexOf(dragOverId)
      if (fromIdx !== -1 && toIdx !== -1) {
        newOrder.splice(fromIdx, 1)
        newOrder.splice(toIdx, 0, draggedId)
        setProjectOrder(newOrder)
        localStorage.setItem('builderai-project-order', JSON.stringify(newOrder))
      }
    }
    setDraggedId(null)
    setDragOverId(null)
  }, [draggedId, dragOverId, sortedProjects])

  const totalFiles = projects.reduce((sum, p) => sum + (p.files?.length || 0), 0)

  // ─── Activity Feed: Generate from projects ────────────────────────
  const activityItems: ActivityItem[] = useMemo(() => generateMockActivities(projects), [projects])

  // ─── Handle Deploy from card ──────────────────────────────────────────
  const handleDeployProject = useCallback((e: React.MouseEvent, project: any) => {
    e.stopPropagation()
    // Dashboard projects don't include files (not loaded from list API),
    // so the DeploymentWizard would crash with undefined files.
    // Direct users to the workspace where files are available.
    toast.info('Open the project first, then use Deploy from the workspace view.', {
      description: `${project.name} — deployment wizard is available in the workspace`,
    })
  }, [])

  return (
    <div className="min-h-screen flex flex-col bg-background page-transition relative">
      {/* Confetti/Sparkle overlay */}
      <AnimatePresence>
        {showConfetti && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 pointer-events-none z-[100] overflow-hidden"
          >
            {Array.from({ length: 24 }).map((_, i) => {
              const x = Math.random() * 100
              const delay = Math.random() * 0.5
              const size = 4 + Math.random() * 8
              const hue = 150 + Math.random() * 40
              return (
                <motion.div
                  key={i}
                  initial={{ y: -20, x: `${x}vw`, opacity: 1, rotate: 0 }}
                  animate={{ y: '100vh', opacity: 0, rotate: 360 + Math.random() * 360 }}
                  transition={{ duration: 1.5 + Math.random(), delay, ease: 'easeOut' }}
                  className="absolute rounded-sm"
                  style={{
                    width: size,
                    height: size,
                    backgroundColor: `hsl(${hue}, 70%, 55%)`,
                    borderRadius: Math.random() > 0.5 ? '50%' : '2px',
                  }}
                />
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm">
              <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
            </div>
            <span className="font-bold text-base sm:text-lg">BuilderAI</span>
            <Badge variant="secondary" className="text-[9px] sm:text-[10px] hidden sm:inline-flex bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800">
              AI-Powered
            </Badge>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <ThemeToggle />
            {onShowTour && (
              <Button variant="ghost" size="icon" onClick={onShowTour} title="Show Tour" className="h-8 w-8 sm:h-9 sm:w-9 min-h-[44px] sm:min-h-0">
                <BookOpen className="w-4 h-4" />
              </Button>
            )}
            <Separator className="h-5 mx-0.5 sm:mx-1" />
            <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
              <AvatarFallback className="bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/40 dark:to-teal-900/40 text-emerald-700 dark:text-emerald-300 text-[10px] sm:text-xs font-semibold">
                {user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs sm:text-sm font-medium hidden sm:block max-w-[120px] truncate">{user?.name || user?.email}</span>
            <Button variant="ghost" size="icon" onClick={() => logout()} title="Sign out" className="h-8 w-8 sm:h-9 sm:w-9 min-h-[44px] sm:min-h-0">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content with optional right sidebar */}
      <main className="flex-1 max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8 w-full">
        <div className="flex gap-6">
          <div className="flex-1 min-w-0">
        {loading ? (
          <DashboardSkeletonShimmer />
        ) : (
          <>
            {/* Welcome Banner */}
            {showWelcomeBanner && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-6 sm:mb-8 relative overflow-hidden rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 p-5 sm:p-6 text-white"
              >
                <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none" />
                <div className="relative z-10 flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold">Welcome to BuilderAI</h2>
                    <p className="text-sm text-white/80 mt-1 max-w-lg">
                      Build websites with AI agents. Describe your vision, and watch it come to life with plan, code, review, and deploy — all automated.
                    </p>
                  </div>
                  <button
                    onClick={handleDismissBanner}
                    className="p-1.5 rounded-lg hover:bg-white/20 transition-colors flex-shrink-0"
                    title="Dismiss banner"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* Hero Section with Gradient Background + Particle Grid */}
            <div className="mb-6 sm:mb-8 relative">
              <div className="absolute -top-8 -left-8 w-64 h-64 bg-emerald-500/5 dark:bg-emerald-500/3 rounded-full blur-3xl pointer-events-none animate-parallax-blob" />
              <div className="absolute -top-4 right-0 w-48 h-48 bg-teal-500/4 dark:bg-teal-500/2 rounded-full blur-3xl pointer-events-none animate-parallax-blob-delay" />
              {/* Subtle particle dot grid in hero background */}
              <div className="absolute inset-0 bg-dot-pattern opacity-30 pointer-events-none" />
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 relative"
              >
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                    Welcome back, {user?.name?.split(' ')[0] || 'Developer'} 👋
                  </h1>
                  <p className="text-sm sm:text-base text-muted-foreground mt-1">
                    Build websites with AI agents. Chat, generate, and deploy.
                  </p>
                </div>
                {/* New Project button with animated gradient border */}
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="relative group">
                    <div className="absolute -inset-0.5 gradient-border-emerald rounded-lg opacity-50 group-hover:opacity-100 blur-sm transition-opacity" />
                    <BrandButton
                      icon={Plus}
                      onClick={() => setShowCreate(true)}
                      className="relative shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 min-h-[44px]"
                    >
                      New Project
                    </BrandButton>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowTemplates(true)}
                    className="h-9 text-xs border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 min-h-[44px] sm:min-h-0"
                  >
                    <Layers className="w-3.5 h-3.5 mr-1.5" />
                    Browse Templates
                  </Button>
                </div>
              </motion.div>
            </div>

            {/* Stats with animated counters and gradient border on hover */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-6 sm:mb-8">
              {[
                { label: 'Total Projects', value: projects.length, icon: FolderKanban, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-200/50 dark:border-emerald-800/50' },
                { label: 'Deployed', value: projects.filter(p => p.status === 'deployed').length, icon: Globe, color: 'text-teal-600 bg-teal-50 dark:bg-teal-950/30', border: 'border-teal-200/50 dark:border-teal-800/50' },
                { label: 'In Progress', value: projects.filter(p => p.status === 'building').length, icon: Clock, color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-200/50 dark:border-amber-800/50' },
                { label: 'Total Files', value: totalFiles, icon: FileCode, color: 'text-violet-600 bg-violet-50 dark:bg-violet-950/30', border: 'border-violet-200/50 dark:border-violet-800/50' },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  whileHover={{ scale: 1.03, y: -2 }}
                  className="gradient-border-hover rounded-lg"
                >
                  <Card className={`hover:shadow-md hover:bg-gradient-to-br hover:from-card hover:to-emerald-50/30 dark:hover:to-emerald-950/10 transition-all border ${stat.border} rounded-lg overflow-hidden relative`}>
                    <CardContent className="p-2.5 sm:p-4 flex items-center gap-2 sm:gap-3 relative">
                      {/* Icon watermark background */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
                        <stat.icon className="w-16 h-16 sm:w-24 sm:h-24 opacity-[0.04] text-foreground" />
                      </div>
                      <div className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl ${stat.color} flex-shrink-0`}>
                        <stat.icon className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-lg sm:text-2xl font-bold">
                          <StatCounter value={stat.value} />
                        </p>
                        <p className="text-[9px] sm:text-xs text-muted-foreground truncate">{stat.label}</p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Getting Started Checklist */}
            <GettingStartedChecklist projectCount={projects.length} />

            {/* Recently Viewed Projects */}
            {projects.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.28 }}
                className="mb-6 sm:mb-8"
              >
                <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                  <Eye className="w-3.5 h-3.5 text-emerald-500" />
                  Recently Viewed
                </h2>
                <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                  {sortedProjects.slice(0, 5).map((project) => {
                    const StatusIcon = STATUS_ICONS[project.status] || FileCode
                    return (
                      <button
                        key={project.id}
                        onClick={() => selectProject(project.id)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border/50 bg-card hover:border-emerald-200 dark:hover:border-emerald-800 hover:shadow-sm transition-all whitespace-nowrap flex-shrink-0"
                      >
                        <StatusIcon className={`w-3 h-3 ${STATUS_COLORS[project.status]?.split(' ')[0] || 'text-muted-foreground'}`} />
                        <span className="text-xs font-medium">{project.name}</span>
                        <Badge variant="secondary" className={`text-[8px] px-1 py-0 h-4 ${STATUS_COLORS[project.status] || ''}`}>
                          {STATUS_LABELS[project.status] || project.status}
                        </Badge>
                      </button>
                    )
                  })}
                </div>
              </motion.div>
            )}

            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mb-6 sm:mb-8"
            >
              <h2 className="text-sm font-semibold text-muted-foreground mb-3">Quick Actions</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                {[
                  { icon: Plus, label: 'New Project', desc: 'Start from scratch', color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200/50 dark:border-emerald-800/50', action: () => setShowCreate(true) },
                  { icon: Upload, label: 'Import', desc: 'Import existing code', color: 'text-teal-600 bg-teal-50 dark:bg-teal-950/30 border-teal-200/50 dark:border-teal-800/50', action: () => toast.info('Import feature coming soon! You can paste code directly in the chat.') },
                  { icon: Layers, label: 'Templates', desc: 'Browse templates', color: 'text-violet-600 bg-violet-50 dark:bg-violet-950/30 border-violet-200/50 dark:border-violet-800/50', action: () => setShowTemplates(true) },
                  { icon: BookOpen, label: 'Learn', desc: 'Guides & docs', color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/30 border-amber-200/50 dark:border-amber-800/50', action: () => toast.info('Documentation & guides coming soon!') },
                ].map((item, i) => (
                  <motion.button
                    key={item.label}
                    onClick={item.action}
                    className={`flex items-center gap-2.5 p-3 rounded-lg border text-left transition-all hover:shadow-md ${item.color}`}
                    whileHover={{ scale: 1.02, y: -1 }}
                    whileTap={{ scale: 0.98 }}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 + i * 0.05 }}
                  >
                    <item.icon className="w-4 h-4 flex-shrink-0" />
                    <div>
                      <div className="text-xs font-semibold">{item.label}</div>
                      <div className="text-[10px] text-muted-foreground">{item.desc}</div>
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>

            {/* How It Works - show when no projects */}
            {projects.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mb-6 sm:mb-8"
              >
                <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">How It Works</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 relative">
                  {/* Animated connecting lines between steps (desktop only) */}
                  <div className="hidden lg:block absolute top-1/2 left-[12.5%] right-[12.5%] h-[2px] -translate-y-1/2">
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-300/40 via-teal-300/50 to-sky-300/40 dark:from-emerald-700/30 dark:via-teal-700/40 dark:to-sky-700/30" />
                    <div className="absolute inset-0 animate-line-flow h-full rounded-full" />
                    {/* Flowing dot indicators on the line */}
                    <div className="absolute left-[25%] top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-emerald-400 dark:bg-emerald-500 animate-pulse" />
                    <div className="absolute left-[50%] top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-teal-400 dark:bg-teal-500 animate-pulse" style={{ animationDelay: '0.5s' }} />
                    <div className="absolute left-[75%] top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-sky-400 dark:bg-sky-500 animate-pulse" style={{ animationDelay: '1s' }} />
                  </div>
                  {[
                    { icon: Bot, step: '1', title: 'Describe', desc: 'Tell AI what you want to build', color: 'text-violet-600 bg-violet-50 dark:bg-violet-950/30', border: 'border-violet-200/50 dark:border-violet-800/50' },
                    { icon: Layers, step: '2', title: 'Plan', desc: 'AI creates an architecture plan', color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-200/50 dark:border-emerald-800/50' },
                    { icon: Sparkles, step: '3', title: 'Generate', desc: 'Code is generated and reviewed', color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-200/50 dark:border-amber-800/50' },
                    { icon: Rocket, step: '4', title: 'Deploy', desc: 'One-click deploy to production', color: 'text-sky-600 bg-sky-50 dark:bg-sky-950/30', border: 'border-sky-200/50 dark:border-sky-800/50' },
                  ].map((item, i) => (
                    <Card key={item.step} className={`text-center hover:shadow-md transition-all border relative z-10 ${item.border}`}>
                      <CardContent className="p-3 sm:p-4">
                        <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl ${item.color} flex items-center justify-center mx-auto mb-2 sm:mb-3`}>
                          <item.icon className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                        <div className="text-[9px] sm:text-[10px] text-muted-foreground font-medium mb-1">STEP {item.step}</div>
                        <h3 className="font-semibold text-sm">{item.title}</h3>
                        <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
                        {/* Arrow between cards (desktop) */}
                        {i < 3 && (
                          <div className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 z-20">
                            <ChevronRight className="w-4 h-4 text-muted-foreground/40" />
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Activity Feed (inline for non-xl) */}
            {projects.length > 0 && activityItems.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="mb-6 sm:mb-8 xl:hidden"
              >
                <ActivityFeed
                  activities={activityItems}
                  variant="inline"
                  maxVisible={5}
                  onProjectClick={selectProject}
                  showFilters={true}
                />
              </motion.div>
            )}

            {/* Projects Header with Search and View Toggle */}
            {projects.length > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 sm:mb-4 gap-2 sm:gap-4">
                <h2 className="text-base sm:text-lg font-semibold flex-shrink-0">Your Projects</h2>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1 sm:max-w-xs">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                      ref={searchInputRef}
                      placeholder="Search projects..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-9 sm:h-8 pl-8 text-xs sm:text-sm min-h-[44px] sm:min-h-0 transition-all duration-300 focus:w-full focus:sm:max-w-sm"
                    />
                  </div>
                  <div className="flex border rounded-md overflow-hidden flex-shrink-0">
                    <Button
                      variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                      size="icon"
                      className="h-9 w-9 sm:h-7 sm:w-7 rounded-none min-h-[44px] sm:min-h-0"
                      onClick={() => setViewMode('grid')}
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                      size="icon"
                      className="h-9 w-9 sm:h-7 sm:w-7 rounded-none min-h-[44px] sm:min-h-0"
                      onClick={() => setViewMode('list')}
                    >
                      <List className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Projects Grid/List */}
            {projects.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-10 sm:py-16 relative"
              >
                {/* Animated CSS shapes background */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  <div className="absolute top-8 left-[15%] w-12 h-12 rounded-xl border-2 border-emerald-200/30 dark:border-emerald-700/20 rotate-12 animate-float" />
                  <div className="absolute top-16 right-[20%] w-8 h-8 rounded-full border-2 border-teal-200/30 dark:border-teal-700/20 animate-float" style={{ animationDelay: '1s' }} />
                  <div className="absolute bottom-16 left-[25%] w-6 h-6 rounded-sm bg-emerald-100/30 dark:bg-emerald-900/20 rotate-45 animate-float" style={{ animationDelay: '0.5s' }} />
                  <div className="absolute bottom-8 right-[30%] w-10 h-10 rounded-lg border-2 border-violet-200/30 dark:border-violet-700/20 -rotate-12 animate-float" style={{ animationDelay: '1.5s' }} />
                </div>
                <div className="relative z-10">
                  {/* Pulsing code icon in large circle */}
                  <div className="relative w-24 h-24 sm:w-32 sm:h-32 mx-auto mb-5 sm:mb-6">
                    <div className="absolute inset-0 rounded-full bg-emerald-100 dark:bg-emerald-950/30 animate-pulse opacity-50" />
                    <div className="absolute inset-2 rounded-full bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 ring-1 ring-emerald-500/20 flex items-center justify-center">
                      <FileCode className="w-10 h-10 sm:w-14 sm:h-14 text-emerald-500 animate-pulse" />
                    </div>
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold">Start your first project</h3>
                  <p className="text-sm text-muted-foreground mt-2 mb-5 max-w-xs mx-auto leading-relaxed">
                    Describe what you want to build and our AI agents will generate the code for you.
                  </p>
                  <Button
                    onClick={() => setShowCreate(true)}
                    className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white min-h-[44px] shadow-lg shadow-emerald-500/25"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Project
                  </Button>
                  <div className="mt-3">
                    <button
                      onClick={() => setShowTemplates(true)}
                      className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline underline-offset-2 transition-colors"
                    >
                      Or try a template
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <>
                {filteredProjects.length === 0 && searchQuery && (
                  <div className="text-center py-8">
                    <Search className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No projects match &quot;{searchQuery}&quot;</p>
                  </div>
                )}
                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    <AnimatePresence>
                      {sortedProjects.map((project, i) => (
                        <ProjectCard key={project.id} project={project} index={i} onSelect={selectProject} onDelete={handleDelete} onDeploy={handleDeployProject} draggedId={draggedId} dragOverId={dragOverId} onDragStart={handleDragStart} onDragOver={handleDragOverCard} onDragEnd={handleDragEnd} />
                      ))}
                    </AnimatePresence>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <AnimatePresence>
                      {sortedProjects.map((project, i) => (
                        <ProjectListItem key={project.id} project={project} index={i} onSelect={selectProject} onDelete={handleDelete} />
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </>
            )}
          </>
        )}
          </div>

          {/* Right sidebar - Activity Feed Widget (desktop XL only) */}
          <div className="hidden xl:block w-72 flex-shrink-0">
            <div className="sticky top-20">
              <ActivityFeed
                activities={activityItems}
                variant="widget"
                maxVisible={15}
                onProjectClick={selectProject}
                showFilters={true}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Footer with gradient separator */}
      <footer className="mt-auto relative">
        <div className="h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-4 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Zap className="w-3 h-3 text-emerald-500" />
            <span>BuilderAI &copy; {new Date().getFullYear()}</span>
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            <span>Powered by AI</span>
            <span className="hidden sm:inline">Built with Next.js</span>
          </div>
        </div>
      </footer>

      {/* Create Project Dialog - Full-screen on mobile */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md max-w-[calc(100%-1.5rem)] max-h-[90vh] sm:max-h-none p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />
              Create New Project
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Start a new AI-powered web project
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 sm:space-y-4 mt-1 sm:mt-2">
            <div className="space-y-1.5 sm:space-y-2">
              <label className="text-xs sm:text-sm font-medium">Project Name</label>
              <Input
                placeholder="My Awesome App"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                autoFocus
                className="h-11 sm:h-10 text-sm min-h-[44px]"
              />
            </div>
            <div className="space-y-1.5 sm:space-y-2">
              <label className="text-xs sm:text-sm font-medium">Description (optional)</label>
              <Textarea
                placeholder="A brief description of your project..."
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                rows={3}
                className="text-sm"
              />
            </div>
            <Button onClick={handleCreate} className="w-full h-11 sm:h-10 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white min-h-[44px] sm:min-h-0" disabled={creating || !newName.trim()}>
              {creating ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              Create Project
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Keyboard Shortcut Help Dialog */}
      <KeyboardShortcutHelp />
      {/* Templates Marketplace Dialog */}
      <TemplatesMarketplace
        open={showTemplates}
        onOpenChange={setShowTemplates}
        onUseTemplate={handleUseTemplate}
      />
    </div>
  )
}

function ProjectCard({ project, index, onSelect, onDelete, onDeploy, draggedId, dragOverId, onDragStart, onDragOver, onDragEnd }: {
  project: any
  index: number
  onSelect: (id: string) => void
  onDelete: (e: React.MouseEvent, id: string) => Promise<void>
  onDeploy: (e: React.MouseEvent, project: any) => void
  draggedId: string | null
  dragOverId: string | null
  onDragStart: (id: string) => void
  onDragOver: (e: React.DragEvent, id: string) => void
  onDragEnd: () => void
}) {
  const StatusIcon = STATUS_ICONS[project.status] || FileCode
  const wasEditedRecently = (Date.now() - new Date(project.updatedAt).getTime()) < 3600000 // 1 hour
  const isDragging = draggedId === project.id
  const isDragOver = dragOverId === project.id
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ scale: 1.02 }}
      draggable
      onDragStart={() => onDragStart(project.id)}
      onDragOver={(e) => onDragOver(e, project.id)}
      onDragEnd={onDragEnd}
      className={`${isDragging ? 'opacity-50 scale-95' : ''} ${isDragOver ? 'ring-2 ring-emerald-400 ring-offset-2' : ''}`}
    >
      <Card
        className="cursor-pointer hover:shadow-lg hover:border-emerald-200 dark:hover:border-emerald-800 transition-all group relative overflow-hidden hover:shadow-[0_0_30px_rgba(16,185,129,0.15)] gradient-border-hover"
        onClick={() => onSelect(project.id)}
      >
        {/* Gradient accent on top - color based on status */}
        <div className={`h-1.5 transition-opacity ${
          project.status === 'draft'
            ? 'bg-gradient-to-r from-slate-300 to-slate-400 dark:from-slate-600 dark:to-slate-700 opacity-60 group-hover:opacity-100'
            : project.status === 'building'
            ? 'bg-gradient-to-r from-amber-400 to-orange-500 opacity-70 group-hover:opacity-100'
            : project.status === 'ready'
            ? 'bg-gradient-to-r from-emerald-400 to-teal-500 opacity-70 group-hover:opacity-100'
            : project.status === 'deployed'
            ? 'bg-gradient-to-r from-sky-400 to-blue-500 opacity-70 group-hover:opacity-100'
            : 'bg-gradient-to-r from-emerald-400 to-teal-500 opacity-0 group-hover:opacity-100'
        }`} />
        <CardHeader className="pb-1.5 sm:pb-2 p-3 sm:p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 flex items-center justify-center flex-shrink-0">
                <StatusIcon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 dark:text-emerald-400 ${project.status === 'building' ? 'animate-spin' : ''}`} />
              </div>
              <CardTitle className="text-sm sm:text-base group-hover:text-emerald-600 transition-colors">
                {project.name}
              </CardTitle>
              {wasEditedRecently && (
                <Badge className="text-[8px] px-1 py-0 h-4 bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 animate-pulse">
                  Recently Edited
                </Badge>
              )}
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="secondary" className={`text-[9px] sm:text-[10px] px-1 sm:px-1.5 cursor-help ${STATUS_COLORS[project.status] || STATUS_COLORS.draft}`}>
                    {STATUS_LABELS[project.status] || project.status}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-[10px]">
                  {project.status === 'draft' ? 'Project is in draft mode - start chatting to generate code' :
                   project.status === 'building' ? 'AI agents are currently generating your project' :
                   project.status === 'ready' ? 'Project has been generated and is ready to use' :
                   project.status === 'deployed' ? 'Project has been deployed to production' :
                   'Unknown project status'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <CardDescription className="line-clamp-2 ml-7 sm:ml-10 text-xs sm:text-sm">
            {project.description || 'No description'}
          </CardDescription>
          <p className="text-[10px] text-muted-foreground/60 ml-7 sm:ml-10 mt-1">
            Last edited {getRelativeTime(project.updatedAt)}
          </p>
        </CardHeader>
        <CardContent className="pt-0 p-3 sm:p-6">
          <div className="flex items-center justify-between ml-7 sm:ml-10">
            <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(project.updatedAt).toLocaleDateString()}
              </div>
              {project.files?.length > 0 && (
                <div className="flex items-center gap-1">
                  <FileCode className="w-3 h-3" />
                  {project.files.length} files
                </div>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 sm:h-7 sm:w-7 min-h-[44px] sm:min-h-0 opacity-0 group-hover:opacity-100 transition-opacity text-emerald-600 hover:text-emerald-700"
                onClick={(e) => { e.stopPropagation(); api.exportProject(project.id).then(() => toast.success('Exported as ZIP')).catch(() => toast.error('Export failed')) }}
                title="Export as ZIP"
              >
                <Download className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 sm:h-7 sm:w-7 min-h-[44px] sm:min-h-0 opacity-0 group-hover:opacity-100 transition-opacity text-emerald-600 hover:text-emerald-700"
                onClick={(e) => onDeploy(e, project)}
                title="Deploy project"
              >
                <Rocket className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 sm:h-7 sm:w-7 min-h-[44px] sm:min-h-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => onDelete(e, project.id)}
              >
                <Trash2 className="w-3.5 h-3.5 text-destructive" />
              </Button>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-emerald-500 transition-colors" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function ProjectListItem({ project, index, onSelect, onDelete }: {
  project: any
  index: number
  onSelect: (id: string) => void
  onDelete: (e: React.MouseEvent, id: string) => Promise<void>
}) {
  const StatusIcon = STATUS_ICONS[project.status] || FileCode
  const wasEditedRecently = (Date.now() - new Date(project.updatedAt).getTime()) < 3600000
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      transition={{ delay: index * 0.03 }}
      whileHover={{ x: 4 }}
    >
      <Card
        className="cursor-pointer hover:shadow-md hover:border-emerald-200 dark:hover:border-emerald-800 transition-all group gradient-border-hover"
        onClick={() => onSelect(project.id)}
      >
        <CardContent className="p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 flex items-center justify-center flex-shrink-0">
            <StatusIcon className={`w-4 h-4 text-emerald-600 dark:text-emerald-400 ${project.status === 'building' ? 'animate-spin' : ''}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm truncate group-hover:text-emerald-600 transition-colors">
                {project.name}
              </span>
              <Badge variant="secondary" className={`text-[9px] px-1 ${STATUS_COLORS[project.status] || STATUS_COLORS.draft}`}>
                {STATUS_LABELS[project.status] || project.status}
              </Badge>
              {wasEditedRecently && (
                <Badge className="text-[8px] px-1 py-0 h-4 bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 animate-pulse">
                  Recently Edited
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate">{project.description || 'No description'}</p>
            <p className="text-[10px] text-muted-foreground/60 mt-0.5">
              Last edited {getRelativeTime(project.updatedAt)}
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-shrink-0">
            <Clock className="w-3 h-3" />
            <span className="hidden sm:inline">{new Date(project.updatedAt).toLocaleDateString()}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 min-h-[44px] sm:min-h-0 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => onDelete(e, project.id)}
            >
              <Trash2 className="w-3 h-3 text-destructive" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
