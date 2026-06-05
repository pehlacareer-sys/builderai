'use client'

import { useState, useSyncExternalStore, useCallback } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bell, FileCode, Shield, Loader2, MessageSquare,
  Save, X, CheckCheck, Sparkles
} from 'lucide-react'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface Notification {
  id: string
  type: 'files_generated' | 'status_changed' | 'validation' | 'version_saved' | 'chat_started'
  title: string
  description: string
  timestamp: string
  read: boolean
  projectName?: string
}

// ─── Global Notification Store ──────────────────────────────────────────────
// Using a global store with useSyncExternalStore avoids setState-in-effect issues

const STORAGE_KEY = 'builderai-notifications'
let notificationsSnapshot: Notification[] = []
const storeListeners = new Set<() => void>()

function emitChange() {
  storeListeners.forEach((fn) => fn())
}

function loadFromStorage() {
  if (typeof window === 'undefined') return
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      notificationsSnapshot = JSON.parse(stored)
      emitChange()
    }
  } catch {
    // Ignore
  }
}

function saveToStorage() {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notificationsSnapshot.slice(0, 50)))
  } catch {
    // Ignore
  }
}

// Initialize from localStorage on module load (client only)
if (typeof window !== 'undefined') {
  // Defer to after mount to avoid hydration mismatch
  setTimeout(loadFromStorage, 0)
}

function subscribeToStore(callback: () => void) {
  storeListeners.add(callback)
  return () => { storeListeners.delete(callback) }
}

function getSnapshot(): Notification[] {
  return notificationsSnapshot
}

function getServerSnapshot(): Notification[] {
  return []
}

// ─── Store Actions ──────────────────────────────────────────────────────────

export function pushNotification(partial: Omit<Notification, 'id' | 'timestamp' | 'read'>) {
  const notification: Notification = {
    ...partial,
    id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    read: false,
  }
  notificationsSnapshot = [notification, ...notificationsSnapshot]
  saveToStorage()
  emitChange()
}

function markAsRead(id: string) {
  notificationsSnapshot = notificationsSnapshot.map((n) =>
    n.id === id ? { ...n, read: true } : n
  )
  saveToStorage()
  emitChange()
}

function markAllAsRead() {
  notificationsSnapshot = notificationsSnapshot.map((n) => ({ ...n, read: true }))
  saveToStorage()
  emitChange()
}

function clearNotification(id: string) {
  notificationsSnapshot = notificationsSnapshot.filter((n) => n.id !== id)
  saveToStorage()
  emitChange()
}

function clearAll() {
  notificationsSnapshot = []
  saveToStorage()
  emitChange()
}

// ─── Auto-notification: Track generatedFiles changes ────────────────────────

let prevGeneratedFileCount = 0

export function trackGeneratedFiles(fileCount: number, projectName?: string) {
  if (fileCount > prevGeneratedFileCount && prevGeneratedFileCount > 0) {
    pushNotification({
      type: 'files_generated',
      title: 'AI generated files',
      description: `${fileCount} file${fileCount > 1 ? 's' : ''} generated${projectName ? ` for ${projectName}` : ''}`,
      projectName,
    })
  }
  prevGeneratedFileCount = fileCount
}

// ─── Notification Icons ─────────────────────────────────────────────────────

function NotificationIcon({ type }: { type: Notification['type'] }) {
  switch (type) {
    case 'files_generated':
      return (
        <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
          <FileCode className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
        </div>
      )
    case 'status_changed':
      return (
        <div className="w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
          <Loader2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
        </div>
      )
    case 'validation':
      return (
        <div className="w-7 h-7 rounded-full bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center flex-shrink-0">
          <Shield className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
        </div>
      )
    case 'version_saved':
      return (
        <div className="w-7 h-7 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
          <Save className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
        </div>
      )
    case 'chat_started':
      return (
        <div className="w-7 h-7 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center flex-shrink-0">
          <MessageSquare className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
        </div>
      )
    default:
      return (
        <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-3.5 h-3.5 text-muted-foreground" />
        </div>
      )
  }
}

// ─── Relative time helper ───────────────────────────────────────────────────

function relativeTime(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then

  if (diffMs < 60000) return 'Just now'
  if (diffMs < 3600000) return `${Math.floor(diffMs / 60000)}m ago`
  if (diffMs < 86400000) return `${Math.floor(diffMs / 3600000)}h ago`
  if (diffMs < 604800000) return `${Math.floor(diffMs / 86400000)}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ─── Notification Center Component ──────────────────────────────────────────

export function NotificationCenter() {
  const notifications = useSyncExternalStore(subscribeToStore, getSnapshot, getServerSnapshot)
  const [open, setOpen] = useState(false)

  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 relative"
          title="Notifications"
        >
          <Bell className="w-3.5 h-3.5" />
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[14px] h-[14px] px-[3px] rounded-full bg-emerald-500 text-[8px] font-bold text-white"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </motion.span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-80 p-0 rounded-lg shadow-lg border"
      >
        {/* Header */}
        <div className="px-3 py-2.5 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold">Notifications</span>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-[9px] px-1.5 h-4 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                {unreadCount} new
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[10px] px-1.5 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700"
                onClick={markAllAsRead}
              >
                <CheckCheck className="w-3 h-3 mr-0.5" />
                Mark all read
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[10px] px-1.5 text-muted-foreground hover:text-destructive"
                onClick={clearAll}
              >
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Notification List */}
        {notifications.length === 0 ? (
          <div className="py-8 flex flex-col items-center justify-center gap-2">
            <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center">
              <Bell className="w-5 h-5 text-muted-foreground/50" />
            </div>
            <p className="text-xs font-medium text-muted-foreground">No notifications</p>
            <p className="text-[10px] text-muted-foreground/70">Activity will appear here</p>
          </div>
        ) : (
          <ScrollArea className="max-h-80">
            <AnimatePresence initial={false}>
              {notifications.map((notification) => (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <div
                    className={`flex items-start gap-2.5 px-3 py-2.5 hover:bg-muted/50 transition-colors cursor-pointer group relative ${
                      !notification.read ? 'bg-emerald-50/50 dark:bg-emerald-950/10' : ''
                    }`}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <NotificationIcon type={notification.type} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <p className={`text-xs leading-tight ${!notification.read ? 'font-semibold' : 'font-medium'}`}>
                          {notification.title}
                        </p>
                        <span className="text-[9px] text-muted-foreground whitespace-nowrap flex-shrink-0 mt-0.5">
                          {relativeTime(notification.timestamp)}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground leading-tight mt-0.5 line-clamp-2">
                        {notification.description}
                      </p>
                      {!notification.read && (
                        <span className="absolute top-3 right-2 w-1.5 h-1.5 rounded-full bg-emerald-500 group-hover:hidden" />
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5"
                      onClick={(e) => {
                        e.stopPropagation()
                        clearNotification(notification.id)
                      }}
                    >
                      <X className="w-2.5 h-2.5" />
                    </Button>
                  </div>
                  <Separator className="last:hidden" />
                </motion.div>
              ))}
            </AnimatePresence>
          </ScrollArea>
        )}

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="px-3 py-1.5 border-t text-center">
            <p className="text-[9px] text-muted-foreground">
              {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
