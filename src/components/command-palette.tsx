'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import {
  FileCode, FileJson, FileText, FileType, Folder,
  Plus, Shield, Rocket, Sun, Moon, PanelLeft, Maximize2,
  Download, Settings2, Keyboard, LayoutDashboard, MessageSquare,
  Code2, Eye, History, Brain, Activity, Search,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { useProjectStore, type ProjectFile } from '@/stores/project-store'

// ─── Types ─────────────────────────────────────────────────────────────────

export interface CommandPaletteAction {
  id: string
  label: string
  description?: string
  icon?: React.ElementType
  shortcut?: string[]
  section: 'files' | 'actions' | 'navigation' | 'settings'
  onSelect: () => void
  keywords?: string[]
  filePath?: string
  language?: string
}

interface UseCommandPaletteOptions {
  onOpenFile?: (file: ProjectFile) => void
  onNavigate?: (tab: string) => void
  onAction?: (actionId: string) => void
  onToggleSidebar?: () => void
  onToggleFocusMode?: () => void
  onValidate?: () => void
  onExportZip?: () => void
  onNewProject?: () => void
  onDeploy?: () => void
  onOpenSettings?: () => void
  onShowShortcuts?: () => void
  onGoDashboard?: () => void
}

// ─── Helper: File language icon ────────────────────────────────────────────

function getFileIcon(path: string): React.ElementType {
  const ext = path.split('.').pop()?.toLowerCase() || ''
  const iconMap: Record<string, React.ElementType> = {
    tsx: FileType,
    ts: FileType,
    jsx: FileCode,
    js: FileCode,
    json: FileJson,
    css: FileText,
    html: FileCode,
    md: FileText,
    yml: FileText,
    yaml: FileText,
    prisma: FileCode,
    sql: FileText,
  }
  return iconMap[ext] || FileCode
}

function getLanguageLabel(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() || ''
  const langMap: Record<string, string> = {
    tsx: 'TSX',
    ts: 'TypeScript',
    jsx: 'JSX',
    js: 'JavaScript',
    json: 'JSON',
    css: 'CSS',
    html: 'HTML',
    md: 'Markdown',
    yml: 'YAML',
    yaml: 'YAML',
    prisma: 'Prisma',
    sql: 'SQL',
  }
  return langMap[ext] || ext.toUpperCase()
}

// ─── Fuzzy Match ───────────────────────────────────────────────────────────

function fuzzyMatch(query: string, text: string): boolean {
  if (!query) return true
  const lowerQuery = query.toLowerCase()
  const lowerText = text.toLowerCase()
  // Direct substring match
  if (lowerText.includes(lowerQuery)) return true
  // Fuzzy character-by-character match
  let qi = 0
  for (let ti = 0; ti < lowerText.length && qi < lowerQuery.length; ti++) {
    if (lowerText[ti] === lowerQuery[qi]) qi++
  }
  return qi === lowerQuery.length
}

// ─── Hook: useCommandPalette ───────────────────────────────────────────────

