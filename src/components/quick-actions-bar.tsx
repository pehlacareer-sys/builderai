'use client'

import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FilePlus, Search, Terminal, Play,
  AlignLeft, GitBranch, Share2,
} from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { toast } from 'sonner'

interface QuickActionsBarProps {
  visible: boolean
  onClose: () => void
}

const actions = [
  { id: 'new-file', icon: FilePlus, label: 'New File', shortcut: 'Ctrl+N' },
  { id: 'search', icon: Search, label: 'Search', shortcut: 'Ctrl+Shift+F' },
  { id: 'terminal', icon: Terminal, label: 'Terminal', shortcut: 'Ctrl+`' },
  { id: 'build', icon: Play, label: 'Run Build', shortcut: 'Ctrl+Shift+B' },
  { id: 'format', icon: AlignLeft, label: 'Format Code', shortcut: 'Shift+Alt+F' },
  { id: 'git', icon: GitBranch, label: 'Git Status', shortcut: 'Ctrl+Shift+G' },
  { id: 'share', icon: Share2, label: 'Share', shortcut: 'Ctrl+Shift+S' },
]

export function QuickActionsBar({ visible, onClose }: QuickActionsBarProps) {
  const barRef = useRef<HTMLDivElement>(null)

  // Close on click outside
  useEffect(() => {
    if (!visible) return
    const handleClickOutside = (e: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    // Use a short delay so the initial click that opens the bar doesn't immediately close it
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
    }, 50)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [visible, onClose])

  // Close on Escape
  useEffect(() => {
    if (!visible) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [visible, onClose])

  const handleAction = (id: string) => {
    toast.info(`${actions.find(a => a.id === id)?.label || 'Action'} — Coming soon`)
    onClose()
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          ref={barRef}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="h-10 flex items-center gap-1 px-2 bg-background/70 backdrop-blur-xl border-t border-emerald-200/30 dark:border-emerald-800/30"
        >
          <span className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider mr-2 flex-shrink-0">
            Quick Actions
          </span>
          <div className="flex items-center gap-0.5">
            {actions.map((action) => (
              <TooltipProvider key={action.id}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => handleAction(action.id)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium text-muted-foreground hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
                    >
                      <action.icon className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">{action.label}</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-[10px]">
                    {action.label} <kbd className="ml-1 px-1 py-0.5 rounded bg-muted text-[9px] font-mono">{action.shortcut}</kbd>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
          <div className="ml-auto flex-shrink-0">
            <span className="text-[9px] text-muted-foreground/50">
              Esc to close
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
