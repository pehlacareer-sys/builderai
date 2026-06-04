'use client'

import { useState, useMemo, useCallback } from 'react'
import { useChatStore, Conversation } from '@/stores/chat-store'
import { useProjectStore } from '@/stores/project-store'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageSquare, Search, Trash2, Archive, ArchiveRestore,
  Clock, Plus, MessageCircle, Loader2, Inbox,
} from 'lucide-react'
import { toast } from 'sonner'

interface ConversationHistoryProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
}

// Archived conversations stored locally
const archivedIds = new Set<string>()

function getRelativeTime(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const seconds = Math.floor(diffMs / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function ConversationItem({
  conversation,
  isActive,
  isArchived,
  onSelect,
  onDelete,
  onArchive,
}: {
  conversation: Conversation
  isActive: boolean
  isArchived: boolean
  onSelect: () => void
  onDelete: () => void
  onArchive: () => void
}) {
  const firstMessage = conversation.messages?.[0]?.content
  const messageCount = conversation.messages?.length || 0
  const preview = firstMessage
    ? firstMessage.length > 80
      ? firstMessage.slice(0, 80) + '...'
      : firstMessage
    : 'No messages yet'

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10, height: 0 }}
      className={`group rounded-lg border p-3 transition-all cursor-pointer ${
        isActive
          ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800'
          : 'hover:bg-muted/50 border-transparent hover:border-border/50'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <MessageSquare className="w-3 h-3 text-muted-foreground flex-shrink-0" />
            <span className="text-sm font-medium truncate">
              {conversation.title || 'Untitled Chat'}
            </span>
            {isArchived && (
              <Badge variant="secondary" className="text-[8px] px-1 py-0 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 flex-shrink-0">
                Archived
              </Badge>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">{preview}</p>
          <div className="flex items-center gap-2 mt-1.5 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <MessageCircle className="w-2.5 h-2.5" />
              {messageCount} {messageCount === 1 ? 'msg' : 'msgs'}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-2.5 h-2.5" />
              {getRelativeTime(conversation.updatedAt)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation()
              onArchive()
            }}
            title={isArchived ? 'Restore' : 'Archive'}
          >
            {isArchived ? (
              <ArchiveRestore className="w-3 h-3 text-muted-foreground" />
            ) : (
              <Archive className="w-3 h-3 text-muted-foreground" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            title="Delete"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </motion.div>
  )
}

export function ConversationHistory({ open, onOpenChange, projectId }: ConversationHistoryProps) {
  const {
    conversations, currentConversation, selectConversation,
    deleteConversation, createConversation, loadConversations,
  } = useChatStore()
  const { currentProject } = useProjectStore()
  const [search, setSearch] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const filteredConversations = useMemo(() => {
    let result = conversations

    // Filter by search
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (c) =>
          (c.title || '').toLowerCase().includes(q) ||
          (c.messages?.[0]?.content || '').toLowerCase().includes(q)
      )
    }

    // Filter by archive status
    if (showArchived) {
      result = result.filter((c) => archivedIds.has(c.id))
    } else {
      result = result.filter((c) => !archivedIds.has(c.id))
    }

    return result
  }, [conversations, search, showArchived])

  const handleSelect = useCallback(async (conversationId: string) => {
    setLoading(true)
    try {
      await selectConversation(projectId, conversationId)
      onOpenChange(false)
    } catch {
      toast.error('Failed to load conversation')
    } finally {
      setLoading(false)
    }
  }, [projectId, selectConversation, onOpenChange])

  const handleDelete = useCallback(async () => {
    if (!deleteConfirm) return
    try {
      await deleteConversation(projectId, deleteConfirm)
      archivedIds.delete(deleteConfirm)
      toast.success('Conversation deleted')
    } catch {
      toast.error('Failed to delete conversation')
    }
    setDeleteConfirm(null)
  }, [projectId, deleteConfirm, deleteConversation])

  const handleArchive = useCallback((conversationId: string) => {
    if (archivedIds.has(conversationId)) {
      archivedIds.delete(conversationId)
      toast.success('Conversation restored')
    } else {
      archivedIds.add(conversationId)
      toast.success('Conversation archived')
    }
    // Force re-render by triggering loadConversations
    loadConversations(projectId)
  }, [projectId, loadConversations])

  const handleNewChat = useCallback(async () => {
    if (!currentProject) return
    try {
      await createConversation(currentProject.id)
      onOpenChange(false)
    } catch {
      toast.error('Failed to create conversation')
    }
  }, [currentProject, createConversation, onOpenChange])

  const archivedCount = conversations.filter((c) => archivedIds.has(c.id)).length

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="left" className="w-[360px] sm:max-w-[400px] p-0 flex flex-col">
          <SheetHeader className="px-4 pt-4 pb-2 border-b flex-shrink-0">
            <SheetTitle className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-500" />
              Conversation History
            </SheetTitle>
          </SheetHeader>

          {/* Search + Actions */}
          <div className="px-4 py-2 border-b flex flex-col gap-2 flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search conversations..."
                className="pl-8 h-8 text-xs"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={showArchived ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 text-[11px]"
                onClick={() => setShowArchived(!showArchived)}
              >
                <Archive className="w-3 h-3 mr-1" />
                Archived
                {archivedCount > 0 && (
                  <Badge variant="secondary" className="ml-1 text-[9px] px-1 py-0">
                    {archivedCount}
                  </Badge>
                )}
              </Button>
              <div className="flex-1" />
              <Button
                size="sm"
                className="h-7 text-[11px] bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white"
                onClick={handleNewChat}
              >
                <Plus className="w-3 h-3 mr-1" />
                New Chat
              </Button>
            </div>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full px-6 text-center">
                <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
                  <Inbox className="w-7 h-7 text-muted-foreground" />
                </div>
                <h3 className="text-sm font-medium mb-1">
                  {showArchived ? 'No archived conversations' : 'No conversations yet'}
                </h3>
                <p className="text-[11px] text-muted-foreground mb-3">
                  {showArchived
                    ? 'Conversations you archive will appear here'
                    : 'Start a new conversation with the AI to begin building'}
                </p>
                {!showArchived && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                    onClick={handleNewChat}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Start a new conversation
                  </Button>
                )}
              </div>
            ) : (
              <ScrollArea className="h-full">
                <div className="p-3 space-y-1">
                  <AnimatePresence>
                    {filteredConversations.map((conv) => (
                      <ConversationItem
                        key={conv.id}
                        conversation={conv}
                        isActive={currentConversation?.id === conv.id}
                        isArchived={archivedIds.has(conv.id)}
                        onSelect={() => handleSelect(conv.id)}
                        onDelete={() => setDeleteConfirm(conv.id)}
                        onArchive={() => handleArchive(conv.id)}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Footer stats */}
          <div className="border-t px-4 py-2 flex items-center justify-between text-[10px] text-muted-foreground flex-shrink-0">
            <span>{conversations.length} total conversations</span>
            {archivedCount > 0 && <span>{archivedCount} archived</span>}
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Conversation</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the conversation and all its messages.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
