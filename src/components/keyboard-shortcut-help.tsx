'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Keyboard, Navigation, MessageSquare, Code2, Settings2 } from 'lucide-react'
import { formatShortcut, getModifierKey } from '@/hooks/use-keyboard-shortcuts'

interface ShortcutDef {
  key: string
  ctrlKey?: boolean
  metaKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
  label: string
}

interface ShortcutCategory {
  title: string
  icon: React.ElementType
  shortcuts: ShortcutDef[]
}

const SHORTCUT_CATEGORIES: ShortcutCategory[] = [
  {
    title: 'Navigation',
    icon: Navigation,
    shortcuts: [
      { key: 'k', ctrlKey: true, metaKey: true, label: 'Focus search' },
      { key: 'b', ctrlKey: true, metaKey: true, label: 'Toggle sidebar' },
    ],
  },
  {
    title: 'Editor',
    icon: Code2,
    shortcuts: [
      { key: 's', ctrlKey: true, metaKey: true, label: 'Save current file' },
      { key: 'escape', label: 'Cancel edit mode' },
    ],
  },
  {
    title: 'Chat',
    icon: MessageSquare,
    shortcuts: [
      { key: 'enter', ctrlKey: true, metaKey: true, label: 'Send message' },
    ],
  },
  {
    title: 'General',
    icon: Settings2,
    shortcuts: [
      { key: '/', ctrlKey: true, metaKey: true, label: 'Show keyboard shortcuts' },
    ],
  },
]

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-[10px] border border-border/50 shadow-[0_1px_0_1px_rgba(0,0,0,0.05)]">
      {children}
    </kbd>
  )
}

export function KeyboardShortcutHelp() {
  const [open, setOpen] = useState(false)

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const modifierKey = navigator.platform.toUpperCase().indexOf('MAC') >= 0
      ? e.metaKey
      : e.ctrlKey

    if (modifierKey && e.key === '/') {
      e.preventDefault()
      setOpen(prev => !prev)
    }
  }, [])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-3 border-b">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Keyboard className="w-4 h-4 text-emerald-500" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription className="text-xs">
            Use these shortcuts to navigate and interact faster.
            <span className="ml-1 text-muted-foreground/70">
              ({getModifierKey()} + / to toggle)
            </span>
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-80">
          <div className="p-4 space-y-5">
            {SHORTCUT_CATEGORIES.map((category) => (
              <div key={category.title}>
                <div className="flex items-center gap-1.5 mb-2">
                  <category.icon className="w-3.5 h-3.5 text-emerald-500" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {category.title}
                  </h3>
                </div>
                <div className="space-y-1.5">
                  {category.shortcuts.map((shortcut) => {
                    const keys = formatShortcut(shortcut)
                    return (
                      <div
                        key={shortcut.label}
                        className="flex items-center justify-between py-1 px-2 rounded-md hover:bg-muted/50 transition-colors"
                      >
                        <span className="text-sm">{shortcut.label}</span>
                        <div className="flex items-center gap-1">
                          {keys.map((key, i) => (
                            <span key={i} className="flex items-center gap-1">
                              {i > 0 && (
                                <span className="text-[10px] text-muted-foreground/50">+</span>
                              )}
                              <Kbd>{key}</Kbd>
                            </span>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
        <div className="border-t px-4 py-2.5 flex items-center justify-between bg-muted/30">
          <span className="text-[10px] text-muted-foreground">
            Shortcuts work across the app
          </span>
          <div className="flex items-center gap-1">
            <Kbd>Esc</Kbd>
            <span className="text-[10px] text-muted-foreground ml-1">to close</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
