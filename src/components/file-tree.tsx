'use client'

import { ProjectFile } from '@/stores/project-store'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import {
  FileCode, FileJson, FileText, FileType, Folder,
  FolderOpen, ChevronRight, ChevronDown, Palette,
  Globe, Braces, Terminal, Database, GripVertical,
  Search, X
} from 'lucide-react'
import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface TreeNode {
  name: string
  path: string
  isDir: boolean
  children: TreeNode[]
  file?: ProjectFile
}

function buildTree(files: ProjectFile[]): TreeNode[] {
  const root: TreeNode[] = []

  for (const file of files) {
    const parts = file.path.split('/')
    let current = root

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      const isFile = i === parts.length - 1
      const existingNode = current.find((n) => n.name === part && isFile !== n.isDir)

      if (existingNode && !isFile) {
        current = existingNode.children
      } else {
        const newNode: TreeNode = {
          name: part,
          path: parts.slice(0, i + 1).join('/'),
          isDir: !isFile,
          children: [],
          file: isFile ? file : undefined,
        }
        current.push(newNode)
        if (!isFile) {
          current = newNode.children
        }
      }
    }
  }

  // Sort: directories first, then files alphabetically
  const sortNodes = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1
      return a.name.localeCompare(b.name)
    })
    nodes.forEach((n) => sortNodes(n.children))
  }
  sortNodes(root)

  return root
}

// ─── File Type Icons with Colors ───────────────────────────────────────────

function getFileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'tsx': return <FileCode className="w-4 h-4 text-sky-500" />
    case 'ts': return <FileCode className="w-4 h-4 text-blue-500" />
    case 'jsx': return <FileCode className="w-4 h-4 text-amber-500" />
    case 'js': return <FileCode className="w-4 h-4 text-yellow-600" />
    case 'json': return <FileJson className="w-4 h-4 text-yellow-500" />
    case 'css': return <Palette className="w-4 h-4 text-purple-500" />
    case 'scss': return <Palette className="w-4 h-4 text-pink-500" />
    case 'html': return <Globe className="w-4 h-4 text-orange-500" />
    case 'md': case 'mdx': return <FileText className="w-4 h-4 text-gray-500" />
    case 'env': case 'env.local': case 'env.production': return <Terminal className="w-4 h-4 text-emerald-600" />
    case 'prisma': return <Database className="w-4 h-4 text-teal-500" />
    case 'svg': case 'png': case 'jpg': case 'ico': return <FileType className="w-4 h-4 text-violet-500" />
    case 'sql': return <Database className="w-4 h-4 text-blue-400" />
    case 'yaml': case 'yml': return <FileText className="w-4 h-4 text-rose-500" />
    case 'toml': return <FileText className="w-4 h-4 text-orange-400" />
    case 'lock': return <Braces className="w-4 h-4 text-muted-foreground" />
    default: return <FileText className="w-4 h-4 text-muted-foreground" />
  }
}

// ─── Get line count from file content ──────────────────────────────────────

function getLineCount(content?: string): number | null {
  if (!content) return null
  return content.split('\n').length
}

