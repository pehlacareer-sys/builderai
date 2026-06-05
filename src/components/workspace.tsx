'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useProjectStore } from '@/stores/project-store'
import { useAuthStore } from '@/stores/auth-store'
import { api } from '@/lib/api'
import { ChatPanel } from '@/components/chat-panel'
import { FileTree } from '@/components/file-tree'
import { CodeViewer } from '@/components/code-viewer'
import { Button } from '@/components/ui/button'
import { BrandButton } from '@/components/ui/brand-button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Zap, Code2, Eye,
  CheckCircle2, Loader2, LogOut,
  PanelLeftClose, PanelLeft, Shield, Wifi,
  History, FolderTree,
  Settings2,
  ChevronRight, Rocket, Menu, X, Brain, Activity, Maximize2, Minimize2, Cpu,
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
import { ValidationPanel } from '@/components/validation-panel'
import { PreviewPanel } from '@/components/preview-panel'
import { VersionHistoryPanel, type VersionData } from '@/components/version-history-panel'
import { getLanguageFromPath } from '@/lib/file-utils'
import { ActivityFeed, ActivityBell, generateMockActivities, type ActivityItem } from '@/components/activity-feed'
import { DeploymentWizard } from '@/components/deployment-wizard'
import { AgentStatusPanel } from '@/components/agent-status-panel'
import { CollaborationPresence } from '@/components/collaboration-presence'

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  building: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  ready: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  deployed: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400',
}

