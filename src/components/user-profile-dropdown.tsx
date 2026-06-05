'use client'

import { useState, useCallback } from 'react'
import { useTheme } from 'next-themes'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { motion, AnimatePresence } from 'framer-motion'
import {
  User,
  Key,
  Settings2,
  Keyboard,
  Sun,
  Moon,
  LogOut,
  FolderKanban,
  FileCode,
  Map,
  MessageSquare,
  Crown,
  Zap,
  Calendar,
  Minimize2,
  Save,
  List,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react'
import { toast } from 'sonner'

interface UserData {
  id: string
  email: string
  name: string | null
  avatar: string | null
  createdAt: string
}

interface UserProfileDropdownProps {
  user: UserData | null
  projectCount: number
  fileCount: number
  messageCount?: number
  onLogout: () => void
  onShowShortcuts: () => void
  onShowTour?: () => void
}

// ─── Subscription Tier (mock data) ─────────────────────────────────────────

const SUBSCRIPTION_TIERS: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  free: {
    label: 'Free',
    color: 'bg-muted text-muted-foreground border-border',
    icon: Zap,
  },
  pro: {
    label: 'Pro',
    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
    icon: Crown,
  },
  enterprise: {
    label: 'Enterprise',
    color: 'bg-gradient-to-r from-emerald-100 to-teal-100 text-teal-700 dark:from-emerald-900/30 dark:to-teal-900/30 dark:text-teal-400 border-emerald-200 dark:border-emerald-800',
    icon: Crown,
  },
}

function getSubscriptionTier(userId: string): string {
  // Mock: deterministic tier based on userId hash
  const hash = userId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  if (hash % 5 === 0) return 'enterprise'
  if (hash % 3 === 0) return 'pro'
  return 'free'
}

// ─── LocalStorage helpers ──────────────────────────────────────────────────

function getStoredBool(key: string, fallback: boolean): boolean {
  if (typeof window === 'undefined') return fallback
  try {
    const val = localStorage.getItem(key)
    return val === null ? fallback : val === 'true'
  } catch {
    return fallback
  }
}

function setStoredBool(key: string, value: boolean): void {
  try {
    localStorage.setItem(key, String(value))
  } catch {
    // ignore
  }
}

// ─── Format member-since date ──────────────────────────────────────────────