function formatLineCount(count: number): string {
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`
  return `${count}`
}

// ─── Highlight matching text ───────────────────────────────────────────────

function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>

  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  const parts = text.split(regex)

  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-emerald-200/80 dark:bg-emerald-800/60 text-inherit rounded-sm px-0.5">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  )
}

// ─── Check if tree node or descendants match query ─────────────────────────

function nodeMatchesQuery(node: TreeNode, query: string): boolean {
  if (!query.trim()) return true
  const lowerQuery = query.toLowerCase()
  if (node.name.toLowerCase().includes(lowerQuery)) return true
  if (node.path.toLowerCase().includes(lowerQuery)) return true
  return node.children.some(child => nodeMatchesQuery(child, query))
}

function countMatchingFiles(nodes: TreeNode[], query: string): number {
  let count = 0
  for (const node of nodes) {
    if (node.isDir) {
      count += countMatchingFiles(node.children, query)
    } else if (nodeMatchesQuery(node, query)) {
      count++
    }
  }
  return count
}

// ─── Tree Node Component ───────────────────────────────────────────────────

interface TreeNodeProps {
  node: TreeNode
  selectedFileId: string | null
  onSelectFile: (file: ProjectFile) => void
  depth: number
  searchQuery: string
  forceExpand: boolean
}

function TreeNodeItem({ node, selectedFileId, onSelectFile, depth, searchQuery, forceExpand }: TreeNodeProps) {
  const matches = nodeMatchesQuery(node, searchQuery)
  const shouldForceExpand = forceExpand && matches
  const [localExpanded, setLocalExpanded] = useState(depth < 2)
  const expanded = shouldForceExpand || localExpanded

  // Filter out non-matching children
  const visibleChildren = searchQuery.trim()
    ? node.children.filter(child => nodeMatchesQuery(child, searchQuery))
    : node.children

  if (!matches && searchQuery.trim()) return null

  if (node.isDir) {
    return (
      <div>
        <button
          onClick={() => setLocalExpanded(!localExpanded)}
          className="flex items-center gap-1.5 w-full px-2 py-1 text-sm hover:bg-muted/50 rounded-sm transition-colors group/drag relative"
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          {/* Indentation lines */}
          {depth > 0 && (
            <div className="absolute left-0 top-0 bottom-0 pointer-events-none" style={{ paddingLeft: `${(depth - 1) * 12 + 14}px` }}>
              <div className="w-px h-full bg-emerald-500/10 dark:bg-emerald-400/5" />
            </div>
          )}
          {expanded ? (
            <ChevronDown className="w-3 h-3 text-muted-foreground flex-shrink-0" />
          ) : (
            <ChevronRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
          )}
          {expanded ? (
            <FolderOpen className="w-4 h-4 text-amber-500 flex-shrink-0" />
          ) : (
            <Folder className="w-4 h-4 text-amber-500 flex-shrink-0" />
          )}
          <span className="truncate">
            <HighlightedText text={node.name} query={searchQuery} />
          </span>
          {searchQuery.trim() && visibleChildren.length > 0 && (
            <span className="text-[9px] text-muted-foreground/50 ml-auto flex-shrink-0">
              {countMatchingFiles(node.children, searchQuery)}
            </span>
          )}
        </button>
        <AnimatePresence initial={false}>
          {expanded && visibleChildren.map((child) => (
            <motion.div
              key={child.path}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.15 }}
            >
              <TreeNodeItem
                node={child}
                selectedFileId={selectedFileId}
                onSelectFile={onSelectFile}
                depth={depth + 1}
                searchQuery={searchQuery}
                forceExpand={forceExpand}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    )
  }

  const lineCount = getLineCount(node.file?.content)

  return (
    <button
      onClick={() => node.file && onSelectFile(node.file)}
      className={cn(
        'flex items-center gap-1.5 w-full px-2 py-1 text-sm rounded-sm transition-colors group/drag relative hover:bg-muted/50',
        selectedFileId === node.file?.id
          ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-100'
          : ''
      )}
      style={{ paddingLeft: `${depth * 12 + 20}px` }}
    >
      {/* Indentation lines */}
      {depth > 0 && (
        <div className="absolute left-0 top-0 bottom-0 pointer-events-none" style={{ paddingLeft: `${(depth - 1) * 12 + 14}px` }}>
          <div className="w-px h-full bg-emerald-500/10 dark:bg-emerald-400/5" />
        </div>
      )}
      {/* Drag indicator (grip) on hover */}
      <GripVertical className="w-3 h-3 text-muted-foreground/0 group-hover/drag:text-muted-foreground/30 flex-shrink-0 transition-colors" />
      {getFileIcon(node.name)}
      <span className="truncate flex-1 text-left">
        <HighlightedText text={node.name} query={searchQuery} />
      </span>
      {lineCount !== null && (
        <span className="text-[9px] text-muted-foreground/50 flex-shrink-0 tabular-nums">
          {formatLineCount(lineCount)}L
        </span>
      )}
    </button>
  )
}

// ─── File Tree Component ───────────────────────────────────────────────────

interface FileTreeProps {
  files: ProjectFile[]
  selectedFileId: string | null
  onSelectFile: (file: ProjectFile) => void
  sidebarVisible?: boolean
}

export function FileTree({ files, selectedFileId, onSelectFile, sidebarVisible }: FileTreeProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)
  const tree = useMemo(() => buildTree(files), [files])

  const matchingFileCount = useMemo(() => {
    if (!searchQuery.trim()) return files.length
    return countMatchingFiles(tree, searchQuery)
  }, [tree, searchQuery, files.length])

  // Keyboard shortcut: Ctrl+Shift+F to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'f' && sidebarVisible) {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [sidebarVisible])

  const isSearching = searchQuery.trim().length > 0

  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <Folder className="w-8 h-8 text-muted-foreground mb-2 animate-float" />
        <p className="text-sm text-muted-foreground">No files yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          Chat with AI to generate code
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search Bar */}
      <div className="px-2 py-1.5 border-b border-border/50 flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
          <Input
            ref={searchRef}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter files..."
            className="h-7 text-xs pl-7 pr-7 bg-muted/30 border-0 focus-visible:ring-1 focus-visible:ring-emerald-500/30 placeholder:text-muted-foreground/40"
          />
          {isSearching && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-muted/80 transition-colors"
            >
              <X className="w-3 h-3 text-muted-foreground/60" />
            </button>
          )}
        </div>
        {isSearching && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between mt-1 px-1"
          >
            <span className="text-[10px] text-muted-foreground">
              {matchingFileCount} file{matchingFileCount !== 1 ? 's' : ''} match
            </span>
            <span className="text-[9px] text-muted-foreground/40">
              ⌃⇧F
            </span>
          </motion.div>
        )}
      </div>

      {/* Tree Content */}
      <ScrollArea className="flex-1">
        <div className="py-1 relative">
          {isSearching && matchingFileCount === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Search className="w-5 h-5 text-muted-foreground/30 mb-2" />
              <p className="text-xs text-muted-foreground">
                No files matching &apos;{searchQuery}&apos;
              </p>
            </div>
          ) : (
            tree.map((node) => (
              <TreeNodeItem
                key={node.path}
                node={node}
                selectedFileId={selectedFileId}
                onSelectFile={onSelectFile}
                depth={0}
                searchQuery={searchQuery}
                forceExpand={isSearching}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
