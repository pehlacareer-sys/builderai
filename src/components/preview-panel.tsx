'use client'

import { useState, useCallback } from 'react'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Eye, Download, FolderTree, Loader2, FileCode, FolderOpen,
  CheckCircle2, XCircle, Layers, Code2, Monitor, RefreshCw,
  ExternalLink, FileText, FileJson, FileType, AlertCircle, FileSearch,
} from 'lucide-react'

function getFileExtension(path: string): string {
  return path.split('.').pop()?.toLowerCase() || ''
}

interface TreeNode {
  name: string
  children: TreeNode[]
  isFile: boolean
  path?: string
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

export function PreviewPanel({ files, projectName, projectId }: { files: Array<{ path: string; content: string }>; projectName: string; projectId?: string }) {
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
