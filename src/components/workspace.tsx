'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useProjectStore } from '@/stores/project-store'
import { useAuthStore } from '@/stores/auth-store'
import { api } from '@/lib/api'
import { ChatPanel } from '@/components/chat-panel'
import { FileTree } from '@/components/file-tree'
import { CodeViewer } from '@/components/code-viewer'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Zap, Code2, Eye, Play,
  CheckCircle2, XCircle, AlertCircle, Loader2, LogOut,
  PanelLeftClose, PanelLeft, FileCode, Shield, Wifi,
  History, Plus, ChevronRight, Download, FolderTree,
  FileText, FileJson, FileType, FolderOpen, Settings2,
  Rocket, Menu, X, Brain, Activity, Maximize2, Minimize2,
  RefreshCw, ExternalLink, Monitor, Layers, FileSearch
} from 'lucide-react'
import { toast } from 'sonner'
import { ThemeToggle } from '@/components/theme-toggle'
import { ProjectSettingsDialog } from '@/components/project-settings-dialog'
import { KeyboardShortcutHelp } from '@/components/keyboard-shortcut-help'
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts'
import { useIsMobile } from '@/hooks/use-mobile'
import { MobileNav, type MobileTab } from '@/components/mobile-nav'
import { NotificationCenter, pushNotification, trackGeneratedFiles } from '@/components/notification-center'
import { UserProfileDropdown } from '@/components/user-profile-dropdown'
import { ProjectMemoryPanel } from '@/components/project-memory-panel'
import { ProjectAnalytics } from '@/components/project-analytics'
import { CommandPalette, useCommandPalette } from '@/components/command-palette'
import { useChatStore } from '@/stores/chat-store'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable'

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  building: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  ready: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  deployed: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400',
}

const VERSION_STATUS_BADGE: Record<string, string> = {
  created: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  restoring: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  restored: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400',
}

interface VersionData {
  id: string
  version: number
  description: string | null
  snapshot: string
  status: string
  createdAt: string
}

