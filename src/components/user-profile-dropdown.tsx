'use client'

import { useTheme } from 'next-themes'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
} from 'lucide-react'
import { toast } from 'sonner'

interface User {
  id: string
  email: string
  name: string | null
  avatar: string | null
  createdAt: string
}

interface UserProfileDropdownProps {
  user: User | null
  projectCount: number
  fileCount: number
  onLogout: () => void
  onShowShortcuts: () => void
}

export function UserProfileDropdown({
  user,
  projectCount,
  fileCount,
  onLogout,
  onShowShortcuts,
}: UserProfileDropdownProps) {
  const { theme, setTheme } = useTheme()

  const userInitial = user?.name?.charAt(0)?.toUpperCase() || 'U'
  const userName = user?.name || 'User'
  const userEmail = user?.email || ''

  const handleToggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  return (
    <DropdownMenu>
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
      <DropdownMenuContent align="end" className="w-72 p-0">
        {/* User Info Section */}
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="text-sm bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-semibold">
                {userInitial}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold truncate">{userName}</p>
                <Badge
                  variant="secondary"
                  className="text-[9px] px-1.5 py-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0 shrink-0"
                >
                  Free
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
            </div>
          </div>
        </div>

        <DropdownMenuSeparator className="!my-0" />

        {/* Quick Stats Row */}
        <div className="flex items-center justify-around px-4 py-2.5 bg-muted/30">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <FolderKanban className="w-3.5 h-3.5 text-emerald-500" />
            <span className="font-medium text-foreground">{projectCount}</span>
            <span>Projects</span>
          </div>
          <div className="w-px h-3.5 bg-border" />
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <FileCode className="w-3.5 h-3.5 text-teal-500" />
            <span className="font-medium text-foreground">{fileCount}</span>
            <span>Files</span>
          </div>
        </div>

        <DropdownMenuSeparator className="!my-0" />

        {/* Menu Items */}
        <div className="py-1">
          <DropdownMenuGroup>
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => toast.info('Profile page coming soon!')}
            >
              <User className="w-4 h-4 text-muted-foreground" />
              My Profile
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => toast.info('API key management coming soon!')}
            >
              <Key className="w-4 h-4 text-muted-foreground" />
              API Keys
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => toast.info('Settings page coming soon!')}
            >
              <Settings2 className="w-4 h-4 text-muted-foreground" />
              Settings
            </DropdownMenuItem>
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          <DropdownMenuGroup>
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={onShowShortcuts}
            >
              <Keyboard className="w-4 h-4 text-muted-foreground" />
              Keyboard Shortcuts
              <span className="ml-auto text-[10px] text-muted-foreground">⌘/</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={handleToggleTheme}
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-500" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-400" />
              )}
              Toggle Theme
            </DropdownMenuItem>
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            variant="destructive"
            className="cursor-pointer"
            onClick={onLogout}
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
