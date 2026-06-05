'use client'

import { MessageSquare, FolderTree, Code2, Eye } from 'lucide-react'
import { cn } from '@/lib/utils'

export type MobileTab = 'chat' | 'files' | 'code' | 'preview'

interface MobileNavProps {
  activeTab: MobileTab
  onTabChange: (tab: MobileTab) => void
}

const TABS: { id: MobileTab; label: string; icon: React.ElementType }[] = [
  { id: 'chat', label: 'Chat', icon: MessageSquare },
  { id: 'files', label: 'Files', icon: FolderTree },
  { id: 'code', label: 'Code', icon: Code2 },
  { id: 'preview', label: 'Preview', icon: Eye },
]

export function MobileNav({ activeTab, onTabChange }: MobileNavProps) {
  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t bg-background/80 backdrop-blur-xl"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      role="tablist"
      aria-label="Workspace navigation"
    >
      <div className="flex items-center justify-around h-14">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              aria-label={tab.label}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 min-w-[64px] min-h-[44px] rounded-lg transition-colors',
                isActive
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <tab.icon className={cn('w-5 h-5', isActive && 'text-emerald-600 dark:text-emerald-400')} />
              <span className={cn('text-[10px] font-medium', isActive && 'text-emerald-600 dark:text-emerald-400')}>
                {tab.label}
              </span>
              {isActive && (
                <span className="absolute -top-px left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-emerald-500" />
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
