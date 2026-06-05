'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { motion, AnimatePresence } from 'framer-motion'
import { useProjectStore } from '@/stores/project-store'
import { useChatStore } from '@/stores/chat-store'
import {
  Eye, Download, FolderTree, Loader2, FileCode, FolderOpen,
  CheckCircle2, XCircle, Layers, Code2, Monitor, RefreshCw,
  ExternalLink, FileText, FileJson, FileType, AlertCircle, FileSearch,
  Bot, Shield, Rocket, Save, ChevronDown, ChevronRight,
  Package, Braces, Palette, Settings2, Hash, Clock,
  Calendar, Zap, FileIcon, FileType2, GalleryVertical,
} from 'lucide-react'

// ─── Utility functions ─────────────────────────────────────────────

function getFileExtension(path: string): string {
  return path.split('.').pop()?.toLowerCase() || ''
}

function getFileName(path: string): string {
  return path.split('/').pop() || path
}

function formatRelativeTime(dateStr: string): string {
  if (!dateStr) return 'N/A'
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 30) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ─── Animated Counter Hook ─────────────────────────────────────────

function useAnimatedCounter(target: number, duration = 1000, delay = 300) {
  const [count, setCount] = useState(0)
  const hasAnimated = useRef(false)

  useEffect(() => {
    if (hasAnimated.current) return
    hasAnimated.current = true

    let startTime: number | null = null
    const startValue = 0

    const animate = (timestamp: number) => {
      if (startTime === null) {
        startTime = timestamp + delay
      }
      if (timestamp < startTime) {
        requestAnimationFrame(animate)
        return
      }
      const elapsed = timestamp - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3) // ease-out cubic
      setCount(Math.round(startValue + (target - startValue) * eased))
      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }

    requestAnimationFrame(animate)
  }, [target, duration, delay])

  return count
}

// ─── File categorization ───────────────────────────────────────────

type FileCategory = 'Pages' | 'Components' | 'Styles' | 'Config' | 'Other'

interface CategorizedFile {
  path: string
  content: string
  lines: number
  size: number
  ext: string
}

function categorizeFile(path: string): FileCategory {
  const ext = getFileExtension(path)
  const lower = path.toLowerCase()

  // Pages: app/ directory page files
  if ((lower.includes('app/') || lower.includes('pages/')) &&
      (ext === 'tsx' || ext === 'jsx' || ext === 'ts' || ext === 'js') &&
      (lower.includes('page.') || lower.includes('layout.') || lower.includes('loading.') ||
       lower.includes('error.') || lower.includes('not-found.') || lower.includes('template.'))) {
    return 'Pages'
  }

  // Components: files in components/ directory
  if (lower.includes('components/') || lower.includes('/ui/')) {
    return 'Components'
  }

  // Styles
  if (ext === 'css' || ext === 'scss' || ext === 'less' || ext === 'sass' || ext === 'module.css') {
    return 'Styles'
  }

  // Config files
  if (
    lower.includes('package.json') ||
    lower.includes('tsconfig') ||
    lower.includes('.eslintrc') ||
    lower.includes('.prettierrc') ||
    lower.includes('next.config') ||
    lower.includes('tailwind.config') ||
    lower.includes('postcss.config') ||
    lower.includes('.env') ||
    lower.includes('prisma/') ||
    lower.includes('.gitignore') ||
    lower.includes('vercel.json') ||
    lower.includes('dockerfile') ||
    lower.includes('docker-compose') ||
    lower.includes('vite.config') ||
    ext === 'prisma'
  ) {
    return 'Config'
  }

  return 'Other'
}

const CATEGORY_CONFIG: Record<FileCategory, { icon: React.ElementType; color: string; bgColor: string }> = {
  Pages: { icon: FileCode, color: 'text-sky-500', bgColor: 'bg-sky-50 dark:bg-sky-950/30' },
  Components: { icon: Braces, color: 'text-violet-500', bgColor: 'bg-violet-50 dark:bg-violet-950/30' },
  Styles: { icon: Palette, color: 'text-pink-500', bgColor: 'bg-pink-50 dark:bg-pink-950/30' },
  Config: { icon: Settings2, color: 'text-amber-500', bgColor: 'bg-amber-50 dark:bg-amber-950/30' },
  Other: { icon: FileIcon, color: 'text-gray-500', bgColor: 'bg-gray-50 dark:bg-gray-950/30' },
}