export function Workspace() {
  const { currentProject, files, currentFile, selectFile, clearCurrentProject, refreshFiles, projects } = useProjectStore()
  const { user, logout } = useAuthStore()
  const { generatedFiles, conversations, messages, agentPipeline } = useChatStore()
  const isMobile = useIsMobile()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [rightPanel, setRightPanel] = useState('code')
  const [validating, setValidating] = useState(false)
  const [validationResults, setValidationResults] = useState<Array<{ status: string; message: string; details?: string }>>([])
  const [validationSummary, setValidationSummary] = useState<{ total: number; passed: number; failed: number; warnings: number } | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [lastSavedTime, setLastSavedTime] = useState<string>('')

  // Version history state
  const [versions, setVersions] = useState<VersionData[]>([])
  const [loadingVersions, setLoadingVersions] = useState(false)
  const [creatingVersion, setCreatingVersion] = useState(false)
  const [expandedVersions, setExpandedVersions] = useState<Set<string>>(new Set())
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [focusMode, setFocusMode] = useState(false)

  // Memory count for tab indicator
  const [memoryCount, setMemoryCount] = useState(0)

  // Mobile state
  const [mobileTab, setMobileTab] = useState<MobileTab>('chat')
  const [fileSheetOpen, setFileSheetOpen] = useState(false)
  const [menuSheetOpen, setMenuSheetOpen] = useState(false)

  // Auto-collapse sidebar on tablet
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handleResize = () => {
        if (window.innerWidth >= 768 && window.innerWidth < 1024) {
          setSidebarOpen(false)
        }
      }
      handleResize()
      window.addEventListener('resize', handleResize)
      return () => window.removeEventListener('resize', handleResize)
    }
  }, [])

  // Command palette (callbacks are defined later, but closures capture references lazily)
  const commandPaletteRef = useRef<{
    onOpenFile: (file: any) => void
    onNavigate: (tab: string) => void
    onAction: (actionId: string) => void
    onToggleSidebar: () => void
    onToggleFocusMode: () => void
    onValidate: () => void
    onExportZip: () => void
    onDeploy: () => void
    onOpenSettings: () => void
    onShowShortcuts: () => void
    onGoDashboard: () => void
  }>({
    onOpenFile: () => {},
    onNavigate: () => {},
    onAction: () => {},
    onToggleSidebar: () => {},
    onToggleFocusMode: () => {},
    onValidate: () => {},
    onExportZip: () => {},
    onDeploy: () => {},
    onOpenSettings: () => {},
    onShowShortcuts: () => {},
    onGoDashboard: () => {},
  })

  const { open: commandPaletteOpen, setOpen: setCommandPaletteOpen, actions: commandActions } = useCommandPalette({
    onOpenFile: (...args) => commandPaletteRef.current.onOpenFile(...args),
    onNavigate: (...args) => commandPaletteRef.current.onNavigate(...args),
    onAction: (...args) => commandPaletteRef.current.onAction(...args),
    onToggleSidebar: () => commandPaletteRef.current.onToggleSidebar(),
    onToggleFocusMode: () => commandPaletteRef.current.onToggleFocusMode(),
    onValidate: () => commandPaletteRef.current.onValidate(),
    onExportZip: () => commandPaletteRef.current.onExportZip(),
    onDeploy: () => commandPaletteRef.current.onDeploy(),
    onOpenSettings: () => commandPaletteRef.current.onOpenSettings(),
    onShowShortcuts: () => commandPaletteRef.current.onShowShortcuts(),
    onGoDashboard: () => commandPaletteRef.current.onGoDashboard(),
  })

  // Keyboard shortcuts
  useKeyboardShortcuts({
    shortcuts: [
      {
        key: 's',
        ctrlKey: true,
        metaKey: true,
        description: 'Save current file',
        category: 'editor',
        action: () => {
          if (currentFile && hasUnsavedChanges) {
            handleSaveFile(currentFile.id, currentFile.content)
            toast.success('File saved')
          }
        },
      },
      {
        key: 'b',
        ctrlKey: true,
        metaKey: true,
        description: 'Toggle sidebar',
        category: 'navigation',
        action: () => {
          if (isMobile) {
            setFileSheetOpen(prev => !prev)
          } else {
            setSidebarOpen(prev => !prev)
          }
        },
      },
      {
        key: 'escape',
        description: 'Close dialogs / cancel edit',
        category: 'general',
        action: () => {
          if (settingsOpen) setSettingsOpen(false)
          if (fileSheetOpen) setFileSheetOpen(false)
          if (menuSheetOpen) setMenuSheetOpen(false)
        },
      },
    ],
  })

  useEffect(() => {
    const interval = setInterval(() => {
      refreshFiles()
    }, 15000)
    return () => clearInterval(interval)
  }, [refreshFiles])

  // Track generated files for notifications
  useEffect(() => {
    if (generatedFiles.length > 0 && currentProject) {
      trackGeneratedFiles(generatedFiles.length, currentProject.name)
      // Auto-validate after AI generates files
      setTimeout(() => handleValidate(), 1000)
    }
  }, [generatedFiles.length, currentProject])

  // Load memory count for tab indicator
  useEffect(() => {
    if (currentProject) {
      api.getMemory(currentProject.id).then((data) => {
        setMemoryCount(Array.isArray(data) ? data.length : 0)
      }).catch(() => {})
    }
  }, [currentProject?.id, generatedFiles.length])

  // Load versions when History tab is selected
  useEffect(() => {
    if (rightPanel === 'history' && currentProject) {
      loadVersions()
    }
  }, [rightPanel, currentProject?.id])

  const loadVersions = useCallback(async () => {
    if (!currentProject) return
    setLoadingVersions(true)
    try {
      const data = await api.getVersions(currentProject.id)
      setVersions(data || [])
    } catch {
      toast.error('Failed to load version history')
    } finally {
      setLoadingVersions(false)
    }
  }, [currentProject])

  const handleValidate = useCallback(async () => {
    if (!currentProject) return
    setValidating(true)
    try {
      const data = await api.validateProject(currentProject.id)
      const results = data?.results || (Array.isArray(data) ? data : [])
      const summary = data?.summary || null
      setValidationResults(results)
      setValidationSummary(summary)
      const passCount = summary?.passed ?? results.filter((r: any) => r.status === 'pass').length
      const failCount = summary?.failed ?? results.filter((r: any) => r.status === 'fail').length
      pushNotification({
        type: 'validation',
        title: failCount === 0 ? 'Validation passed' : 'Validation completed',
        description: failCount === 0
          ? `All ${passCount} checks passed for ${currentProject.name}`
          : `${passCount} passed, ${failCount} failed for ${currentProject.name}`,
        projectName: currentProject.name,
      })
    } catch {
      setValidationResults([{ status: 'fail', message: 'Validation request failed' }])
      pushNotification({
        type: 'validation',
        title: 'Validation failed',
        description: `Could not validate ${currentProject.name}`,
        projectName: currentProject.name,
      })
    } finally {
      setValidating(false)
    }
  }, [currentProject])

  const handleSaveFile = useCallback(async (fileId: string, content: string) => {
    if (!currentProject) return
    await api.updateFile(currentProject.id, fileId, { content })
    setHasUnsavedChanges(false)
    setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
    await refreshFiles()
    const store = useProjectStore.getState()
    if (store.currentFile?.id === fileId) {
      store.selectFile(fileId)
    }
    // Auto-validate after save if there are previous failed checks or validate tab is active
    if (validationResults.some(r => r.status === 'fail') || rightPanel === 'validate') {
      handleValidate()
    }
  }, [currentProject, refreshFiles, validationResults, rightPanel, handleValidate])

  const handleCreateVersion = useCallback(async () => {
    if (!currentProject) return
    setCreatingVersion(true)
    try {
      await api.createVersion(currentProject.id, `Version ${versions.length + 1}`)
      toast.success('Version saved')
      pushNotification({
        type: 'version_saved',
        title: 'Version saved',
        description: `Version ${versions.length + 1} saved for ${currentProject.name}`,
        projectName: currentProject.name,
      })
      await loadVersions()
    } catch {
      toast.error('Failed to create version')
    } finally {
      setCreatingVersion(false)
    }
  }, [currentProject, versions.length, loadVersions])

  const toggleVersionExpand = (versionId: string) => {
    setExpandedVersions(prev => {
      const next = new Set(prev)
      if (next.has(versionId)) {
        next.delete(versionId)
      } else {
        next.add(versionId)
      }
      return next
    })
  }

  // Handle file selection - close file sheet on mobile after selecting
  const handleSelectFile = useCallback((fileOrId: any) => {
    selectFile(fileOrId)
    if (isMobile) {
      setFileSheetOpen(false)
      setMobileTab('code')
    }
  }, [selectFile, isMobile])

  // Update command palette callbacks ref (avoids TDZ issues with hooks)
  commandPaletteRef.current = {
    onOpenFile: (file: any) => {
      selectFile(file)
      setRightPanel('code')
      if (isMobile) setMobileTab('code')
    },
    onNavigate: (tab: string) => {
      if (tab === 'dashboard') {
        clearCurrentProject()
      } else {
        setRightPanel(tab)
        if (isMobile) setMobileTab(tab === 'preview' ? 'preview' : 'code')
      }
    },
    onAction: (actionId: string) => {
      if (actionId === 'toggle-theme') {
        const isDark = document.documentElement.classList.contains('dark')
        document.documentElement.classList.toggle('dark', !isDark)
        localStorage.setItem('theme', isDark ? 'light' : 'dark')
      }
    },
    onToggleSidebar: () => {
      if (isMobile) {
        setFileSheetOpen((prev) => !prev)
      } else {
        setSidebarOpen((prev) => !prev)
      }
    },
    onToggleFocusMode: () => setFocusMode((prev) => !prev),
    onValidate: () => handleValidate(),
    onExportZip: () => {
      if (currentProject) {
        api.exportProject(currentProject.id)
          .then(() => toast.success('Project exported as ZIP'))
          .catch(() => toast.error('Failed to export project'))
      }
    },
    onDeploy: () => toast.info('Deployment coming soon!'),
    onOpenSettings: () => setSettingsOpen(true),
    onShowShortcuts: () => {
      window.dispatchEvent(new KeyboardEvent('keydown', {
        key: '/',
        ctrlKey: true,
        metaKey: true,
        bubbles: true,
      }))
    },
    onGoDashboard: () => clearCurrentProject(),
  }

  // Determine current file language for status bar
  const currentFileLanguage = currentFile?.language || (currentFile ? getLanguageFromPath(currentFile.path) : '')
  const currentLineCount = currentFile?.content ? currentFile.content.split('\n').length : 0

  if (!currentProject) return null

  // ─── Mobile Layout ─────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <div className="h-screen flex flex-col bg-background">
        {/* Mobile Top Bar */}
        <header className="border-b bg-background/80 backdrop-blur-sm h-11 flex items-center px-3 gap-2 flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0"
            onClick={() => setMenuSheetOpen(true)}
            title="Menu"
          >
            <Menu className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <div className="w-5 h-5 rounded-md bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
              <Zap className="w-2.5 h-2.5 text-white" />
            </div>
            <span className="text-xs font-semibold truncate">{currentProject.name}</span>
            <Badge variant="secondary" className={`text-[9px] px-1 ${STATUS_COLORS[currentProject.status]}`}>
              {currentProject.status}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0"
            onClick={() => setSettingsOpen(true)}
            title="Project settings"
          >
            <Settings2 className="w-4 h-4 text-muted-foreground" />
          </Button>
          <NotificationCenter />
        </header>

        {/* Project Settings Dialog */}
        {currentProject && (
          <ProjectSettingsDialog
            open={settingsOpen}
            onOpenChange={setSettingsOpen}
            project={currentProject}
          />
        )}

        {/* Menu Sheet (slides from left) */}
        <Sheet open={menuSheetOpen} onOpenChange={setMenuSheetOpen}>
          <SheetContent side="left" className="w-[280px] p-0">
            <SheetHeader className="px-4 pt-4 pb-2 border-b">
              <SheetTitle className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm font-bold">BuilderAI</span>
              </SheetTitle>
            </SheetHeader>
            <div className="flex flex-col p-4 gap-1">
              <Button
                variant="ghost"
                className="justify-start h-11 min-h-[44px] text-sm"
                onClick={() => {
                  setMenuSheetOpen(false)
                  clearCurrentProject()
                }}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
              <Button
                variant="ghost"
                className="justify-start h-11 min-h-[44px] text-sm"
                onClick={() => {
                  setMenuSheetOpen(false)
                  handleValidate()
                }}
                disabled={validating}
              >
                {validating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Shield className="w-4 h-4 mr-2" />}
                Validate Project
              </Button>
              <Button
                variant="ghost"
                className="justify-start h-11 min-h-[44px] text-sm"
                onClick={() => {
                  setMenuSheetOpen(false)
                  toast.info('Deployment coming soon!')
                }}
              >
                <Rocket className="w-4 h-4 mr-2" />
                Deploy Project
              </Button>
              <Separator className="my-2" />
              <div className="flex items-center gap-3 px-3 py-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-[10px] bg-emerald-100 text-emerald-700 font-semibold">
                    {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{user?.name || 'User'}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
                </div>
              </div>
              <Separator className="my-2" />
              <div className="flex items-center justify-between px-3 py-1">
                <span className="text-xs text-muted-foreground">Theme</span>
                <ThemeToggle />
              </div>
              <Button
                variant="ghost"
                className="justify-start h-11 min-h-[44px] text-sm text-destructive hover:text-destructive"
                onClick={() => {
                  setMenuSheetOpen(false)
                  logout()
                }}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </SheetContent>
        </Sheet>

        {/* Files Sheet (full-screen modal on mobile) */}
        <Sheet open={fileSheetOpen} onOpenChange={setFileSheetOpen}>
          <SheetContent side="left" className="w-full sm:max-w-sm p-0">
            <SheetHeader className="px-4 pt-4 pb-2 border-b">
              <SheetTitle className="flex items-center gap-2">
                <FolderTree className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">Files</span>
                <Badge variant="secondary" className="text-[10px] px-1.5">
                  {files.length}
                </Badge>
              </SheetTitle>
            </SheetHeader>
            <div className="flex-1 overflow-hidden">
              <FileTree
                files={files}
                selectedFileId={currentFile?.id || null}
                onSelectFile={handleSelectFile}
              />
            </div>
          </SheetContent>
        </Sheet>

        {/* Mobile Content Area */}
        <div className="flex-1 overflow-hidden pb-14">
          {mobileTab === 'chat' && (
            <ChatPanel />
          )}
          {mobileTab === 'files' && (
            <div className="h-full flex flex-col">
              <div className="border-b px-4 py-2 flex items-center justify-between bg-muted/30">
                <div className="flex items-center gap-2">
                  <FolderTree className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs font-medium">Files</span>
                  <Badge variant="secondary" className="text-[10px] px-1.5">
                    {files.length}
                  </Badge>
                </div>
              </div>
              <div className="flex-1 overflow-hidden">
                <FileTree
                  files={files}
                  selectedFileId={currentFile?.id || null}
                  onSelectFile={handleSelectFile}
                />
              </div>
            </div>
          )}
          {mobileTab === 'code' && (
            <div className="h-full flex flex-col">
              <Tabs value={rightPanel} onValueChange={setRightPanel} className="h-full flex flex-col">
                <div className="border-b px-2 flex items-center tab-bar-gradient">
                  <TabsList className="h-9 bg-transparent">
                    <TabsTrigger value="code" className="text-xs h-7 data-[state=active]:bg-muted data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 data-[state=active]:rounded-b-none transition-all">
                      <Code2 className="w-3 h-3 mr-1" />
                      Code
                    </TabsTrigger>
                    <TabsTrigger value="validate" className="text-xs h-7 data-[state=active]:bg-muted data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 data-[state=active]:rounded-b-none transition-all relative">
                      <Shield className="w-3 h-3 mr-1" />
                      Validate
                      {validationResults.filter(r => r.status === 'fail').length > 0 && (
                        <Badge className="ml-1 h-4 min-w-[16px] px-1 text-[9px] bg-red-500 text-white">
                          {validationResults.filter(r => r.status === 'fail').length}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="history" className="text-xs h-7 data-[state=active]:bg-muted data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 data-[state=active]:rounded-b-none transition-all">
                      <History className="w-3 h-3 mr-1" />
                      History
                    </TabsTrigger>
                    <TabsTrigger value="memory" className="text-xs h-7 data-[state=active]:bg-muted data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 data-[state=active]:rounded-b-none transition-all relative">
                      <Brain className="w-3 h-3 mr-1" />
                      Memory
                      {memoryCount > 0 && (
                        <span className="ml-1 w-2 h-2 rounded-full bg-sky-500 inline-block" />
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="analytics" className="text-xs h-7 data-[state=active]:bg-muted data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 data-[state=active]:rounded-b-none transition-all">
                      <Activity className="w-3 h-3 mr-1" />
                      Analytics
                    </TabsTrigger>
                  </TabsList>
                </div>
                <TabsContent value="code" className="flex-1 m-0 overflow-hidden">
                  <CodeViewer
                    file={currentFile}
                    onSave={handleSaveFile}
                    hasUnsavedChanges={hasUnsavedChanges}
                  />
                </TabsContent>
                <TabsContent value="validate" className="flex-1 m-0 overflow-hidden">
                  <ValidationPanel
                    results={validationResults}
                    summary={validationSummary}
                    onValidate={handleValidate}
                    validating={validating}
                  />
                </TabsContent>
                <TabsContent value="history" className="flex-1 m-0 overflow-hidden">
                  <VersionHistoryPanel
                    versions={versions}
                    loading={loadingVersions}
                    creating={creatingVersion}
                    onCreateVersion={handleCreateVersion}
                    onRefresh={loadVersions}
                    expandedVersions={expandedVersions}
                    onToggleExpand={toggleVersionExpand}
                  />
                </TabsContent>
                <TabsContent value="memory" className="flex-1 m-0 overflow-hidden">
                  <ProjectMemoryPanel projectId={currentProject.id} />
                </TabsContent>
                <TabsContent value="analytics" className="flex-1 m-0 overflow-hidden">
                  <ProjectAnalytics
                    files={files}
                    conversations={conversations}
                    messages={messages}
                    agentPipeline={agentPipeline}
                    projectId={currentProject.id}
                  />
                </TabsContent>
              </Tabs>
              {/* Mobile Status Bar */}
              <footer className="border-t h-6 px-3 flex items-center justify-between text-[10px] text-muted-foreground bg-muted/30 flex-shrink-0">
                <div className="flex items-center gap-3">
                  {currentFile && (
                    <>
                      <span className="flex items-center gap-1">
                        <Code2 className="w-2.5 h-2.5" />
                        {currentFileLanguage.toUpperCase()}
                      </span>
                      <span>Ln {currentLineCount}</span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {lastSavedTime && (
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" />
                      Saved {lastSavedTime}
                    </span>
                  )}
                </div>
              </footer>
            </div>
          )}
          {mobileTab === 'preview' && (
            <PreviewPanel files={files} projectName={currentProject.name} projectId={currentProject.id} />
          )}
        </div>

        {/* Bottom Navigation */}
        <MobileNav activeTab={mobileTab} onTabChange={setMobileTab} />

        {/* Keyboard Shortcut Help Dialog */}
        <KeyboardShortcutHelp />

        {/* Command Palette */}
        <CommandPalette
          open={commandPaletteOpen}
          onOpenChange={setCommandPaletteOpen}
          actions={commandActions}
        />
      </div>
    )
  }

  // ─── Desktop/Tablet Layout ─────────────────────────────────────────────
  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top Bar */}
      <header className="border-b bg-background/80 backdrop-blur-sm h-12 flex items-center px-3 gap-2 flex-shrink-0">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={clearCurrentProject} title="Back to dashboard">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <Separator orientation="vertical" className="h-5" />
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
            <Zap className="w-3 h-3 text-white" />
          </div>
          <span className="text-sm font-semibold truncate">{currentProject.name}</span>
          <Badge variant="secondary" className={`text-[10px] px-1.5 ${STATUS_COLORS[currentProject.status]}`}>
            {currentProject.status}
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 ml-1"
            onClick={() => setSettingsOpen(true)}
            title="Project settings"
          >
            <Settings2 className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground transition-colors" />
          </Button>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {/* Online indicator with pulse */}
          <div className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="hidden sm:inline">Online</span>
          </div>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleValidate} disabled={validating}>
            {validating ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Shield className="w-3 h-3 mr-1" />}
            Validate
          </Button>
          {/* Deploy Button */}
          <Button
            size="sm"
            className="h-7 text-xs bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-sm shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
            onClick={() => toast.info('Deployment coming soon!')}
          >
            <Rocket className="w-3 h-3 mr-1" />
            <span className="hidden sm:inline">Deploy</span>
          </Button>
          <Separator orientation="vertical" className="h-5" />
          <NotificationCenter />
          <UserProfileDropdown
            user={user}
            projectCount={projects.length}
            fileCount={files.length}
            onLogout={logout}
            onShowShortcuts={() => {
              const event = new KeyboardEvent('keydown', {
                key: '/',
                metaKey: true,
                ctrlKey: true,
                bubbles: true,
              })
              window.dispatchEvent(event)
            }}
          />
        </div>
      </header>

      {/* Project Settings Dialog */}
      {currentProject && (
        <ProjectSettingsDialog
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          project={currentProject}
        />
      )}

      {/* Main Content */}
      <div className={`flex-1 flex overflow-hidden ${focusMode ? 'relative' : ''}`}>
        {/* File Tree Sidebar - hidden on tablet when collapsed or focus mode */}
        {!focusMode && (
          <>
            <div
              className="border-r flex-shrink-0 overflow-hidden transition-all duration-200 hidden md:block"
              style={{ width: sidebarOpen ? 220 : 0 }}
            >
              <div className="h-full w-[220px] flex flex-col">
                <div className="px-3 py-2 border-b flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Files</span>
                  <Badge variant="secondary" className="text-[10px] px-1.5">
                    {files.length}
                  </Badge>
                </div>
                <FileTree
                  files={files}
                  selectedFileId={currentFile?.id || null}
                  onSelectFile={selectFile}
                />
              </div>
            </div>

            {/* Toggle Sidebar */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="w-5 flex-shrink-0 border-r hidden md:flex items-center justify-center hover:bg-muted/50 transition-colors"
              title={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
            >
              {sidebarOpen ? (
                <PanelLeftClose className="w-3 h-3 text-muted-foreground" />
              ) : (
                <PanelLeft className="w-3 h-3 text-muted-foreground" />
              )}
            </button>
          </>
        )}

        {/* Resizable Panels */}
        <ResizablePanelGroup direction="horizontal" className="flex-1">
          {/* Chat Panel */}
          {!focusMode && (
            <>
              <ResizablePanel defaultSize={55} minSize={30}>
                <ChatPanel />
              </ResizablePanel>
              <ResizableHandle withHandle className="bg-border/50 hover:bg-emerald-500/20 transition-colors" />
            </>
          )}

          {/* Right Panel */}
          <ResizablePanel defaultSize={focusMode ? 100 : 45} minSize={30}>
            <div className="h-full flex flex-col">
          <Tabs value={rightPanel} onValueChange={setRightPanel} className="h-full flex flex-col">
            <div className="border-b px-2 flex items-center tab-bar-gradient">
              <TabsList className="h-9 bg-transparent">
                <TabsTrigger
                  value="code"
                  className="text-xs h-7 data-[state=active]:bg-muted data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 data-[state=active]:rounded-b-none transition-all"
                >
                  <Code2 className="w-3 h-3 mr-1" />
                  Code
                </TabsTrigger>
                <TabsTrigger
                  value="preview"
                  className="text-xs h-7 data-[state=active]:bg-muted data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 data-[state=active]:rounded-b-none transition-all"
                >
                  <Eye className="w-3 h-3 mr-1" />
                  Preview
                </TabsTrigger>
                <TabsTrigger
                  value="validate"
                  className="text-xs h-7 data-[state=active]:bg-muted data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 data-[state=active]:rounded-b-none transition-all relative"
                >
                  <Shield className="w-3 h-3 mr-1" />
                  Validate
                  {validationResults.filter(r => r.status === 'fail').length > 0 && (
                    <Badge className="ml-1 h-4 min-w-[16px] px-1 text-[9px] bg-red-500 text-white">
                      {validationResults.filter(r => r.status === 'fail').length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="history"
                  className="text-xs h-7 data-[state=active]:bg-muted data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 data-[state=active]:rounded-b-none transition-all"
                >
                  <History className="w-3 h-3 mr-1" />
                  History
                </TabsTrigger>
                <TabsTrigger
                  value="memory"
                  className="text-xs h-7 data-[state=active]:bg-muted data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 data-[state=active]:rounded-b-none transition-all relative"
                >
                  <Brain className="w-3 h-3 mr-1" />
                  Memory
                  {memoryCount > 0 && (
                    <span className="ml-1 w-2 h-2 rounded-full bg-sky-500 inline-block" />
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="analytics"
                  className="text-xs h-7 data-[state=active]:bg-muted data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 data-[state=active]:rounded-b-none transition-all"
                >
                  <Activity className="w-3 h-3 mr-1" />
                  Analytics
                </TabsTrigger>
                {/* Focus mode toggle */}
                <button
                  onClick={() => setFocusMode(!focusMode)}
                  className={`ml-2 p-1 rounded transition-colors ${focusMode ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
                  title={focusMode ? 'Exit focus mode' : 'Focus mode'}
                >
                  {focusMode ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
                </button>
              </TabsList>
            </div>
            <AnimatePresence mode="wait">
              <motion.div
                key={rightPanel}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.15 }}
                className="flex-1 overflow-hidden flex flex-col bg-dot-grid-faint"
              >
                {rightPanel === 'code' && (
                  <CodeViewer
                    file={currentFile}
                    onSave={handleSaveFile}
                    hasUnsavedChanges={hasUnsavedChanges}
                  />
                )}
                {rightPanel === 'preview' && (
                  <PreviewPanel files={files} projectName={currentProject.name} projectId={currentProject.id} />
                )}
                {rightPanel === 'validate' && (
                  <ValidationPanel
                    results={validationResults}
                    summary={validationSummary}
                    onValidate={handleValidate}
                    validating={validating}
                  />
                )}
                {rightPanel === 'history' && (
                  <VersionHistoryPanel
                    versions={versions}
                    loading={loadingVersions}
                    creating={creatingVersion}
                    onCreateVersion={handleCreateVersion}
                    onRefresh={loadVersions}
                    expandedVersions={expandedVersions}
                    onToggleExpand={toggleVersionExpand}
                  />
                )}
                {rightPanel === 'memory' && (
                  <ProjectMemoryPanel projectId={currentProject.id} />
                )}
                {rightPanel === 'analytics' && (
                  <ProjectAnalytics
                    files={files}
                    conversations={conversations}
                    messages={messages}
                    agentPipeline={agentPipeline}
                    projectId={currentProject.id}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </Tabs>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Desktop Status Bar */}
      <footer className="border-t h-6 px-3 flex items-center justify-between text-[10px] text-muted-foreground bg-muted/30 flex-shrink-0">
        <div className="flex items-center gap-3">
          {currentFile && (
            <>
              <span className="flex items-center gap-1">
                <Code2 className="w-2.5 h-2.5" />
                {currentFileLanguage.toUpperCase()}
              </span>
              <span className="flex items-center gap-1">
                <span>Ln {currentLineCount}</span>
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          {lastSavedTime && (
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" />
              Saved {lastSavedTime}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Wifi className="w-2.5 h-2.5 text-emerald-500" />
            Connected
          </span>
        </div>
      </footer>

      {/* Keyboard Shortcut Help Dialog */}
      <KeyboardShortcutHelp />

      {/* Command Palette */}
      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        actions={commandActions}
      />
    </div>
  )
}

// ─── Preview Panel (Improved) ─────────────────────────────────────────────

function getFileExtension(path: string): string {
  return path.split('.').pop()?.toLowerCase() || ''
}

function getLanguageFromPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() || ''
  const map: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    css: 'css',
    json: 'json',
    html: 'html',
    htm: 'html',
    md: 'markdown',
    mdx: 'markdown',
    yml: 'yaml',
    yaml: 'yaml',
    prisma: 'typescript',
    sql: 'sql',
    mjs: 'javascript',
    txt: 'text',
  }
  return map[ext] || 'text'
}

function buildFileTree(files: Array<{ path: string }>): TreeNode {
  const root: TreeNode = { name: '/', children: [], isFile: false }
  for (const file of files) {
    const parts = file.path.split('/').filter(Boolean)
    let current = root
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      const isFile = i === parts.length - 1
      let child = current.children.find(c => c.name === part && c.isFile === isFile)
      if (!child) {
        child = { name: part, children: [], isFile, path: isFile ? file.path : undefined }
        current.children.push(child)
      }
      current = child
    }
  }
  const sortTree = (node: TreeNode) => {
    node.children.sort((a, b) => {
      if (a.isFile !== b.isFile) return a.isFile ? 1 : -1
      return a.name.localeCompare(b.name)
    })
    node.children.forEach(sortTree)
  }
  sortTree(root)
  return root
}

interface TreeNode {
  name: string
  children: TreeNode[]
  isFile: boolean
  path?: string
}

function TreeNodeView({ node, depth = 0 }: { node: TreeNode; depth?: number }) {
  if (node.name === '/' && depth === 0) {
    return (
      <div>
        {node.children.map((child, i) => (
          <TreeNodeView key={`${child.name}-${i}`} node={child} depth={depth} />
        ))}
      </div>
    )
  }

  const isTopLevel = depth === 0

  return (
    <div>
      <div
        className={`flex items-center gap-1.5 py-0.5 px-1 rounded text-xs font-mono hover:bg-muted/50 ${
          isTopLevel ? 'font-medium' : ''
        }`}
        style={{ paddingLeft: `${depth * 16 + 4}px` }}
      >
        {node.isFile ? (
          <FileCode className="w-3 h-3 text-muted-foreground flex-shrink-0" />
        ) : (
          <FolderOpen className="w-3 h-3 text-amber-500 flex-shrink-0" />
        )}
        <span className="truncate">{node.name}</span>
      </div>
      {node.children.map((child, i) => (
        <TreeNodeView key={`${child.name}-${i}`} node={child} depth={depth + 1} />
      ))}
    </div>
  )
}

function PreviewPanel({ files, projectName, projectId }: { files: Array<{ path: string; content: string }>; projectName: string; projectId?: string }) {
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'preview'>('overview')
  const [exporting, setExporting] = useState(false)
  const [previewKey, setPreviewKey] = useState(0)
  const [buildingPreview, setBuildingPreview] = useState(false)

  // Compute type counts
  const typeCounts: Record<string, number> = {}
  let totalSize = 0
  let totalLines = 0
  for (const file of files) {
    const ext = getFileExtension(file.path).toUpperCase() || 'OTHER'
    typeCounts[ext] = (typeCounts[ext] || 0) + 1
    totalSize += new Blob([file.content]).size
    totalLines += file.content.split('\n').length
  }
  const languageCount = Object.keys(typeCounts).length

  // Health check
  const hasPackageJson = files.some(f => f.path.includes('package.json'))
  const hasTsConfig = files.some(f => f.path.includes('tsconfig'))
  const hasAppDir = files.some(f => f.path.includes('app/'))
  const hasReadme = files.some(f => f.path.toLowerCase().includes('readme'))
  const hasEnv = files.some(f => f.path.includes('.env'))
  const healthChecks = [
    { label: 'package.json', ok: hasPackageJson, points: 25 },
    { label: 'tsconfig', ok: hasTsConfig, points: 20 },
    { label: 'app/ dir', ok: hasAppDir, points: 25 },
    { label: 'README', ok: hasReadme, points: 15 },
    { label: '.env', ok: hasEnv, points: 15 },
  ]
  const healthScore = healthChecks.reduce((sum, c) => sum + (c.ok ? c.points : 0), 0)
  const healthLabel = healthScore >= 80 ? 'Excellent' : healthScore >= 60 ? 'Good' : healthScore >= 40 ? 'Fair' : 'Needs Work'
  const healthColorClass = healthScore >= 80 ? 'text-emerald-500' : healthScore >= 60 ? 'text-teal-500' : healthScore >= 40 ? 'text-amber-500' : 'text-red-500'
  const healthRingColor = healthScore >= 80 ? '#10b981' : healthScore >= 60 ? '#14b8a6' : healthScore >= 40 ? '#f59e0b' : '#ef4444'

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const handleDownload = () => {
    const lines = [`# ${projectName} - Project File Listing`, '']
    for (const file of files) {
      lines.push(`## ${file.path}`)
      lines.push('```')
      lines.push(file.content)
      lines.push('```')
      lines.push('')
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${projectName.replace(/\s+/g, '-').toLowerCase()}-files.md`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Project files downloaded')
  }

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

  // Build HTML preview from project files
  const buildPreviewHtml = useCallback(() => {
    const pageFile = files.find(f => f.path === 'src/app/page.tsx' || f.path === 'src/app/page.jsx' || f.path === 'app/page.tsx' || f.path === 'app/page.jsx')
    const cssFile = files.find(f => f.path === 'src/app/globals.css' || f.path === 'app/globals.css')
    const layoutFile = files.find(f => f.path === 'src/app/layout.tsx' || f.path === 'src/app/layout.jsx' || f.path === 'app/layout.tsx' || f.path === 'app/layout.jsx')

    if (!pageFile && !layoutFile) return null

    // Try to extract the JSX return content from page.tsx
    let htmlContent = ''
    if (pageFile) {
      const pageContent = pageFile.content
      // Try to extract the return block
      const returnMatch = pageContent.match(/return\s*\(\s*([\s\S]*?)\s*\)\s*\}/)
      htmlContent = returnMatch ? returnMatch[1] : pageContent
      // Convert JSX to HTML (simplified)
      htmlContent = htmlContent
        .replace(/className=/g, 'class=')
        .replace(/{\/\*[\s\S]*?\*\/}/g, '') // Remove JSX comments
        .replace(/\{`([^`]*)`\}/g, '$1') // Template literals
        .replace(/\{["']([^"']*)["']\}/g, '$1') // String expressions
        .replace(/\{[^}]*\}/g, '') // Remove remaining JSX expressions
    }

    // Get CSS content
    const cssContent = cssFile?.content || ''

    // Try to extract body content from layout if available
    let layoutBody = ''
    if (layoutFile) {
      const layoutContent = layoutFile.content
      const bodyMatch = layoutContent.match(/<body[^>]*>([\s\S]*?)<\/body>/)
      if (bodyMatch) {
        layoutBody = bodyMatch[1]
          .replace(/{\/\*[\s\S]*?\*\/}/g, '')
          .replace(/\{[^}]*\}/g, '')
      }
    }

    // Build the preview HTML document
    const previewHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview - ${projectName}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: #ffffff;
      color: #111827;
      line-height: 1.5;
    }
    ${cssContent}
  </style>
</head>
<body>
  ${layoutBody}
  <div id="root">
    ${htmlContent}
  </div>
</body>
</html>`

    return previewHtml
  }, [files, projectName])

  // Handle refresh
  const handleRefreshPreview = () => {
    setBuildingPreview(true)
    setTimeout(() => {
      setPreviewKey(prev => prev + 1)
      setBuildingPreview(false)
    }, 300)
  }

  // Handle open in new tab
  const handleOpenInNewTab = () => {
    const html = buildPreviewHtml()
    if (!html) return
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 60000)
  }

  const fileTree = buildFileTree(files)

  // Type chip colors
  const typeChipColors: Record<string, string> = {
    TSX: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
    TS: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
    JSX: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    JS: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    CSS: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    JSON: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    MD: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300',
    HTML: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    ENV: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    PRISMA: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
  }

  const typeIconMap: Record<string, React.ReactNode> = {
    TSX: <FileType className="w-3 h-3" />,
    TS: <FileType className="w-3 h-3" />,
    JSX: <FileType className="w-3 h-3" />,
    JS: <FileType className="w-3 h-3" />,
    CSS: <FileText className="w-3 h-3" />,
    JSON: <FileJson className="w-3 h-3" />,
    MD: <FileText className="w-3 h-3" />,
  }

  // SVG circle parameters for health score
  const circleRadius = 36
  const circleCircumference = 2 * Math.PI * circleRadius
  const healthOffset = circleCircumference - (healthScore / 100) * circleCircumference

  const previewHtml = buildPreviewHtml()

  return (
    <div className="flex flex-col h-full">
      {/* Header with sub-tabs */}
      <div className="border-b bg-muted/30">
        <div className="px-3 sm:px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-medium text-muted-foreground">Preview</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[10px] min-h-[44px] md:min-h-0"
              onClick={handleDownload}
              disabled={files.length === 0}
            >
              <Download className="w-3 h-3 mr-1" />
              Markdown
            </Button>
            {projectId && (
              <Button
                variant="outline"
                size="sm"
                className="h-6 text-[10px] min-h-[44px] md:min-h-0 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                onClick={handleExportZip}
                disabled={files.length === 0 || exporting}
              >
                {exporting ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <FolderTree className="w-3 h-3 mr-1" />}
                Export ZIP
              </Button>
            )}
          </div>
        </div>
        {/* Sub-tabs */}
        <div className="px-3 sm:px-4 flex items-center gap-1 pb-1">
          <button
            onClick={() => setActiveSubTab('overview')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all min-h-[32px] ${
              activeSubTab === 'overview'
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Overview
          </button>
          <button
            onClick={() => setActiveSubTab('preview')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all min-h-[32px] ${
              activeSubTab === 'preview'
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            Live Preview
          </button>
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {activeSubTab === 'overview' ? (
            <motion.div
              key="overview"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.15 }}
              className="h-full"
            >
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
                    {/* Quick Stats Row */}
                    <div className="grid grid-cols-3 gap-2">
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0 }}
                        className="rounded-lg border bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 p-3 text-center"
                      >
                        <FileCode className="w-4 h-4 text-emerald-500 mx-auto mb-1" />
                        <div className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{files.length}</div>
                        <div className="text-[10px] text-muted-foreground">Total Files</div>
                      </motion.div>
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.05 }}
                        className="rounded-lg border bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-950/20 dark:to-cyan-950/20 p-3 text-center"
                      >
                        <Layers className="w-4 h-4 text-teal-500 mx-auto mb-1" />
                        <div className="text-lg font-bold text-teal-700 dark:text-teal-300">{formatSize(totalSize)}</div>
                        <div className="text-[10px] text-muted-foreground">Total Size</div>
                      </motion.div>
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="rounded-lg border bg-gradient-to-br from-cyan-50 to-sky-50 dark:from-cyan-950/20 dark:to-sky-950/20 p-3 text-center"
                      >
                        <Code2 className="w-4 h-4 text-cyan-500 mx-auto mb-1" />
                        <div className="text-lg font-bold text-cyan-700 dark:text-cyan-300">{languageCount}</div>
                        <div className="text-[10px] text-muted-foreground">Languages</div>
                      </motion.div>
                    </div>

                    {/* Health Score with Circular Progress */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15 }}
                      className="rounded-lg border p-4"
                    >
                      <div className="flex items-center gap-4">
                        {/* Circular Progress */}
                        <div className="relative flex-shrink-0">
                          <svg width="88" height="88" viewBox="0 0 88 88" className="-rotate-90">
                            <circle
                              cx="44"
                              cy="44"
                              r={circleRadius}
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="6"
                              className="text-muted/30"
                            />
                            <motion.circle
                              cx="44"
                              cy="44"
                              r={circleRadius}
                              fill="none"
                              stroke={healthRingColor}
                              strokeWidth="6"
                              strokeLinecap="round"
                              strokeDasharray={circleCircumference}
                              initial={{ strokeDashoffset: circleCircumference }}
                              animate={{ strokeDashoffset: healthOffset }}
                              transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center">
                              <span className={`text-xl font-bold ${healthColorClass}`}>{healthScore}</span>
                              <span className="text-[9px] text-muted-foreground block">/100</span>
                            </div>
                          </div>
                        </div>
                        {/* Health Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-foreground">Project Health</span>
                            <span className={`text-xs font-semibold ${healthColorClass}`}>{healthLabel}</span>
                          </div>
                          <div className="space-y-1.5">
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
                      </div>
                    </motion.div>

                    {/* File Type Distribution as Chips */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <FolderTree className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-xs font-semibold text-foreground">File Types</span>
                        <Badge variant="secondary" className="text-[9px] px-1.5 ml-auto">{languageCount} types</Badge>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(typeCounts)
                          .sort((a, b) => b[1] - a[1])
                          .map(([ext, count]) => (
                            <motion.div
                              key={ext}
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ duration: 0.2 }}
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium ${typeChipColors[ext] || 'bg-muted text-muted-foreground'}`}
                            >
                              {typeIconMap[ext] || <FileCode className="w-3 h-3" />}
                              <span>{ext}</span>
                              <span className="opacity-60">×{count}</span>
                            </motion.div>
                          ))}
                      </div>
                    </motion.div>

                    {/* File Structure Tree */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.25 }}
                      className="rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <FolderOpen className="w-3.5 h-3.5 text-amber-500" />
                        <span className="text-xs font-semibold text-foreground">File Structure</span>
                        <Badge variant="secondary" className="text-[9px] px-1.5 ml-auto">{totalLines.toLocaleString()} lines</Badge>
                      </div>
                      <div className="bg-muted/30 rounded-md p-2 max-h-64 overflow-y-auto">
                        <TreeNodeView node={fileTree} />
                      </div>
                    </motion.div>

                    {/* Export Actions as Prominent Cards */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="grid grid-cols-2 gap-2"
                    >
                      <button
                        onClick={handleDownload}
                        disabled={files.length === 0}
                        className="group rounded-lg border p-3 text-left hover:border-emerald-300 dark:hover:border-emerald-700 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Download className="w-5 h-5 text-emerald-500 mb-1.5 group-hover:scale-110 transition-transform" />
                        <div className="text-xs font-semibold text-foreground">Download MD</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">All files as Markdown</div>
                      </button>
                      <button
                        onClick={handleExportZip}
                        disabled={files.length === 0 || exporting || !projectId}
                        className="group rounded-lg border p-3 text-left hover:border-teal-300 dark:hover:border-teal-700 hover:bg-teal-50/50 dark:hover:bg-teal-950/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {exporting ? (
                          <Loader2 className="w-5 h-5 text-teal-500 mb-1.5 animate-spin" />
                        ) : (
                          <FolderTree className="w-5 h-5 text-teal-500 mb-1.5 group-hover:scale-110 transition-transform" />
                        )}
                        <div className="text-xs font-semibold text-foreground">Export ZIP</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">Download as archive</div>
                      </button>
                    </motion.div>
                  </div>
                </ScrollArea>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="live-preview"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
              className="h-full flex flex-col"
            >
              {/* Live Preview Controls */}
              <div className="border-b px-3 py-1.5 flex items-center justify-between bg-muted/20">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className="text-[10px] text-muted-foreground font-medium">Preview</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[10px] min-h-[32px] md:min-h-0 px-2"
                    onClick={handleRefreshPreview}
                    disabled={buildingPreview}
                  >
                    {buildingPreview ? (
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3 h-3 mr-1" />
                    )}
                    Refresh
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[10px] min-h-[32px] md:min-h-0 px-2"
                    onClick={handleOpenInNewTab}
                    disabled={!previewHtml}
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    New Tab
                  </Button>
                </div>
              </div>

              {/* Preview Content */}
              {files.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center"
                  >
                    <motion.div
                      animate={{ y: [0, -8, 0] }}
                      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                    >
                      <Monitor className="w-16 h-16 text-emerald-300 dark:text-emerald-700 mx-auto mb-4" />
                    </motion.div>
                    <h3 className="text-sm font-medium text-muted-foreground">Nothing to preview yet</h3>
                    <p className="text-xs text-muted-foreground/70 mt-1">Generate code with AI to see a live preview</p>
                  </motion.div>
                </div>
              ) : !previewHtml ? (
                <div className="flex-1 flex items-center justify-center">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center max-w-xs"
                  >
                    <FileSearch className="w-12 h-12 text-amber-400 mx-auto mb-3" />
                    <h3 className="text-sm font-medium text-muted-foreground">No page file found</h3>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      A <code className="px-1 py-0.5 bg-muted rounded text-[10px] font-mono">src/app/page.tsx</code> file is required for the live preview.
                    </p>
                  </motion.div>
                </div>
              ) : (
                <div className="flex-1 relative">
                  {buildingPreview && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                      <div className="text-center">
                        <Loader2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 animate-spin" />
                        <p className="text-xs text-muted-foreground">Building preview...</p>
                      </div>
                    </div>
                  )}
                  <iframe
                    key={previewKey}
                    srcDoc={previewHtml}
                    sandbox="allow-scripts"
                    className="w-full h-full border-0"
                    title="Live Preview"
                  />
                </div>
              )}

              {/* Disclaimer */}
              <div className="border-t px-3 py-1.5 bg-amber-50/50 dark:bg-amber-950/10">
                <div className="flex items-start gap-1.5">
                  <AlertCircle className="w-3 h-3 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-[10px] text-amber-600 dark:text-amber-400/80 leading-tight">
                    This is a simplified preview. Full functionality requires running the Next.js dev server.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ─── Version History Panel ────────────────────────────────────────────────