export function Workspace() {
  const { currentProject, files, currentFile, selectFile, clearCurrentProject, refreshFiles, projects } = useProjectStore()
  const { user, logout } = useAuthStore()
  const { generatedFiles, conversations, messages, agentPipeline, isProcessing } = useChatStore()
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
  const [deployWizardOpen, setDeployWizardOpen] = useState(false)

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
      // Robust extraction: handle { results, summary }, plain array, or nested formats
      const results = Array.isArray(data?.results) ? data.results
        : Array.isArray(data) ? data
        : []
      const summary = data?.summary ?? null
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
    onDeploy: () => setDeployWizardOpen(true),
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

  // Computed status bar className
  const statusBarClassName = currentProject?.status === 'building'
    ? 'border-t h-6 px-3 flex items-center justify-between text-[10px] flex-shrink-0 transition-colors duration-500 bg-amber-50/50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 backdrop-blur-md'
    : currentProject?.status === 'ready'
      ? 'border-t h-6 px-3 flex items-center justify-between text-[10px] flex-shrink-0 transition-colors duration-500 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 backdrop-blur-md'
      : currentProject?.status === 'deployed'
        ? 'border-t h-6 px-3 flex items-center justify-between text-[10px] flex-shrink-0 transition-colors duration-500 bg-sky-50/50 dark:bg-sky-950/20 text-sky-700 dark:text-sky-400 backdrop-blur-md'
        : 'border-t h-6 px-3 flex items-center justify-between text-[10px] flex-shrink-0 transition-colors duration-500 bg-muted/30 text-muted-foreground backdrop-blur-md'

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
          <ActivityBell activities={generateMockActivities(projects)} />
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
                  setDeployWizardOpen(true)
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
                sidebarVisible={fileSheetOpen}
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
                  sidebarVisible={mobileTab === 'files'}
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
                    <TabsTrigger value="status" className="text-xs h-7 data-[state=active]:bg-muted data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 data-[state=active]:rounded-b-none transition-all relative">
                      <Cpu className="w-3 h-3 mr-1" />
                      Status
                      {isProcessing && (
                        <span className="ml-1 w-2 h-2 rounded-full bg-amber-500 inline-block animate-pulse" />
                      )}
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
                <TabsContent value="status" className="flex-1 m-0 overflow-hidden">
                  <AgentStatusPanel
                    agentPipeline={agentPipeline.map(a => ({ role: a.agent, status: a.status, content: a.message }))}
                    isProcessing={isProcessing}
                  />
                </TabsContent>
              </Tabs>
              {/* Mobile Status Bar */}
              <footer className="border-t h-6 px-3 flex items-center justify-between text-[10px] text-muted-foreground bg-muted/30 backdrop-blur-md flex-shrink-0">
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

        {/* Deployment Wizard Dialog */}
        {currentProject && (
          <DeploymentWizard
            open={deployWizardOpen}
            onOpenChange={setDeployWizardOpen}
            projectName={currentProject.name}
            projectId={currentProject.id}
            files={files}
          />
        )}
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
        {/* Breadcrumb trail */}
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground min-w-0">
          <button onClick={clearCurrentProject} className="hover:text-foreground transition-colors truncate">Dashboard</button>
          <ChevronRight className="w-3 h-3 flex-shrink-0" />
          <span className="text-foreground font-medium truncate max-w-[120px]">{currentProject.name}</span>
          <ChevronRight className="w-3 h-3 flex-shrink-0" />
          <span className="text-emerald-600 dark:text-emerald-400 capitalize truncate">{rightPanel}</span>
        </div>
        <div className="flex items-center gap-2 min-w-0 ml-1">
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
          <div className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 animate-breathing">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="hidden sm:inline">Online</span>
          </div>
          <CollaborationPresence projectName={currentProject.name} />
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleValidate} disabled={validating}>
            {validating ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Shield className="w-3 h-3 mr-1" />}
            Validate
          </Button>
          {/* Deploy Button */}
          <BrandButton
            icon={Rocket}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setDeployWizardOpen(true)}
          >
            <span className="hidden sm:inline">Deploy</span>
          </BrandButton>
          <Separator orientation="vertical" className="h-5" />
          <NotificationCenter />
          <ActivityBell activities={generateMockActivities(projects)} />
          <UserProfileDropdown
            user={user}
            projectCount={projects.length}
            fileCount={files.length}
            messageCount={messages.filter(m => m.role === 'user').length}
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
            onShowTour={() => {
              window.dispatchEvent(new CustomEvent('show-onboarding-tour'))
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
        {/* Focus mode vignette overlay */}
        {focusMode && (
          <div className="absolute inset-0 pointer-events-none z-50" style={{
            boxShadow: 'inset 0 0 150px rgba(0,0,0,0.15), inset 0 0 60px rgba(16,185,129,0.05)'
          }} />
        )}
        {/* File Tree Sidebar - hidden on tablet when collapsed or focus mode */}
        {!focusMode && (
          <>
            <div
              className="border-r flex-shrink-0 overflow-hidden transition-all duration-300 hidden md:block"
              style={{ width: sidebarOpen ? 220 : 0 }}
            >
              <div className="h-full w-[220px] flex flex-col">
                <div className="px-3 py-2 border-b flex items-center justify-between sidebar-header-gradient">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Files</span>
                  <Badge variant="secondary" className="text-[10px] px-1.5">
                    {files.length}
                  </Badge>
                </div>
                <FileTree
                  files={files}
                  selectedFileId={currentFile?.id || null}
                  onSelectFile={selectFile}
                  sidebarVisible={sidebarOpen}
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
              <ResizableHandle withHandle className="bg-border/50 hover:bg-emerald-500/20 hover:shadow-[0_0_8px_rgba(16,185,129,0.3)] transition-all group/resizable-handle">
                <div className="w-1 h-6 flex flex-col items-center justify-center gap-0.5">
                  {[0,1,2,3,4].map(i => (
                    <div key={i} className="w-0.5 h-0.5 rounded-full bg-muted-foreground/30 group-hover/resizable-handle:bg-emerald-500/60 transition-colors" />
                  ))}
                </div>
              </ResizableHandle>
            </>
          )}

          {/* Right Panel */}
          <ResizablePanel defaultSize={focusMode ? 100 : 45} minSize={30}>
            <Tabs value={rightPanel} onValueChange={setRightPanel} className="h-full flex flex-col">
              <div className="border-b px-2 flex items-center tab-bar-gradient">
                <TabsList className="h-9 bg-transparent gap-0.5">
                <TabsTrigger
                  value="code"
                  className="text-xs h-7 px-2.5 data-[state=active]:bg-muted/60 data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 data-[state=active]:rounded-b-none transition-all duration-200"
                >
                  <Code2 className="w-3 h-3 mr-1" />
                  Code
                </TabsTrigger>
                <TabsTrigger
                  value="preview"
                  className="text-xs h-7 px-2.5 data-[state=active]:bg-muted/60 data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 data-[state=active]:rounded-b-none transition-all duration-200"
                >
                  <Eye className="w-3 h-3 mr-1" />
                  Preview
                </TabsTrigger>
                <TabsTrigger
                  value="validate"
                  className="text-xs h-7 px-2.5 data-[state=active]:bg-muted/60 data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 data-[state=active]:rounded-b-none transition-all duration-200 relative"
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
                  className="text-xs h-7 px-2.5 data-[state=active]:bg-muted/60 data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 data-[state=active]:rounded-b-none transition-all duration-200"
                >
                  <History className="w-3 h-3 mr-1" />
                  History
                </TabsTrigger>
                <TabsTrigger
                  value="memory"
                  className="text-xs h-7 px-2.5 data-[state=active]:bg-muted/60 data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 data-[state=active]:rounded-b-none transition-all duration-200 relative"
                >
                  <Brain className="w-3 h-3 mr-1" />
                  Memory
                  {memoryCount > 0 && (
                    <span className="ml-1 w-2 h-2 rounded-full bg-sky-500 inline-block" />
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="analytics"
                  className="text-xs h-7 px-2.5 data-[state=active]:bg-muted/60 data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 data-[state=active]:rounded-b-none transition-all duration-200"
                >
                  <Activity className="w-3 h-3 mr-1" />
                  Analytics
                </TabsTrigger>
                <TabsTrigger
                  value="status"
                  className="text-xs h-7 px-2.5 data-[state=active]:bg-muted/60 data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 data-[state=active]:rounded-b-none transition-all duration-200 relative"
                >
                  <Cpu className="w-3 h-3 mr-1" />
                  Status
                  {isProcessing && (
                    <span className="ml-1 w-2 h-2 rounded-full bg-amber-500 inline-block animate-pulse" />
                  )}
                </TabsTrigger>
              </TabsList>
              {/* Focus mode toggle - outside TabsList to avoid roving tabindex conflicts */}
              <button
                onClick={() => setFocusMode(!focusMode)}
                className={`ml-2 p-1 rounded transition-colors ${focusMode ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
                title={focusMode ? 'Exit focus mode' : 'Focus mode'}
              >
                {focusMode ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
              </button>
            </div>
            <TabsContent value="code" className="flex-1 m-0 overflow-hidden">
              <CodeViewer
                file={currentFile}
                onSave={handleSaveFile}
                hasUnsavedChanges={hasUnsavedChanges}
              />
            </TabsContent>
            <TabsContent value="preview" className="flex-1 m-0 overflow-hidden">
              <PreviewPanel files={files} projectName={currentProject.name} projectId={currentProject.id} />
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
            <TabsContent value="status" className="flex-1 m-0 overflow-hidden">
              <AgentStatusPanel
                agentPipeline={agentPipeline.map(a => ({ role: a.agent, status: a.status, content: a.message }))}
                isProcessing={isProcessing}
              />
            </TabsContent>
            </Tabs>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Desktop Status Bar - theming based on project status */}
      <footer className={statusBarClassName}>
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

      {/* Deployment Wizard Dialog */}
      {currentProject && (
        <DeploymentWizard
          open={deployWizardOpen}
          onOpenChange={setDeployWizardOpen}
          projectName={currentProject.name}
          projectId={currentProject.id}
          files={files}
        />
      )}
    </div>
  )
}

