'use client'

import { useState, useCallback } from 'react'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from '@/components/ui/context-menu'
import {
  Copy, FileText, Quote, Pin, Trash2, RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'

export interface ChatContextMenuProps {
  children: React.ReactNode
  messageContent: string
  messageRole: string
  messageId?: string
  isPinned?: boolean
  onQuote?: (text: string) => void
  onPin?: (id: string, content: string) => void
  onUnpin?: (id: string) => void
  onDelete?: (id: string) => void
  onRegenerate?: () => void
}

export function ChatContextMenu({
  children,
  messageContent,
  messageRole,
  messageId,
  isPinned = false,
  onQuote,
  onPin,
  onUnpin,
  onDelete,
  onRegenerate,
}: ChatContextMenuProps) {
  const [confirmDelete, setConfirmDelete] = useState(false)

  const isAiMessage = messageRole !== 'user'

  const handleCopyMessage = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(messageContent)
      toast.success('Message copied to clipboard')
    } catch {
      toast.error('Failed to copy message')
    }
  }, [messageContent])

  const handleCopyAsMarkdown = useCallback(async () => {
    const rolePrefix = messageRole === 'user' ? '**You**' : `**AI (${messageRole})**`
    const markdown = `${rolePrefix}:\n\n${messageContent}`
    try {
      await navigator.clipboard.writeText(markdown)
      toast.success('Copied as markdown')
    } catch {
      toast.error('Failed to copy')
    }
  }, [messageContent, messageRole])

  const handleQuote = useCallback(() => {
    if (onQuote) {
      const quotedText = messageContent.split('\n').map(line => `> ${line}`).join('\n')
      onQuote(quotedText + '\n\n')
    }
  }, [messageContent, onQuote])

  const handlePin = useCallback(() => {
    if (isPinned && onUnpin && messageId) {
      onUnpin(messageId)
      toast.success('Message unpinned')
    } else if (onPin && messageId) {
      onPin(messageId, messageContent)
      toast.success('Message pinned')
    }
  }, [isPinned, onPin, onUnpin, messageId, messageContent])

  const handleDelete = useCallback(() => {
    if (!confirmDelete) {
      setConfirmDelete(true)
      setTimeout(() => setConfirmDelete(false), 3000)
      return
    }
    if (onDelete && messageId) {
      onDelete(messageId)
      toast.success('Message deleted')
    }
    setConfirmDelete(false)
  }, [confirmDelete, onDelete, messageId])

  const handleRegenerate = useCallback(() => {
    if (onRegenerate) {
      onRegenerate()
    }
  }, [onRegenerate])

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent
        className="w-52 bg-background/80 backdrop-blur-xl border-border/50 shadow-xl rounded-xl p-1"
      >
        <ContextMenuItem
          onClick={handleCopyMessage}
          className="rounded-lg cursor-pointer flex items-center gap-2.5 px-3 py-2 text-xs transition-colors focus:bg-emerald-50 dark:focus:bg-emerald-950/30 focus:text-emerald-700 dark:focus:text-emerald-300"
        >
          <Copy className="w-3.5 h-3.5 text-muted-foreground" />
          Copy Message
        </ContextMenuItem>

        <ContextMenuItem
          onClick={handleCopyAsMarkdown}
          className="rounded-lg cursor-pointer flex items-center gap-2.5 px-3 py-2 text-xs transition-colors focus:bg-emerald-50 dark:focus:bg-emerald-950/30 focus:text-emerald-700 dark:focus:text-emerald-300"
        >
          <FileText className="w-3.5 h-3.5 text-muted-foreground" />
          Copy as Markdown
        </ContextMenuItem>

        <ContextMenuItem
          onClick={handleQuote}
          className="rounded-lg cursor-pointer flex items-center gap-2.5 px-3 py-2 text-xs transition-colors focus:bg-emerald-50 dark:focus:bg-emerald-950/30 focus:text-emerald-700 dark:focus:text-emerald-300"
        >
          <Quote className="w-3.5 h-3.5 text-muted-foreground" />
          Quote Message
        </ContextMenuItem>

        <ContextMenuItem
          onClick={handlePin}
          className="rounded-lg cursor-pointer flex items-center gap-2.5 px-3 py-2 text-xs transition-colors focus:bg-emerald-50 dark:focus:bg-emerald-950/30 focus:text-emerald-700 dark:focus:text-emerald-300"
        >
          <Pin className={`w-3.5 h-3.5 ${isPinned ? 'text-emerald-500' : 'text-muted-foreground'}`} />
          {isPinned ? 'Unpin Message' : 'Pin Message'}
        </ContextMenuItem>

        {isAiMessage && onRegenerate && (
          <>
            <ContextMenuSeparator className="my-1 bg-border/50" />
            <ContextMenuItem
              onClick={handleRegenerate}
              className="rounded-lg cursor-pointer flex items-center gap-2.5 px-3 py-2 text-xs transition-colors focus:bg-emerald-50 dark:focus:bg-emerald-950/30 focus:text-emerald-700 dark:focus:text-emerald-300"
            >
              <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
              Regenerate
            </ContextMenuItem>
          </>
        )}

        <ContextMenuSeparator className="my-1 bg-border/50" />

        <ContextMenuItem
          onClick={handleDelete}
          variant="destructive"
          className="rounded-lg cursor-pointer flex items-center gap-2.5 px-3 py-2 text-xs transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          {confirmDelete ? 'Click again to confirm' : 'Delete Message'}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}