// ─── Sub-components ────────────────────────────────────────────────

function FileTypeBar({ files }: { files: Array<{ path: string; content: string }> }) {
  if (files.length === 0) return null

  // Compute proportions
  const counts: Record<string, number> = {}
  for (const f of files) {
    const ext = getFileExtension(f.path).toUpperCase() || 'OTHER'
    counts[ext] = (counts[ext] || 0) + 1
  }

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
  const total = files.length

  const barColors: Record<string, string> = {
    TSX: 'bg-sky-500',
    TS: 'bg-sky-400',
    JSX: 'bg-amber-500',
    JS: 'bg-amber-400',
    CSS: 'bg-purple-500',
    JSON: 'bg-yellow-500',
    MD: 'bg-gray-400',
    HTML: 'bg-orange-500',
    ENV: 'bg-emerald-500',
    PRISMA: 'bg-teal-500',
    OTHER: 'bg-gray-300 dark:bg-gray-600',
  }

  return (
    <div className="space-y-2">
      <div className="flex h-2.5 rounded-full overflow-hidden bg-muted">
        {sorted.map(([ext, count]) => (
          <motion.div
            key={ext}
            initial={{ width: 0 }}
            animate={{ width: `${(count / total) * 100}%` }}
            transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
            className={`${barColors[ext] || 'bg-gray-400'} first:rounded-l-full last:rounded-r-full min-w-[3px]`}
            title={`${ext}: ${count} file${count > 1 ? 's' : ''}`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {sorted.map(([ext, count]) => (
          <div key={ext} className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${barColors[ext] || 'bg-gray-400'}`} />
            <span className="text-[10px] text-muted-foreground">{ext}</span>
            <span className="text-[10px] text-muted-foreground/60">{count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function HealthScoreWidget({ files }: { files: Array<{ path: string }> }) {
  // Health checks with updated scoring
  const hasPackageJson = files.some(f => f.path.includes('package.json'))
  const hasTsConfig = files.some(f => f.path.includes('tsconfig'))
  const hasReadme = files.some(f => f.path.toLowerCase().includes('readme'))
  const hasAppDir = files.some(f => f.path.includes('app/'))
  const fileCountGt5 = files.length > 5
  const hasConfigFiles = files.some(f =>
    f.path.includes('.env') || f.path.includes('next.config') ||
    f.path.includes('tailwind.config') || f.path.includes('postcss.config')
  )

  const healthChecks = [
    { label: 'package.json', ok: hasPackageJson, points: 20 },
    { label: 'tsconfig', ok: hasTsConfig, points: 15 },
    { label: 'README', ok: hasReadme, points: 15 },
    { label: 'app/ directory', ok: hasAppDir, points: 20 },
    { label: '5+ files', ok: fileCountGt5, points: 15 },
    { label: 'Config files', ok: hasConfigFiles, points: 15 },
  ]

  const healthScore = healthChecks.reduce((sum, c) => sum + (c.ok ? c.points : 0), 0)
  const animatedScore = useAnimatedCounter(healthScore, 1200, 400)

  const healthColorClass =
    healthScore >= 71 ? 'text-emerald-500' :
    healthScore >= 41 ? 'text-amber-500' :
    'text-red-500'

  const healthRingColor =
    healthScore >= 71 ? '#10b981' :
    healthScore >= 41 ? '#f59e0b' :
    '#ef4444'

  const healthLabel =
    healthScore >= 71 ? 'Excellent' :
    healthScore >= 41 ? 'Fair' :
    'Needs Work'

  const healthLabelBg =
    healthScore >= 71 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' :
    healthScore >= 41 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' :
    'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'

  const circleRadius = 38
  const circleCircumference = 2 * Math.PI * circleRadius
  const healthOffset = circleCircumference - (healthScore / 100) * circleCircumference

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="rounded-xl border bg-card p-4"
    >
      <div className="flex items-center gap-2 mb-3">
        <Shield className="w-4 h-4 text-emerald-500" />
        <span className="text-xs font-semibold text-foreground">Health Score</span>
        <Badge className={`text-[9px] px-1.5 ml-auto ${healthLabelBg}`}>{healthLabel}</Badge>
      </div>
      <div className="flex items-center gap-4">
        {/* Circular Progress */}
        <div className="relative flex-shrink-0">
          <svg width="90" height="90" viewBox="0 0 90 90" className="-rotate-90">
            <circle
              cx="45"
              cy="45"
              r={circleRadius}
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
              className="text-muted/20"
            />
            <motion.circle
              cx="45"
              cy="45"
              r={circleRadius}
              fill="none"
              stroke={healthRingColor}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circleCircumference}
              initial={{ strokeDashoffset: circleCircumference }}
              animate={{ strokeDashoffset: healthOffset }}
              transition={{ duration: 1.2, ease: 'easeOut', delay: 0.4 }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <span className={`text-2xl font-bold ${healthColorClass}`}>{animatedScore}</span>
              <span className="text-[9px] text-muted-foreground block -mt-0.5">/100</span>
            </div>
          </div>
        </div>
        {/* Breakdown */}
        <div className="flex-1 min-w-0 space-y-1.5">
          {healthChecks.map(check => (
            <div key={check.label} className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {check.ok ? (
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                ) : (
                  <XCircle className="w-3 h-3 text-red-400" />
                )}
                <span className="text-[11px] text-muted-foreground">{check.label}</span>
              </div>
              <span className={`text-[10px] font-medium ${check.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-400'}`}>
                {check.ok ? `+${check.points}` : '0'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

function FileBrowserSection({ files, onSelectFile }: { files: Array<{ id: string; path: string; content: string }>; onSelectFile: (id: string) => void }) {
  const [expandedGroups, setExpandedGroups] = useState<Set<FileCategory>>(new Set(['Pages', 'Components', 'Config']))

  const toggleGroup = (cat: FileCategory) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  // Categorize files
  const grouped: Record<FileCategory, CategorizedFile[]> = {
    Pages: [], Components: [], Styles: [], Config: [], Other: [],
  }

  for (const file of files) {
    const cat = categorizeFile(file.path)
    const lines = file.content.split('\n').length
    const size = new Blob([file.content]).size
    grouped[cat].push({
      path: file.path,
      content: file.content,
      lines,
      size,
      ext: getFileExtension(file.path),
    })
  }

  const categories: FileCategory[] = ['Pages', 'Components', 'Styles', 'Config', 'Other']

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="rounded-xl border bg-card"
    >
      <div className="flex items-center gap-2 p-4 pb-2">
        <FolderOpen className="w-4 h-4 text-amber-500" />
        <span className="text-xs font-semibold text-foreground">File Browser</span>
        <Badge variant="secondary" className="text-[9px] px-1.5 ml-auto">{files.length} files</Badge>
      </div>

      <div className="px-2 pb-2 space-y-0.5">
        {categories.map(cat => {
          const catFiles = grouped[cat]
          if (catFiles.length === 0) return null
          const config = CATEGORY_CONFIG[cat]
          const Icon = config.icon
          const isExpanded = expandedGroups.has(cat)

          return (
            <div key={cat}>
              <button
                onClick={() => toggleGroup(cat)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted/50 transition-colors text-left"
              >
                {isExpanded ? (
                  <ChevronDown className="w-3 h-3 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-3 h-3 text-muted-foreground" />
                )}
                <Icon className={`w-3.5 h-3.5 ${config.color}`} />
                <span className="text-xs font-medium text-foreground">{cat}</span>
                <Badge variant="secondary" className="text-[9px] px-1 ml-auto">{catFiles.length}</Badge>
              </button>
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="pl-6 space-y-0.5 max-h-48 overflow-y-auto custom-scrollbar">
                      {catFiles.map(file => (
                        <button
                          key={file.path}
                          onClick={() => {
                            const found = files.find(f => f.path === file.path)
                            if (found) onSelectFile(found.id)
                          }}
                          className="w-full flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-colors text-left group"
                        >
                          <FileCode className="w-3 h-3 text-muted-foreground group-hover:text-emerald-500 transition-colors flex-shrink-0" />
                          <span className="text-[11px] font-mono truncate text-muted-foreground group-hover:text-foreground transition-colors">
                            {getFileName(file.path)}
                          </span>
                          <span className="text-[9px] text-muted-foreground/50 ml-auto flex-shrink-0">
                            {file.lines}L
                          </span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>
    </motion.div>
  )
}

function QuickActionsBar({
  projectId,
  onValidate,
  onExportZip,
  onSaveVersion,
  exporting,
  creatingVersion,
  validating,
}: {
  projectId?: string
  onValidate: () => void
  onExportZip: () => void
  onSaveVersion: () => void
  exporting: boolean
  creatingVersion: boolean
  validating: boolean
}) {
  const actions = [
    {
      icon: Shield,
      label: 'Validate',
      subtitle: 'Run checks',
      onClick: onValidate,
      loading: validating,
      disabled: validating,
      gradient: 'from-emerald-500 to-teal-500',
    },
    {
      icon: Download,
      label: 'Export ZIP',
      subtitle: 'Download',
      onClick: onExportZip,
      loading: exporting,
      disabled: !projectId || exporting,
      gradient: 'from-teal-500 to-cyan-500',
    },
    {
      icon: Save,
      label: 'Save Version',
      subtitle: 'Snapshot',
      onClick: onSaveVersion,
      loading: creatingVersion,
      disabled: !projectId || creatingVersion,
      gradient: 'from-cyan-500 to-sky-500',
    },
    {
      icon: Rocket,
      label: 'Deploy',
      subtitle: 'Coming soon',
      onClick: () => toast.info('Deployment coming soon!'),
      loading: false,
      disabled: false,
      gradient: 'from-sky-500 to-emerald-500',
    },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="rounded-xl border bg-card p-4"
    >
      <div className="flex items-center gap-2 mb-3">
        <Zap className="w-4 h-4 text-emerald-500" />
        <span className="text-xs font-semibold text-foreground">Quick Actions</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {actions.map((action, i) => {
          const Icon = action.icon
          return (
            <motion.button
              key={action.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 + i * 0.05 }}
              onClick={action.onClick}
              disabled={action.disabled}
              className="group relative rounded-lg border p-3 text-left hover:border-emerald-300 dark:hover:border-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
            >
              {/* Gradient accent line at top */}
              <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${action.gradient} opacity-60 group-hover:opacity-100 transition-opacity`} />
              <div className="flex items-start gap-2">
                {action.loading ? (
                  <Loader2 className="w-4 h-4 text-emerald-500 animate-spin flex-shrink-0" />
                ) : (
                  <Icon className="w-4 h-4 text-emerald-500 flex-shrink-0 group-hover:scale-110 transition-transform" />
                )}
                <div>
                  <div className="text-[11px] font-semibold text-foreground">{action.label}</div>
                  <div className="text-[9px] text-muted-foreground">{action.subtitle}</div>
                </div>
              </div>
            </motion.button>
          )
        })}
      </div>
    </motion.div>
  )
}

function LivePreviewPlaceholder() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="rounded-xl border bg-card p-4"
    >
      <div className="flex items-center gap-2 mb-3">
        <Monitor className="w-4 h-4 text-emerald-500" />
        <span className="text-xs font-semibold text-foreground">Live Preview</span>
      </div>
      {/* Animated gradient border placeholder */}
      <div className="relative rounded-lg overflow-hidden">
        {/* Animated gradient border */}
        <div className="absolute inset-0 rounded-lg p-[2px] animate-gradient-border" style={{
          background: 'linear-gradient(var(--gradient-angle, 0deg), #10b981, #14b8a6, #06b6d4, #10b981)',
        }}>
          <div className="w-full h-full rounded-lg bg-card" />
        </div>
        <div className="relative rounded-lg bg-muted/30 p-8 flex flex-col items-center justify-center min-h-[180px]">
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mb-4 mx-auto shadow-lg shadow-emerald-500/20">
              <Bot className="w-7 h-7 text-white" />
            </div>
          </motion.div>
          <p className="text-sm font-medium text-foreground mb-1">Live Preview Coming Soon</p>
          <p className="text-[11px] text-muted-foreground text-center max-w-[200px]">
            AI preview will render your app here with real-time updates
          </p>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Main Preview Panel ────────────────────────────────────────────

export function PreviewPanel({
  files,
  projectName,
  projectId,
}: {
  files: Array<{ id?: string; path: string; content: string }>
  projectName: string
  projectId?: string
}) {
  const { currentProject, selectFile } = useProjectStore()
  const { conversations } = useChatStore()

  const [exporting, setExporting] = useState(false)
  const [creatingVersion, setCreatingVersion] = useState(false)
  const [validating, setValidating] = useState(false)
  const [editingDescription, setEditingDescription] = useState(false)
  const [descriptionValue, setDescriptionValue] = useState(currentProject?.description || '')
  const [descriptionSaving, setDescriptionSaving] = useState(false)

  // Sync description from project
  useEffect(() => {
    if (currentProject?.description !== undefined) {
      setDescriptionValue(currentProject.description || '')
    }
  }, [currentProject?.description])

  // Compute stats
  let totalLines = 0
  let totalSize = 0
  for (const file of files) {
    totalLines += file.content.split('\n').length
    totalSize += new Blob([file.content]).size
  }

  const conversationsCount = conversations.length

  // Animated counters
  const animatedFileCount = useAnimatedCounter(files.length, 800, 100)
  const animatedLineCount = useAnimatedCounter(totalLines, 1000, 200)
  const animatedConvCount = useAnimatedCounter(conversationsCount, 800, 300)

  // Handlers
  const handleExportZip = async () => {
    if (!projectId) return
    setExporting(true)
    try {
      await api.exportProject(projectId)
      toast.success('Project exported as ZIP')
    } catch {
      toast.error('Failed to export project')
    } finally {
      setExporting(false)
    }
  }

  const handleSaveVersion = async () => {
    if (!projectId) return
    setCreatingVersion(true)
    try {
      await api.createVersion(projectId, `Version ${Date.now()}`)
      toast.success('Version snapshot saved')
    } catch {
      toast.error('Failed to save version')
    } finally {
      setCreatingVersion(false)
    }
  }

  const handleValidate = async () => {
    if (!projectId) return
    setValidating(true)
    try {
      await api.validateProject(projectId)
      toast.success('Validation complete')
    } catch {
      toast.error('Validation failed')
    } finally {
      setValidating(false)
    }
  }

  const handleSaveDescription = async () => {
    if (!projectId) return
    setDescriptionSaving(true)
    try {
      await api.updateProject(projectId, { description: descriptionValue })
      toast.success('Description updated')
      setEditingDescription(false)
    } catch {
      toast.error('Failed to update description')
    } finally {
      setDescriptionSaving(false)
    }
  }

  const handleSelectFile = (fileId: string) => {
    selectFile(fileId)
  }

  // Framework info
  const framework = currentProject?.framework || 'next.js'
  const frameworkBadge = framework.toLowerCase().includes('next') ? 'Next.js' : framework

  // Ensure files have IDs for the store
  const filesWithIds = files.map(f => ({
    ...f,
    id: (f as any).id || f.path,
  }))

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b bg-muted/30 px-3 sm:px-4 py-2 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-emerald-500" />
          <span className="text-xs font-medium text-muted-foreground">Preview</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {files.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Eye className="w-12 h-12 text-emerald-300 dark:text-emerald-700 mx-auto mb-3" />
              </motion.div>
              <h3 className="text-sm font-medium text-muted-foreground">No preview available</h3>
              <p className="text-xs text-muted-foreground/70 mt-1">Generate code with AI to see a preview</p>
            </motion.div>
          </div>
        ) : (
          <ScrollArea className="h-full">
            <div className="p-3 sm:p-4 space-y-3">

              {/* ─── 1. Project Overview Dashboard ─── */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0 }}
                className="rounded-xl border bg-card p-4"
              >
                {/* Project Name + Status */}
                <div className="flex items-start gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0 shadow-md shadow-emerald-500/20">
                    <Zap className="w-4 h-4 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-sm font-bold text-foreground truncate">{projectName}</h2>
                      <Badge className={`text-[9px] px-1.5 ${
                        currentProject?.status === 'ready' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' :
                        currentProject?.status === 'building' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' :
                        currentProject?.status === 'deployed' ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {currentProject?.status || 'draft'}
                      </Badge>
                      <Badge variant="outline" className="text-[9px] px-1.5 border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400">
                        <Package className="w-2.5 h-2.5 mr-0.5" />
                        {frameworkBadge}
                      </Badge>
                    </div>

                    {/* Editable description */}
                    {editingDescription ? (
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <input
                          value={descriptionValue}
                          onChange={e => setDescriptionValue(e.target.value)}
                          className="flex-1 text-[11px] text-muted-foreground bg-muted/50 rounded px-2 py-1 border border-emerald-200 dark:border-emerald-800 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 min-h-[32px]"
                          placeholder="Add a description..."
                          autoFocus
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleSaveDescription()
                            if (e.key === 'Escape') {
                              setEditingDescription(false)
                              setDescriptionValue(currentProject?.description || '')
                            }
                          }}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={handleSaveDescription}
                          disabled={descriptionSaving}
                        >
                          {descriptionSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => {
                            setEditingDescription(false)
                            setDescriptionValue(currentProject?.description || '')
                          }}
                        >
                          <XCircle className="w-3 h-3 text-muted-foreground" />
                        </Button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setEditingDescription(true)}
                        className="mt-0.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors text-left cursor-pointer min-h-[20px]"
                        title="Click to edit description"
                      >
                        {currentProject?.description || 'Add a description...'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Timestamps */}
                <div className="flex items-center gap-4 mt-2 mb-3">
                  {currentProject?.createdAt && (
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      <span>Created {formatRelativeTime(currentProject.createdAt)}</span>
                    </div>
                  )}
                  {currentProject?.updatedAt && (
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>Updated {formatRelativeTime(currentProject.updatedAt)}</span>
                    </div>
                  )}
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="rounded-lg bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 border p-2.5 text-center">
                    <FileCode className="w-3.5 h-3.5 text-emerald-500 mx-auto mb-1" />
                    <div className="text-base font-bold text-emerald-700 dark:text-emerald-300">{animatedFileCount}</div>
                    <div className="text-[9px] text-muted-foreground">Files</div>
                  </div>
                  <div className="rounded-lg bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-950/20 dark:to-cyan-950/20 border p-2.5 text-center">
                    <Hash className="w-3.5 h-3.5 text-teal-500 mx-auto mb-1" />
                    <div className="text-base font-bold text-teal-700 dark:text-teal-300">{animatedLineCount.toLocaleString()}</div>
                    <div className="text-[9px] text-muted-foreground">Lines</div>
                  </div>
                  <div className="rounded-lg bg-gradient-to-br from-cyan-50 to-sky-50 dark:from-cyan-950/20 dark:to-sky-950/20 border p-2.5 text-center">
                    <Layers className="w-3.5 h-3.5 text-cyan-500 mx-auto mb-1" />
                    <div className="text-base font-bold text-cyan-700 dark:text-cyan-300">{animatedConvCount}</div>
                    <div className="text-[9px] text-muted-foreground">Chats</div>
                  </div>
                </div>

                {/* File Type Distribution Bar */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <GalleryVertical className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-[11px] font-semibold text-foreground">File Distribution</span>
                  </div>
                  <FileTypeBar files={files} />
                </div>
              </motion.div>

              {/* ─── 2. Health Score Widget ─── */}
              <HealthScoreWidget files={files} />

              {/* ─── 3. File Browser Section ─── */}
              <FileBrowserSection files={filesWithIds} onSelectFile={handleSelectFile} />

              {/* ─── 4. Quick Actions Bar ─── */}
              <QuickActionsBar
                projectId={projectId}
                onValidate={handleValidate}
                onExportZip={handleExportZip}
                onSaveVersion={handleSaveVersion}
                exporting={exporting}
                creatingVersion={creatingVersion}
                validating={validating}
              />

              {/* ─── 5. Live Preview Placeholder ─── */}
              <LivePreviewPlaceholder />

            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  )
}
