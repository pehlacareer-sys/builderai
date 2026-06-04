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
import { motion } from 'framer-motion'
import {
  ArrowLeft, Zap, Code2, Eye, Play,
  CheckCircle2, XCircle, AlertCircle, Loader2, LogOut,
  PanelLeftClose, PanelLeft, FileCode, Shield, Wifi
} from 'lucide-react'

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  building: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  ready: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  deployed: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400',
}

export function Workspace() {
  const { currentProject, files, currentFile, selectFile, clearCurrentProject, refreshFiles } = useProjectStore()
  const { user, logout } = useAuthStore()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [rightPanel, setRightPanel] = useState('code')
  const [validating, setValidating] = useState(false)
  const [validationResults, setValidationResults] = useState<Array<{ status: string; message: string }>>([])

  useEffect(() => {
    const interval = setInterval(() => {
      refreshFiles()
    }, 15000)
    return () => clearInterval(interval)
  }, [refreshFiles])

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

        {/* Right Panel - Code / Preview / Validate */}
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
              </TabsList>
            </div>
            <TabsContent value="code" className="flex-1 m-0 overflow-hidden">
              <CodeViewer file={currentFile} />
            </TabsContent>
            <TabsContent value="preview" className="flex-1 m-0 overflow-hidden">
              <PreviewPanel files={files} />
            </TabsContent>
            <TabsContent value="validate" className="flex-1 m-0 overflow-hidden">
              <ValidationPanel
                results={validationResults}
                onValidate={handleValidate}
                validating={validating}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

function PreviewPanel({ files }: { files: Array<{ path: string; content: string }> }) {
  return (
    <div className="flex flex-col h-full">
      <div className="border-b px-4 py-2 flex items-center justify-between bg-muted/30">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">Live Preview</span>
        </div>
        <Button variant="ghost" size="sm" className="h-6 text-[10px]">
          <Play className="w-3 h-3 mr-1" />
          Run Preview
        </Button>
      </div>
      <div className="flex-1 bg-white relative">
        {files.length > 0 ? (
          <div className="h-full flex items-center justify-center text-center p-8">
            <div className="max-w-md">
              <FileCode className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900">Preview Available</h3>
              <p className="text-sm text-gray-500 mt-2">
                The generated application has {files.length} files ready.
                To see a live preview, the project needs to be built and served.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2 text-left">
                {files.slice(0, 6).map(f => (
                  <div key={f.path} className="text-xs px-2 py-1 bg-gray-100 rounded font-mono truncate">
                    {f.path}
                  </div>
                ))}
                {files.length > 6 && (
                  <div className="text-xs px-2 py-1 bg-gray-100 rounded text-gray-500">
                    +{files.length - 6} more
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <Eye className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-sm font-medium text-gray-500">No preview available</h3>
              <p className="text-xs text-gray-400 mt-1">Generate code with AI to see a preview</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

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