export function useCommandPalette(options: UseCommandPaletteOptions = {}) {
  const [open, setOpen] = useState(false)
  const files = useProjectStore((s) => s.files)

  const toggle = useCallback(() => setOpen((prev) => !prev), [])
  const close = useCallback(() => setOpen(false), [])
  const openPalette = useCallback(() => setOpen(true), [])

  // Register Ctrl+K / Cmd+K shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
      const modifierKey = isMac ? e.metaKey : e.ctrlKey
      if (modifierKey && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        toggle()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [toggle])

  // Build the actions list
  const actions: CommandPaletteAction[] = useMemo(() => {
    const result: CommandPaletteAction[] = []

    // ── Files section ──
    for (const file of files) {
      const Icon = getFileIcon(file.path)
      result.push({
        id: `file-${file.id}`,
        label: file.path.split('/').pop() || file.path,
        description: file.path,
        icon: Icon,
        section: 'files',
        filePath: file.path,
        language: getLanguageLabel(file.path),
        keywords: [file.path, file.language || '', getLanguageLabel(file.path)],
        onSelect: () => {
          options.onOpenFile?.(file)
          close()
        },
      })
    }

    // ── Actions section ──
    const actionDefs: Array<{
      id: string
      label: string
      description: string
      icon: React.ElementType
      shortcut?: string[]
      action: () => void
      keywords?: string[]
    }> = [
      {
        id: 'new-project',
        label: 'New Project',
        description: 'Create a new project',
        icon: Plus,
        shortcut: undefined,
        action: () => { options.onNewProject?.() },
        keywords: ['create', 'new', 'project'],
      },
      {
        id: 'validate',
        label: 'Validate Project',
        description: 'Run validation checks',
        icon: Shield,
        action: () => { options.onValidate?.() },
        keywords: ['check', 'lint', 'validate', 'test'],
      },
      {
        id: 'deploy',
        label: 'Deploy',
        description: 'Deploy project to production',
        icon: Rocket,
        action: () => { options.onDeploy?.() },
        keywords: ['deploy', 'publish', 'release'],
      },
      {
        id: 'toggle-theme',
        label: 'Toggle Theme',
        description: 'Switch between light and dark mode',
        icon: Sun,
        action: () => { options.onAction?.('toggle-theme') },
        keywords: ['theme', 'dark', 'light', 'mode'],
      },
      {
        id: 'toggle-sidebar',
        label: 'Toggle Sidebar',
        description: 'Show or hide the file sidebar',
        icon: PanelLeft,
        shortcut: ['⌘', 'B'],
        action: () => { options.onToggleSidebar?.() },
        keywords: ['sidebar', 'panel', 'files', 'toggle'],
      },
      {
        id: 'focus-mode',
        label: 'Focus Mode',
        description: 'Maximize the editor panel',
        icon: Maximize2,
        action: () => { options.onToggleFocusMode?.() },
        keywords: ['focus', 'zen', 'maximize', 'distraction'],
      },
      {
        id: 'export-zip',
        label: 'Export ZIP',
        description: 'Download project as a ZIP file',
        icon: Download,
        action: () => { options.onExportZip?.() },
        keywords: ['export', 'download', 'zip', 'archive'],
      },
    ]

    for (const def of actionDefs) {
      result.push({
        id: `action-${def.id}`,
        label: def.label,
        description: def.description,
        icon: def.icon,
        shortcut: def.shortcut,
        section: 'actions',
        keywords: def.keywords,
        onSelect: () => {
          def.action()
          close()
        },
      })
    }

    // ── Navigation section ──
    const navDefs: Array<{
      id: string
      label: string
      description: string
      icon: React.ElementType
      tab: string
      keywords?: string[]
    }> = [
      { id: 'dashboard', label: 'Go to Dashboard', description: 'Return to project list', icon: LayoutDashboard, tab: 'dashboard', keywords: ['home', 'dashboard', 'projects'] },
      { id: 'chat', label: 'Go to Chat', description: 'Open AI chat panel', icon: MessageSquare, tab: 'chat', keywords: ['chat', 'ai', 'message'] },
      { id: 'code', label: 'Go to Code', description: 'Open code editor', icon: Code2, tab: 'code', keywords: ['code', 'editor', 'file'] },
      { id: 'preview', label: 'Go to Preview', description: 'Open project preview', icon: Eye, tab: 'preview', keywords: ['preview', 'browser', 'view'] },
      { id: 'validate', label: 'Go to Validate', description: 'Open validation panel', icon: Shield, tab: 'validate', keywords: ['validate', 'check', 'lint'] },
      { id: 'history', label: 'Go to History', description: 'View version history', icon: History, tab: 'history', keywords: ['history', 'version', 'snapshot'] },
      { id: 'memory', label: 'Go to Memory', description: 'View project memory', icon: Brain, tab: 'memory', keywords: ['memory', 'context', 'notes'] },
      { id: 'analytics', label: 'Go to Analytics', description: 'View project analytics', icon: Activity, tab: 'analytics', keywords: ['analytics', 'stats', 'metrics'] },
    ]

    for (const def of navDefs) {
      result.push({
        id: `nav-${def.id}`,
        label: def.label,
        description: def.description,
        icon: def.icon,
        section: 'navigation',
        keywords: def.keywords,
        onSelect: () => {
          options.onNavigate?.(def.tab)
          close()
        },
      })
    }

    // ── Settings section ──
    const settingsDefs: Array<{
      id: string
      label: string
      description: string
      icon: React.ElementType
      shortcut?: string[]
      action: () => void
      keywords?: string[]
    }> = [
      {
        id: 'project-settings',
        label: 'Project Settings',
        description: 'Configure project properties',
        icon: Settings2,
        action: () => { options.onOpenSettings?.() },
        keywords: ['settings', 'config', 'project', 'properties'],
      },
      {
        id: 'keyboard-shortcuts',
        label: 'Keyboard Shortcuts',
        description: 'View all keyboard shortcuts',
        icon: Keyboard,
        shortcut: ['⌘', '/'],
        action: () => { options.onShowShortcuts?.() },
        keywords: ['shortcuts', 'keyboard', 'hotkey', 'key'],
      },
      {
        id: 'toggle-theme-settings',
        label: 'Toggle Theme',
        description: 'Switch between light and dark mode',
        icon: Moon,
        action: () => { options.onAction?.('toggle-theme') },
        keywords: ['theme', 'dark', 'light', 'mode', 'appearance'],
      },
    ]

    for (const def of settingsDefs) {
      result.push({
        id: `settings-${def.id}`,
        label: def.label,
        description: def.description,
        icon: def.icon,
        shortcut: def.shortcut,
        section: 'settings',
        keywords: def.keywords,
        onSelect: () => {
          def.action()
          close()
        },
      })
    }

    return result
  }, [files, options, close])

  return { open, setOpen, toggle, close, openPalette, actions }
}

