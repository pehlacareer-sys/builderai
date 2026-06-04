'use client'

import { useEffect, useState, useCallback } from 'react'
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
import { motion } from 'framer-motion'
import {
  ArrowLeft, Zap, Code2, Eye, Play,
  CheckCircle2, XCircle, AlertCircle, Loader2, LogOut,
  PanelLeftClose, PanelLeft, FileCode, Shield, Wifi,
  History, Plus, ChevronRight, Download, FolderTree,
  FileText, FileJson, FileType, FolderOpen
} from 'lucide-react'
import { toast } from 'sonner'
import { ThemeToggle } from '@/components/theme-toggle'

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
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [rightPanel, setRightPanel] = useState('code')
  const [validating, setValidating] = useState(false)
  const [validationResults, setValidationResults] = useState<Array<{ status: string; message: string }>>([])
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // Version history state
  const [versions, setVersions] = useState<VersionData[]>([])
  const [loadingVersions, setLoadingVersions] = useState(false)
  const [creatingVersion, setCreatingVersion] = useState(false)
  const [expandedVersions, setExpandedVersions] = useState<Set<string>>(new Set())

  useEffect(() => {
    const interval = setInterval(() => {
      refreshFiles()
    }, 15000)
    return () => clearInterval(interval)
  }, [refreshFiles])

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
      setValidationResults(data?.results || (Array.isArray(data) ? data : []))
    } catch {
      setValidationResults([{ status: 'fail', message: 'Validation request failed' }])
    } finally {
      setValidating(false)
    }
  }, [currentProject])

  const handleSaveFile = useCallback(async (fileId: string, content: string) => {
    if (!currentProject) return
    await api.updateFile(currentProject.id, fileId, { content })
    setHasUnsavedChanges(false)
    await refreshFiles()
    // Update currentFile in store to reflect saved content
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

  if (!currentProject) return null

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
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400">
            <Wifi className="w-3 h-3" />
            <span className="hidden sm:inline">Online</span>
          </div>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleValidate} disabled={validating}>
            {validating ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Shield className="w-3 h-3 mr-1" />}
            Validate
          </Button>
          <Separator orientation="vertical" className="h-5" />
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

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* File Tree Sidebar */}
        <div
          className="border-r flex-shrink-0 overflow-hidden transition-all duration-200"
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
          className="w-5 flex-shrink-0 border-r flex items-center justify-center hover:bg-muted/50 transition-colors"
          title={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
        >
          {sidebarOpen ? (
            <PanelLeftClose className="w-3 h-3 text-muted-foreground" />
          ) : (
            <PanelLeft className="w-3 h-3 text-muted-foreground" />
          )}
        </button>

        {/* Chat Panel */}
        <div className="flex-1 min-w-0 border-r">
          <ChatPanel />
        </div>

        {/* Right Panel - Code / Preview / Validate / History */}
        <div className="w-[45%] flex-shrink-0 flex flex-col">
          <Tabs value={rightPanel} onValueChange={setRightPanel} className="h-full flex flex-col">
            <div className="border-b px-2 flex items-center">
              <TabsList className="h-9 bg-transparent">
                <TabsTrigger value="code" className="text-xs h-7 data-[state=active]:bg-muted">
                  <Code2 className="w-3 h-3 mr-1" />
                  Code
                </TabsTrigger>
                <TabsTrigger value="preview" className="text-xs h-7 data-[state=active]:bg-muted">
                  <Eye className="w-3 h-3 mr-1" />
                  Preview
                </TabsTrigger>
                <TabsTrigger value="validate" className="text-xs h-7 data-[state=active]:bg-muted">
                  <Shield className="w-3 h-3 mr-1" />
                  Validate
                </TabsTrigger>
                <TabsTrigger value="history" className="text-xs h-7 data-[state=active]:bg-muted">
                  <History className="w-3 h-3 mr-1" />
                  History
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
            <TabsContent value="preview" className="flex-1 m-0 overflow-hidden">
              <PreviewPanel files={files} projectName={currentProject.name} />
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
          </Tabs>
        </div>
      </div>
    </div>
  )
}

// ─── Preview Panel (Improved) ─────────────────────────────────────────────

function getFileExtension(path: string): string {
  return path.split('.').pop()?.toLowerCase() || ''
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
  // Sort: folders first, then files, alphabetically
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

function PreviewPanel({ files, projectName }: { files: Array<{ path: string; content: string }>; projectName: string }) {
  // File type counts
  const typeCounts: Record<string, number> = {}
  let totalSize = 0
  for (const file of files) {
    const ext = getFileExtension(file.path).toUpperCase() || 'OTHER'
    typeCounts[ext] = (typeCounts[ext] || 0) + 1
    totalSize += new Blob([file.content]).size
  }

  // Project health
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

  const fileTree = buildFileTree(files)

  // Icon map for file types
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
      <div className="border-b px-4 py-2 flex items-center justify-between bg-muted/30">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">Project Overview</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-[10px]"
          onClick={handleDownload}
          disabled={files.length === 0}
        >
          <Download className="w-3 h-3 mr-1" />
          Download
        </Button>
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
          <div className="p-4 space-y-4">
            {/* Project Health */}
            <div className="rounded-lg border p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">Project Health</span>
                <span className={`text-xs font-semibold ${healthColor}`}>{healthLabel}</span>
              </div>
              <div className="flex gap-2">
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
      <div className="border-b px-4 py-2 flex items-center justify-between bg-muted/30">
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
            className="h-6 text-[10px] px-2"
            onClick={onRefresh}
            disabled={loading}
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Refresh'}
          </Button>
          <Button
            variant="default"
            size="sm"
            className="h-6 text-[10px] px-2 bg-emerald-600 hover:bg-emerald-700"
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
        <div className="p-4">
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
                        <button className="w-full text-left p-3 hover:bg-muted/30 transition-colors rounded-lg">
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
      <div className="border-b px-4 py-2 flex items-center justify-between bg-muted/30">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">Validation</span>
        </div>
        <Button variant="outline" size="sm" className="h-6 text-[10px]" onClick={onValidate} disabled={validating}>
          {validating ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Shield className="w-3 h-3 mr-1" />}
          Run Checks
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4">
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