function VersionHistoryPanel({
  versions,
  loading,
  creating,
  onCreateVersion,
  onRefresh,
  expandedVersions,
  onToggleExpand,
}: {
  versions: VersionData[]
  loading: boolean
  creating: boolean
  onCreateVersion: () => void
  onRefresh: () => void
  expandedVersions: Set<string>
  onToggleExpand: (id: string) => void
}) {
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
      ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }

  const parseSnapshot = (snapshot: string): Array<{ path: string; language: string | null }> => {
    try {
      return JSON.parse(snapshot)
    } catch {
      return []
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="border-b px-3 sm:px-4 py-2 flex items-center justify-between bg-muted/30">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">Version History</span>
          <Badge variant="secondary" className="text-[10px] px-1.5">
            {versions.length}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-[10px] px-2 min-h-[44px] md:min-h-0"
            onClick={onRefresh}
            disabled={loading}
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Refresh'}
          </Button>
          <Button
            variant="default"
            size="sm"
            className="h-6 text-[10px] px-2 bg-emerald-600 hover:bg-emerald-700 min-h-[44px] md:min-h-0"
            onClick={onCreateVersion}
            disabled={creating}
          >
            {creating ? (
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            ) : (
              <Plus className="w-3 h-3 mr-1" />
            )}
            Save Version
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 sm:p-4">
          {loading && versions.length === 0 ? (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3 animate-spin" />
              <p className="text-sm text-muted-foreground">Loading version history...</p>
            </div>
          ) : versions.length === 0 ? (
            <div className="text-center py-8">
              <History className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No versions saved yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Click &quot;Save Version&quot; to create a snapshot of your project
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {versions.map((version, i) => {
                const isExpanded = expandedVersions.has(version.id)
                const snapshotFiles = isExpanded ? parseSnapshot(version.snapshot) : []
                return (
                  <Collapsible
                    key={version.id}
                    open={isExpanded}
                    onOpenChange={() => onToggleExpand(version.id)}
                  >
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="rounded-lg border"
                    >
                      <CollapsibleTrigger asChild>
                        <button className="w-full text-left p-3 hover:bg-muted/30 transition-colors rounded-lg min-h-[44px]">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <ChevronRight className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                              <span className="text-sm font-medium">v{version.version}</span>
                              <Badge
                                variant="secondary"
                                className={`text-[10px] px-1.5 ${VERSION_STATUS_BADGE[version.status] || 'bg-muted text-muted-foreground'}`}
                              >
                                {version.status}
                              </Badge>
                            </div>
                            <span className="text-[10px] text-muted-foreground">
                              {formatDate(version.createdAt)}
                            </span>
                          </div>
                          {version.description && (
                            <p className="text-xs text-muted-foreground mt-1 ml-6">{version.description}</p>
                          )}
                        </button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="px-3 pb-3 pt-0 ml-6 border-t">
                          <div className="pt-2 space-y-1 max-h-48 overflow-y-auto">
                            {snapshotFiles.length > 0 ? snapshotFiles.map((f, j) => (
                              <div key={j} className="flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground py-0.5">
                                <FileCode className="w-3 h-3 flex-shrink-0" />
                                <span className="truncate">{f.path}</span>
                                {f.language && (
                                  <Badge variant="secondary" className="text-[8px] px-1 py-0 ml-auto flex-shrink-0">
                                    {f.language}
                                  </Badge>
                                )}
                              </div>
                            )) : (
                              <p className="text-xs text-muted-foreground">No files in snapshot</p>
                            )}
                          </div>
                        </div>
                      </CollapsibleContent>
                    </motion.div>
                  </Collapsible>
                )
              })}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

// ─── Validation Panel ─────────────────────────────────────────────────────

function ValidationPanel({
  results,
  summary,
  onValidate,
  validating,
}: {
  results: Array<{ status: string; message: string; details?: string }>
  summary: { total: number; passed: number; failed: number; warnings: number } | null
  onValidate: () => void
  validating: boolean
}) {
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set())
  const toggleExpand = (idx: number) => {
    setExpandedItems(prev => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  // Categorize results
  const categories = [
    { key: 'required', label: 'Required Files', icon: FileCode, results: results.filter(r => r.message.includes('is missing') || r.message.includes('exists')).filter(r => r.message.includes('Root layout') || r.message.includes('Home page') || r.message.includes('Package configuration')) },
    { key: 'recommended', label: 'Recommended Files', icon: FileText, results: results.filter(r => r.message.includes('is missing') || r.message.includes('exists')).filter(r => r.message.includes('TypeScript configuration') || r.message.includes('Next.js configuration') || r.message.includes('Global styles')) },
    { key: 'config', label: 'Configuration', icon: Settings2, results: results.filter(r => r.message.includes('package.json') || r.message.includes('tsconfig') || r.message.includes('Dependency') || r.message.includes('Build script') || r.message.includes('strict mode') || r.message.includes('Path alias') || r.message.includes('name field')) },
    { key: 'code', label: 'Code Quality', icon: Code2, results: results.filter(r => r.message.includes('unbalanced') || r.message.includes('No export') || r.message.includes('empty') || r.message.includes('not valid JSON')) },
  ]
  // Add uncategorized results
  const categorized = new Set(categories.flatMap(c => c.results))
  const uncategorized = results.filter(r => !categorized.has(r))
  if (uncategorized.length > 0) {
    categories.push({ key: 'other', label: 'Other', icon: AlertCircle, results: uncategorized })
  }

  const passCount = summary?.passed ?? results.filter(r => r.status === 'pass').length
  const failCount = summary?.failed ?? results.filter(r => r.status === 'fail').length
  const warnCount = summary?.warnings ?? results.filter(r => r.status === 'warn').length
  const total = summary?.total ?? results.length

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b bg-muted/30">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-500" />
            Project Validation
          </h3>
          <Button
            size="sm"
            className="h-8 text-xs bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white"
            onClick={onValidate}
            disabled={validating}
          >
            {validating ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Play className="w-3 h-3 mr-1" />}
            Run Checks
          </Button>
        </div>

        {results.length > 0 && (
          <>
            {/* Summary Progress Bar */}
            <div className="mb-3">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="flex-1 h-2.5 rounded-full overflow-hidden bg-muted flex">
                  {passCount > 0 && (
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(passCount / total) * 100}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                      className="bg-emerald-500 h-full"
                    />
                  )}
                  {warnCount > 0 && (
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(warnCount / total) * 100}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut', delay: 0.2 }}
                      className="bg-amber-500 h-full"
                    />
                  )}
                  {failCount > 0 && (
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(failCount / total) * 100}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut', delay: 0.4 }}
                      className="bg-red-500 h-full"
                    />
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs">
                {passCount > 0 && (
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-3 h-3" />
                    {passCount} passed
                  </span>
                )}
                {warnCount > 0 && (
                  <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                    <AlertCircle className="w-3 h-3" />
                    {warnCount} warnings
                  </span>
                )}
                {failCount > 0 && (
                  <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                    <XCircle className="w-3 h-3" />
                    {failCount} failed
                  </span>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4">
          {results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Shield className="w-12 h-12 mb-3 opacity-20" />
              <p className="text-sm font-medium">No validation results yet</p>
              <p className="text-xs mt-1">Click &quot;Run Checks&quot; to validate your project</p>
            </div>
          ) : (
            <div className="space-y-4">
              {categories.filter(c => c.results.length > 0).map(category => (
                <div key={category.key}>
                  <div className="flex items-center gap-2 mb-2">
                    <category.icon className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{category.label}</span>
                    <Badge variant="secondary" className="text-[10px] px-1.5">{category.results.length}</Badge>
                  </div>
                  <div className="space-y-1">
                    {category.results.map((result) => {
                      const globalIdx = results.indexOf(result)
                      const hasDetails = !!result.details
                      const isExpanded = expandedItems.has(globalIdx)
                      return (
                        <motion.div
                          key={globalIdx}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: globalIdx * 0.03 }}
                          className={`rounded-lg border p-2.5 text-xs transition-colors ${
                            result.status === 'pass' ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/30 dark:bg-emerald-950/10' :
                            result.status === 'fail' ? 'border-red-200 bg-red-50/50 dark:border-red-900/30 dark:bg-red-950/10' :
                            'border-amber-200 bg-amber-50/50 dark:border-amber-900/30 dark:bg-amber-950/10'
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            {result.status === 'pass' ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
                            ) : result.status === 'fail' ? (
                              <XCircle className="w-3.5 h-3.5 text-red-500 mt-0.5 flex-shrink-0" />
                            ) : (
                              <AlertCircle className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <span className="font-medium">{result.message}</span>
                              {hasDetails && (
                                <button
                                  onClick={() => toggleExpand(globalIdx)}
                                  className="ml-2 text-muted-foreground hover:text-foreground underline decoration-dotted underline-offset-2"
                                >
                                  {isExpanded ? 'Hide' : 'Details'}
                                </button>
                              )}
                              {hasDetails && isExpanded && (
                                <motion.p
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  className="mt-1.5 text-muted-foreground text-[11px] pl-0 border-l-2 border-emerald-300 dark:border-emerald-700 py-0.5"
                                >
                                  {result.details}
                                </motion.p>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