// ─── Section Labels ────────────────────────────────────────────────────────

const SECTION_CONFIG: Record<string, { label: string; icon: React.ElementType; order: number }> = {
  files: { label: 'Files', icon: Folder, order: 0 },
  actions: { label: 'Actions', icon: Rocket, order: 1 },
  navigation: { label: 'Navigation', icon: LayoutDashboard, order: 2 },
  settings: { label: 'Settings', icon: Settings2, order: 3 },
}

// ─── CommandPalette Component ──────────────────────────────────────────────

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  actions: CommandPaletteAction[]
}

export function CommandPalette({ open, onOpenChange, actions }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const { theme, setTheme } = useTheme()

  // Focus input when dialog opens
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => inputRef.current?.focus(), 100)
      return () => clearTimeout(timer)
    }
  }, [open])

  // Handle theme toggle action
  const handleSelect = useCallback((action: CommandPaletteAction) => {
    if (action.id === 'action-toggle-theme' || action.id === 'settings-toggle-theme-settings') {
      setTheme(theme === 'dark' ? 'light' : 'dark')
    }
    action.onSelect()
  }, [theme, setTheme])

  // Filter and group actions
  const filteredActions = useMemo(() => {
    if (!query.trim()) return actions
    return actions.filter((action) => {
      const searchText = [
        action.label,
        action.description || '',
        action.filePath || '',
        action.language || '',
        ...(action.keywords || []),
      ].join(' ')
      return fuzzyMatch(query, searchText)
    })
  }, [actions, query])

  // Group by section
  const groupedActions = useMemo(() => {
    const groups: Record<string, CommandPaletteAction[]> = {}
    for (const action of filteredActions) {
      if (!groups[action.section]) groups[action.section] = []
      groups[action.section].push(action)
    }
    // Sort by section order
    const sorted = Object.entries(groups).sort(
      ([a], [b]) => (SECTION_CONFIG[a]?.order ?? 99) - (SECTION_CONFIG[b]?.order ?? 99)
    )
    return sorted
  }, [filteredActions])

  // Handle keyboard navigation within the list
  const flatActions = useMemo(() => filteredActions, [filteredActions])

  // Handle query change - reset active index
  const handleQueryChange = useCallback((value: string) => {
    setQuery(value)
    setActiveIndex(0)
  }, [])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((prev) => (prev + 1) % flatActions.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((prev) => (prev - 1 + flatActions.length) % flatActions.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const action = flatActions[activeIndex]
      if (action) handleSelect(action)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onOpenChange(false)
    }
  }, [flatActions, activeIndex, handleSelect, onOpenChange])

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={() => onOpenChange(false)}
            aria-hidden="true"
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="fixed inset-x-0 top-[15%] z-50 mx-auto w-full max-w-2xl px-4"
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
          >
            <div className="rounded-xl border border-border/50 bg-background/80 backdrop-blur-xl shadow-2xl shadow-black/20 overflow-hidden">
              {/* Search Header */}
              <div className="flex items-center gap-3 px-4 border-b border-border/50">
                <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => handleQueryChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a command or search..."
                  className="flex-1 h-12 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  aria-label="Search commands"
                  autoComplete="off"
                  spellCheck={false}
                />
                <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-muted/80 border border-border/50 text-[10px] text-muted-foreground font-mono">
                  Esc
                </kbd>
              </div>

              {/* Results */}
              <div className="max-h-80 overflow-y-auto overscroll-contain custom-scrollbar" role="listbox">
                {flatActions.length === 0 ? (
                  <div className="py-10 text-center text-sm text-muted-foreground">
                    <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p>No results found</p>
                    <p className="text-xs mt-1">Try a different search term</p>
                  </div>
                ) : (
                  <div className="py-1">
                    {groupedActions.map(([section, items], groupIdx) => {
                      const config = SECTION_CONFIG[section]
                      if (!config) return null
                      return (
                        <div key={section} role="group" aria-label={config.label}>
                          {/* Section header */}
                          <div className="flex items-center gap-2 px-4 py-1.5 sticky top-0 bg-background/90 backdrop-blur-sm z-10">
                            <config.icon className="w-3 h-3 text-emerald-500" />
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                              {config.label}
                            </span>
                            <span className="text-[10px] text-muted-foreground/60 ml-auto">
                              {items.length}
                            </span>
                          </div>

                          {/* Items */}
                          {items.map((item) => {
                            const globalIndex = flatActions.indexOf(item)
                            const isActive = globalIndex === activeIndex
                            const Icon = item.icon || FileCode

                            return (
                              <div
                                key={item.id}
                                role="option"
                                aria-selected={isActive}
                                className={`
                                  flex items-center gap-3 px-4 py-2 mx-1 rounded-lg cursor-pointer
                                  transition-colors duration-75
                                  ${isActive
                                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                                    : 'text-foreground hover:bg-muted/50'
                                  }
                                `}
                                onClick={() => handleSelect(item)}
                                onMouseEnter={() => setActiveIndex(globalIndex)}
                              >
                                {/* Icon */}
                                <div className={`
                                  flex items-center justify-center w-7 h-7 rounded-md flex-shrink-0
                                  ${isActive
                                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                    : 'bg-muted/50 text-muted-foreground'
                                  }
                                `}>
                                  <Icon className="w-3.5 h-3.5" />
                                </div>

                                {/* Label & Description */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium truncate">{item.label}</span>
                                    {item.language && section === 'files' && (
                                      <Badge
                                        variant="secondary"
                                        className="text-[9px] px-1 py-0 h-4 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-0 flex-shrink-0"
                                      >
                                        {item.language}
                                      </Badge>
                                    )}
                                  </div>
                                  {item.description && (
                                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                                      {item.description}
                                    </p>
                                  )}
                                </div>

                                {/* Shortcut */}
                                {item.shortcut && (
                                  <div className="hidden sm:flex items-center gap-0.5 flex-shrink-0">
                                    {item.shortcut.map((key, i) => (
                                      <kbd
                                        key={i}
                                        className={`
                                          px-1 py-0.5 rounded text-[10px] font-mono border
                                          ${isActive
                                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                                            : 'bg-muted/50 border-border/50 text-muted-foreground'
                                          }
                                        `}
                                      >
                                        {key}
                                      </kbd>
                                    ))}
                                  </div>
                                )}

                                {/* Active indicator */}
                                {isActive && (
                                  <div className="w-1 h-4 rounded-full bg-emerald-500 flex-shrink-0" />
                                )}
                              </div>
                            )
                          })}

                          {/* Separator between groups */}
                          {groupIdx < groupedActions.length - 1 && (
                            <div className="my-1 mx-4 border-t border-border/30" />
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-4 py-2 border-t border-border/50 bg-muted/20">
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <kbd className="px-1 py-0.5 rounded bg-muted/80 border border-border/50 text-[9px] font-mono">↑↓</kbd>
                    Navigate
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1 py-0.5 rounded bg-muted/80 border border-border/50 text-[9px] font-mono">↵</kbd>
                    Select
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1 py-0.5 rounded bg-muted/80 border border-border/50 text-[9px] font-mono">Esc</kbd>
                    Close
                  </span>
                </div>
                <div className="text-[10px] text-muted-foreground/60">
                  BuilderAI
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
