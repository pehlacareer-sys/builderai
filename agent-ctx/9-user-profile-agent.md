---
Task ID: 9
Agent: User Profile Agent
Task: Create User Profile Dropdown Component

Work Log:
- Read project worklog, workspace.tsx, auth-store, project-store, keyboard-shortcut-help, theme-toggle, and dropdown-menu UI component to understand existing codebase
- Created `/src/components/user-profile-dropdown.tsx` with the following features:
  - Trigger: Clickable avatar with emerald gradient background, hover scale animation
  - DropdownMenu (w-72) with user info section at top (large avatar, user name bold, email muted, "Free" badge in emerald)
  - Quick stats row showing project count and file count with icons (FolderKanban, FileCode)
  - Menu items: My Profile (User icon, toast), API Keys (Key icon, toast), Settings (Settings2 icon, toast)
  - Keyboard Shortcuts (Keyboard icon, dispatches Cmd+/ event to trigger existing help dialog, shows shortcut hint)
  - Toggle Theme (Sun/Moon icon, toggles light/dark via next-themes useTheme)
  - Sign Out (LogOut icon, destructive variant, calls onLogout)
  - Separators between sections
  - Accessible with focus-visible ring on trigger
- Integrated into workspace.tsx desktop layout:
  - Replaced Avatar + ThemeToggle + Sign out button with UserProfileDropdown
  - Added `projects` to useProjectStore destructuring for project count
  - onShowShortcuts dispatches synthetic KeyboardEvent (Cmd+/) to trigger existing KeyboardShortcutHelp dialog
  - NotificationCenter kept before the dropdown
  - Mobile layout unchanged (still uses Sheet menu)
- Ran lint: zero errors, zero warnings

Stage Summary:
- New component: `/src/components/user-profile-dropdown.tsx` - Professional user profile dropdown with user info, stats, menu items, theme toggle, and sign out
- Modified: `/src/components/workspace.tsx` - Desktop top bar now uses UserProfileDropdown instead of separate Avatar/ThemeToggle/SignOut
- Lint: Clean
- Dev Server: Compiles successfully
