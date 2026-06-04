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
  Rocket, Menu, X, Brain, Activity, Maximize2, Minimize2
} from 'lucide-react'
import { toast } from 'sonner'
import { ThemeToggle } from '@/components/theme-toggle'
import { ProjectSettingsDialog } from '@/components/project-settings-dialog'
import { KeyboardShortcutHelp } from '@/components/keyboard-shortcut-help'
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts'
import { useIsMobile } from '@/hooks/use-mobile'
import { MobileNav, type MobileTab } from '@/components/mobile-nav'
import { NotificationCenter, pushNotification, trackGeneratedFiles } from '@/components/notification-center'
import { ProjectMemoryPanel } from '@/components/project-memory-panel'
import { ProjectAnalytics } from '@/components/project-analytics'
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
  const { currentProject, files, currentFile, selectFile, clearCurrentProject, refreshFiles } = useProjectStore()
  const { user, logout } = useAuthStore()
  const { generatedFiles, conversations, messages, agentPipeline } = useChatStore()
  const isMobile = useIsMobile()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [rightPanel, setRightPanel] = useState('code')
  const [validating, setValidating] = useState(false)
  const [validationResults, setValidationResults] = useState<Array<{ status: string; message: string }>>([])
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [lastSavedTime, setLastSavedTime] = useState<string>('')

  // Version history state
  const [versions, setVersions] = useState<VersionData[]>([])
  const [loadingVersions, setLoadingVersions] = useState(false)
  const [creatingVersion, setCreatingVersion] = useState(false)
  const [expandedVersions, setExpandedVersions] = useState<Set<string>>(new Set())
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [focusMode, setFocusMode] = useState(false)

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
    }
  }, [generatedFiles.length, currentProject])

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
      setValidationResults(results)
      const passCount = results.filter((r: any) => r.status === 'pass').length
      const failCount = results.filter((r: any) => r.status === 'fail').length
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
  }, [currentProject, refreshFiles])

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
                <div className="border-b px-2 flex items-center">
                  <TabsList className="h-9 bg-transparent">
                    <TabsTrigger value="code" className="text-xs h-7 data-[state=active]:bg-muted data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 data-[state=active]:rounded-b-none transition-all">
                      <Code2 className="w-3 h-3 mr-1" />
                      Code
                    </TabsTrigger>
                    <TabsTrigger value="validate" className="text-xs h-7 data-[state=active]:bg-muted data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 data-[state=active]:rounded-b-none transition-all">
                      <Shield className="w-3 h-3 mr-1" />
                      Validate
                    </TabsTrigger>
                    <TabsTrigger value="history" className="text-xs h-7 data-[state=active]:bg-muted data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 data-[state=active]:rounded-b-none transition-all">
                      <History className="w-3 h-3 mr-1" />
                      History
                    </TabsTrigger>
                    <TabsTrigger value="memory" className="text-xs h-7 data-[state=active]:bg-muted data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 data-[state=active]:rounded-b-none transition-all">
                      <Brain className="w-3 h-3 mr-1" />
                      Memory
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
          <Avatar className="h-6 w-6">
            <AvatarFallback className="text-[10px] bg-emerald-100 text-emerald-700 font-semibold">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <ThemeToggle />
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={logout} title="Sign out">
            <LogOut className="w-3.5 h-3.5" />
          </Button>
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
            <div className="border-b px-2 flex items-center">
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
                  className="text-xs h-7 data-[state=active]:bg-muted data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 data-[state=active]:rounded-b-none transition-all"
                >
                  <Shield className="w-3 h-3 mr-1" />
                  Validate
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
                  className="text-xs h-7 data-[state=active]:bg-muted data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 data-[state=active]:rounded-b-none transition-all"
                >
                  <Brain className="w-3 h-3 mr-1" />
                  Memory
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
                className="flex-1 overflow-hidden flex flex-col"
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
    typescript: 'typescript',
    javascript: 'javascript',
    jsx: 'jsx',
    tsx: 'tsx',
    css: 'css',
    json: 'json',
    html: 'html',
    markdown: 'markdown',
    yaml: 'yaml',
    prisma: 'typescript',
    sql: 'sql',
    plaintext: 'text',
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
  const [exporting, setExporting] = useState(false)
  const typeCounts: Record<string, number> = {}
  let totalSize = 0
  for (const file of files) {
    const ext = getFileExtension(file.path).toUpperCase() || 'OTHER'
    typeCounts[ext] = (typeCounts[ext] || 0) + 1
    totalSize += new Blob([file.content]).size
  }

  const hasPackageJson = files.some(f => f.path.includes('package.json'))
  const hasTsConfig = files.some(f => f.path.includes('tsconfig'))
  const hasAppDir = files.some(f => f.path.includes('app/'))
  const healthScore = [hasPackageJson, hasTsConfig, hasAppDir].filter(Boolean).length
  const healthLabel = healthScore === 3 ? 'Excellent' : healthScore === 2 ? 'Good' : healthScore === 1 ? 'Fair' : 'Needs Work'
  const healthColor = healthScore === 3 ? 'text-emerald-600' : healthScore === 2 ? 'text-amber-600' : 'text-red-600'

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

  const fileTree = buildFileTree(files)

  const typeIconMap: Record<string, React.ReactNode> = {
    TSX: <FileType className="w-3 h-3 text-sky-500" />,
    TS: <FileType className="w-3 h-3 text-sky-500" />,
    JSX: <FileType className="w-3 h-3 text-amber-500" />,
    JS: <FileType className="w-3 h-3 text-amber-500" />,
    CSS: <FileText className="w-3 h-3 text-purple-500" />,
    JSON: <FileJson className="w-3 h-3 text-yellow-500" />,
    MD: <FileText className="w-3 h-3 text-gray-500" />,
  }

  return (
    <div className="flex flex-col h-full">
      <div className="border-b px-3 sm:px-4 py-2 flex items-center justify-between bg-muted/30">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">Project Overview</span>
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

      {files.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Eye className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-sm font-medium text-gray-500">No preview available</h3>
            <p className="text-xs text-gray-400 mt-1">Generate code with AI to see a preview</p>
          </div>
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
            {/* Project Health */}
            <div className="rounded-lg border p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">Project Health</span>
                <span className={`text-xs font-semibold ${healthColor}`}>{healthLabel}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <HealthCheck label="package.json" ok={hasPackageJson} />
                <HealthCheck label="tsconfig" ok={hasTsConfig} />
                <HealthCheck label="app/ dir" ok={hasAppDir} />
              </div>
              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <span>{files.length} files</span>
                <span>·</span>
                <span>~{formatSize(totalSize)}</span>
              </div>
            </div>

            {/* File Type Breakdown */}
            <div className="rounded-lg border p-3">
              <div className="flex items-center gap-2 mb-2">
                <FolderTree className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">File Types</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(typeCounts)
                  .sort((a, b) => b[1] - a[1])
                  .map(([ext, count]) => (
                    <Badge key={ext} variant="secondary" className="text-[10px] px-2 py-0.5 gap-1">
                      {typeIconMap[ext] || <FileCode className="w-3 h-3 text-muted-foreground" />}
                      {ext}: {count}
                    </Badge>
                  ))}
              </div>
            </div>

            {/* File Structure Tree */}
            <div className="rounded-lg border p-3">
              <div className="flex items-center gap-2 mb-2">
                <FolderOpen className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-xs font-medium text-muted-foreground">File Structure</span>
              </div>
              <div className="bg-muted/30 rounded-md p-2 max-h-64 overflow-y-auto">
                <TreeNodeView node={fileTree} />
              </div>
            </div>
          </div>
        </ScrollArea>
      )}
    </div>
  )
}

function HealthCheck({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full ${
      ok
        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
        : 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400'
    }`}>
      {ok ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
      {label}
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
  onValidate,
  validating,
}: {
  results: Array<{ status: string; message: string }>
  onValidate: () => void
  validating: boolean
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="border-b px-3 sm:px-4 py-2 flex items-center justify-between bg-muted/30">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">Validation</span>
        </div>
        <Button variant="outline" size="sm" className="h-6 text-[10px] min-h-[44px] md:min-h-0" onClick={onValidate} disabled={validating}>
          {validating ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Shield className="w-3 h-3 mr-1" />}
          Run Checks
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-3 sm:p-4">
          {results.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Click &quot;Run Checks&quot; to validate the project</p>
              <p className="text-xs text-muted-foreground mt-1">
                Checks for required files, TypeScript config, and code quality
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {results.map((result, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`flex items-start gap-2 p-3 rounded-lg border ${
                    result.status === 'pass'
                      ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20'
                      : result.status === 'fail'
                      ? 'border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20'
                      : 'border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20'
                  }`}
                >
                  {result.status === 'pass' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  ) : result.status === 'fail' ? (
                    <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  )}
                  <span className="text-sm">{result.message}</span>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
