'use client'

import { ProjectFile } from '@/stores/project-store'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import {
  FileCode, FileJson, FileText, FileType, Folder,
  FolderOpen, ChevronRight, ChevronDown
} from 'lucide-react'
import { useState, useMemo } from 'react'

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

function getFileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase()
  if (ext === 'tsx' || ext === 'ts') return <FileCode className="w-4 h-4 text-blue-500" />
  if (ext === 'jsx' || ext === 'js') return <FileCode className="w-4 h-4 text-amber-500" />
  if (ext === 'json') return <FileJson className="w-4 h-4 text-yellow-500" />
  if (ext === 'css') return <FileType className="w-4 h-4 text-purple-500" />
  if (ext === 'md') return <FileText className="w-4 h-4 text-gray-500" />
  return <FileText className="w-4 h-4 text-muted-foreground" />
}

interface TreeNodeProps {
  node: TreeNode
  selectedFileId: string | null
  onSelectFile: (file: ProjectFile) => void
  depth: number
}

function TreeNodeItem({ node, selectedFileId, onSelectFile, depth }: TreeNodeProps) {
  const [expanded, setExpanded] = useState(depth < 2)

  if (node.isDir) {
    return (
      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 w-full px-2 py-1 text-sm hover:bg-muted/50 rounded-sm transition-colors"
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
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
          <span className="truncate">{node.name}</span>
        </button>
        {expanded && node.children.map((child) => (
          <TreeNodeItem
            key={child.path}
            node={child}
            selectedFileId={selectedFileId}
            onSelectFile={onSelectFile}
            depth={depth + 1}
          />
        ))}
      </div>
    )
  }

  return (
    <button
      onClick={() => node.file && onSelectFile(node.file)}
      className={cn(
        'flex items-center gap-1.5 w-full px-2 py-1 text-sm rounded-sm transition-colors',
        selectedFileId === node.file?.id
          ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-100'
          : 'hover:bg-muted/50'
      )}
      style={{ paddingLeft: `${depth * 12 + 20}px` }}
    >
      {getFileIcon(node.name)}
      <span className="truncate">{node.name}</span>
    </button>
  )
}

interface FileTreeProps {
  files: ProjectFile[]
  selectedFileId: string | null
  onSelectFile: (file: ProjectFile) => void
}

export function FileTree({ files, selectedFileId, onSelectFile }: FileTreeProps) {
  const tree = useMemo(() => buildTree(files), [files])

  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <Folder className="w-8 h-8 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">No files yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          Chat with AI to generate code
        </p>
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="py-2">
        {tree.map((node) => (
          <TreeNodeItem
            key={node.path}
            node={node}
            selectedFileId={selectedFileId}
            onSelectFile={onSelectFile}
            depth={0}
          />
        ))}
      </div>
    </ScrollArea>
  )
}