function formatMemberSince(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

// ─── Main Component ────────────────────────────────────────────────────────

export function UserProfileDropdown({
  user,
  projectCount,
  fileCount,
  messageCount = 0,
  onLogout,
  onShowShortcuts,
  onShowTour,
}: UserProfileDropdownProps) {
  const { theme, setTheme } = useTheme()
  const [signOutConfirm, setSignOutConfirm] = useState(false)
  // Lazy state initialization from localStorage (avoids setState in effect)
  const [compactMode, setCompactMode] = useState(() => getStoredBool('builderai-compact-mode', false))
  const [autoSave, setAutoSave] = useState(() => getStoredBool('builderai-auto-save', true))
  const [showLineNumbers, setShowLineNumbers] = useState(() => getStoredBool('builderai-line-numbers', true))

  const handleToggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }, [theme, setTheme])

  const handleToggleCompact = useCallback((checked: boolean) => {
    setCompactMode(checked)
    setStoredBool('builderai-compact-mode', checked)
    toast.success(checked ? 'Compact mode enabled' : 'Compact mode disabled')
  }, [])

  const handleToggleAutoSave = useCallback((checked: boolean) => {
    setAutoSave(checked)
    setStoredBool('builderai-auto-save', checked)
    toast.success(checked ? 'Auto-save enabled' : 'Auto-save disabled')
  }, [])

  const handleToggleLineNumbers = useCallback((checked: boolean) => {
    setShowLineNumbers(checked)
    setStoredBool('builderai-line-numbers', checked)
    toast.success(checked ? 'Line numbers shown' : 'Line numbers hidden')
  }, [])

  const handleSignOutClick = useCallback(() => {
    if (!signOutConfirm) {
      setSignOutConfirm(true)
      // Auto-reset after 3 seconds if no action
      setTimeout(() => setSignOutConfirm(false), 3000)
      return
    }
    onLogout()
  }, [signOutConfirm, onLogout])

  const handleOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setSignOutConfirm(false)
    }
  }, [])

  const userInitial = user?.name
    ? user.name.split(' ').map(n => n.charAt(0)).join('').toUpperCase().slice(0, 2)
    : user?.email?.charAt(0)?.toUpperCase() || 'U'
  const userName = user?.name || 'User'
  const userEmail = user?.email || ''
  const memberSince = user?.createdAt ? formatMemberSince(user.createdAt) : ''
  const tier = user ? getSubscriptionTier(user.id) : 'free'
  const tierInfo = SUBSCRIPTION_TIERS[tier]

  return (
    <DropdownMenu onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <button
          className="focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-full"
          aria-label="User menu"
        >
          <Avatar className="h-6 w-6 cursor-pointer transition-transform hover:scale-110">
            <AvatarFallback className="text-[10px] bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-semibold">
              {userInitial}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-80 p-0 bg-background/80 backdrop-blur-xl border-border/50 shadow-xl shadow-emerald-500/5 overflow-hidden"
      >
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
          >
            {/* ── User Profile Section ─────────────────────────────────── */}
            <div className="relative px-4 pt-4 pb-3">
              {/* Subtle gradient background accent */}
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-teal-500/5 pointer-events-none" />

              <div className="relative flex items-center gap-3">
                <div className="relative">
                  <Avatar className="h-12 w-12 ring-2 ring-emerald-500/20 ring-offset-2 ring-offset-background">
                    <AvatarFallback className="text-base bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-bold">
                      {userInitial}
                    </AvatarFallback>
                  </Avatar>
                  {/* Online indicator */}
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-background rounded-full" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold truncate">{userName}</p>
                    <Badge
                      variant="secondary"
                      className={`text-[9px] px-1.5 py-0 border shrink-0 ${tierInfo.color}`}
                    >
                      <tierInfo.icon className="w-2.5 h-2.5 mr-0.5" />
                      {tierInfo.label}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
                  {memberSince && (
                    <div className="flex items-center gap-1 mt-0.5 text-[10px] text-muted-foreground/70">
                      <Calendar className="w-2.5 h-2.5" />
                      Member since {memberSince}
                    </div>
                  )}
                </div>
              </div>

              {/* Usage Stats Row */}
              <div className="relative mt-3 flex items-center justify-around rounded-lg bg-muted/40 border border-border/30 py-2 px-2">
                <div className="flex flex-col items-center gap-0.5">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <FolderKanban className="w-3 h-3 text-emerald-500" />
                    <span className="font-semibold text-foreground">{projectCount}</span>
                  </div>
                  <span className="text-[9px] text-muted-foreground/70">Projects</span>
                </div>
                <Separator orientation="vertical" className="h-6" />
                <div className="flex flex-col items-center gap-0.5">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <FileCode className="w-3 h-3 text-teal-500" />
                    <span className="font-semibold text-foreground">{fileCount}</span>
                  </div>
                  <span className="text-[9px] text-muted-foreground/70">Files</span>
                </div>
                <Separator orientation="vertical" className="h-6" />
                <div className="flex flex-col items-center gap-0.5">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MessageSquare className="w-3 h-3 text-sky-500" />
                    <span className="font-semibold text-foreground">{messageCount}</span>
                  </div>
                  <span className="text-[9px] text-muted-foreground/70">Messages</span>
                </div>
              </div>
            </div>

            {/* ── Section: Account ──────────────────────────────────────── */}
            <DropdownMenuSeparator className="!my-0" />
            <div className="px-3 pt-2 pb-0.5">
              <DropdownMenuLabel className="text-[9px] uppercase tracking-widest text-muted-foreground/60 font-medium px-1">
                Account
              </DropdownMenuLabel>
            </div>
            <div className="py-0.5 px-1">
              <DropdownMenuGroup>
                <DropdownMenuItem
                  className="cursor-pointer rounded-md hover:bg-emerald-500/5 focus:bg-emerald-500/5 transition-colors"
                  onClick={() => toast.info('Profile page coming soon!')}
                >
                  <User className="w-4 h-4 text-emerald-500/70" />
                  My Profile
                  <ChevronRight className="w-3 h-3 ml-auto text-muted-foreground/40" />
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer rounded-md hover:bg-emerald-500/5 focus:bg-emerald-500/5 transition-colors"
                  onClick={() => toast.info('API key management coming soon!')}
                >
                  <Key className="w-4 h-4 text-teal-500/70" />
                  API Keys
                  <ChevronRight className="w-3 h-3 ml-auto text-muted-foreground/40" />
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer rounded-md hover:bg-emerald-500/5 focus:bg-emerald-500/5 transition-colors"
                  onClick={() => toast.info('Settings page coming soon!')}
                >
                  <Settings2 className="w-4 h-4 text-muted-foreground/70" />
                  Settings
                  <ChevronRight className="w-3 h-3 ml-auto text-muted-foreground/40" />
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </div>

            {/* ── Section: Quick Settings ────────────────────────────────── */}
            <DropdownMenuSeparator className="!my-0" />
            <div className="px-3 pt-2 pb-0.5">
              <DropdownMenuLabel className="text-[9px] uppercase tracking-widest text-muted-foreground/60 font-medium px-1">
                Quick Settings
              </DropdownMenuLabel>
            </div>
            <div className="py-0.5 px-1">
              <DropdownMenuGroup>
                {/* Compact Mode Toggle */}
                <div className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-emerald-500/5 transition-colors cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Minimize2 className="w-4 h-4 text-emerald-500/70" />
                    <span className="text-sm">Compact Mode</span>
                  </div>
                  <Switch
                    checked={compactMode}
                    onCheckedChange={handleToggleCompact}
                    className="data-[state=checked]:bg-emerald-500"
                    aria-label="Toggle compact mode"
                  />
                </div>

                {/* Auto-save Toggle */}
                <div className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-emerald-500/5 transition-colors cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Save className="w-4 h-4 text-teal-500/70" />
                    <span className="text-sm">Auto-save</span>
                  </div>
                  <Switch
                    checked={autoSave}
                    onCheckedChange={handleToggleAutoSave}
                    className="data-[state=checked]:bg-emerald-500"
                    aria-label="Toggle auto-save"
                  />
                </div>

                {/* Show Line Numbers Toggle */}
                <div className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-emerald-500/5 transition-colors cursor-pointer">
                  <div className="flex items-center gap-2">
                    <List className="w-4 h-4 text-sky-500/70" />
                    <span className="text-sm">Line Numbers</span>
                  </div>
                  <Switch
                    checked={showLineNumbers}
                    onCheckedChange={handleToggleLineNumbers}
                    className="data-[state=checked]:bg-emerald-500"
                    aria-label="Toggle line numbers"
                  />
                </div>
              </DropdownMenuGroup>
            </div>

            {/* ── Section: Preferences ───────────────────────────────────── */}
            <DropdownMenuSeparator className="!my-0" />
            <div className="px-3 pt-2 pb-0.5">
              <DropdownMenuLabel className="text-[9px] uppercase tracking-widest text-muted-foreground/60 font-medium px-1">
                Preferences
              </DropdownMenuLabel>
            </div>
            <div className="py-0.5 px-1">
              <DropdownMenuGroup>
                <DropdownMenuItem
                  className="cursor-pointer rounded-md hover:bg-emerald-500/5 focus:bg-emerald-500/5 transition-colors"
                  onClick={onShowShortcuts}
                >
                  <Keyboard className="w-4 h-4 text-emerald-500/70" />
                  Keyboard Shortcuts
                  <span className="ml-auto text-[10px] text-muted-foreground/50 font-mono">Ctrl+/</span>
                </DropdownMenuItem>
                {onShowTour && (
                  <DropdownMenuItem
                    className="cursor-pointer rounded-md hover:bg-emerald-500/5 focus:bg-emerald-500/5 transition-colors"
                    onClick={onShowTour}
                  >
                    <Map className="w-4 h-4 text-emerald-500/70" />
                    Show Tour
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  className="cursor-pointer rounded-md hover:bg-emerald-500/5 focus:bg-emerald-500/5 transition-colors"
                  onClick={handleToggleTheme}
                >
                  {theme === 'dark' ? (
                    <Sun className="w-4 h-4 text-amber-500/70" />
                  ) : (
                    <Moon className="w-4 h-4 text-slate-500/70" />
                  )}
                  Toggle Theme
                  <span className="ml-auto text-[10px] text-muted-foreground/50">
                    {theme === 'dark' ? 'Light' : 'Dark'}
                  </span>
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </div>

            {/* ── Section: Sign Out ──────────────────────────────────────── */}
            <DropdownMenuSeparator className="!my-0" />
            <div className="p-1.5 pb-2">
              <motion.button
                onClick={handleSignOutClick}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-all ${
                  signOutConfirm
                    ? 'bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20'
                    : 'text-destructive hover:bg-red-500/5'
                }`}
                whileTap={{ scale: 0.98 }}
              >
                {signOutConfirm ? (
                  <>
                    <ShieldAlert className="w-4 h-4" />
                    <span className="font-medium">Are you sure?</span>
                    <span className="ml-auto text-[10px] opacity-60">Click again</span>
                  </>
                ) : (
                  <>
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </>
                )}
              </motion.button>
            </div>
          </motion.div>
        </AnimatePresence>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
