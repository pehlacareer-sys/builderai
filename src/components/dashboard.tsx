'use client'

import { useState, useRef } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { useProjectStore } from '@/stores/project-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ThemeToggle } from '@/components/theme-toggle'
import { KeyboardShortcutHelp } from '@/components/keyboard-shortcut-help'
import { api } from '@/lib/api'
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, FolderKanban, Clock, ArrowRight, Loader2,
  Globe, Zap, LogOut, Trash2, Sparkles, Layers, Rocket, Bot,
  FileCode, Search, LayoutGrid, List, Download
} from 'lucide-react'

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  building: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  ready: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  deployed: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400',
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  building: 'Building',
  ready: 'Ready',
  deployed: 'Deployed',
}

const STATUS_ICONS: Record<string, React.ElementType> = {
  draft: FileCode,
  building: Loader2,
  ready: Sparkles,
  deployed: Globe,
}

export function Dashboard() {
  const { user, logout } = useAuthStore()
  const { projects, loadProjects, createProject, selectProject, deleteProject } = useProjectStore()
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [creating, setCreating] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Keyboard shortcuts for dashboard
  useKeyboardShortcuts({
    shortcuts: [
      {
        key: 'k',
        ctrlKey: true,
        metaKey: true,
        description: 'Focus search',
        category: 'navigation',
        action: () => {
          searchInputRef.current?.focus()
        },
      },
    ],
  })

  const handleCreate = async () => {
    if (!newName.trim()) return
    setCreating(true)
    try {
      const project = await createProject(newName.trim(), newDesc.trim() || undefined)
      setShowCreate(false)
      setNewName('')
      setNewDesc('')
      await selectProject(project.id)
    } catch {
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    await deleteProject(id)
  }

  const filteredProjects = projects.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  const totalFiles = projects.reduce((sum, p) => sum + (p.files?.length || 0), 0)

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm">
              <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
            </div>
            <span className="font-bold text-base sm:text-lg">BuilderAI</span>
            <Badge variant="secondary" className="text-[9px] sm:text-[10px] hidden sm:inline-flex bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800">
              AI-Powered
            </Badge>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <ThemeToggle />
            <Separator className="h-5 mx-0.5 sm:mx-1" />
            <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
              <AvatarFallback className="bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/40 dark:to-teal-900/40 text-emerald-700 dark:text-emerald-300 text-[10px] sm:text-xs font-semibold">
                {user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs sm:text-sm font-medium hidden sm:block max-w-[120px] truncate">{user?.name || user?.email}</span>
            <Button variant="ghost" size="icon" onClick={logout} title="Sign out" className="h-8 w-8 sm:h-9 sm:w-9 min-h-[44px] sm:min-h-0">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8 w-full">
        {/* Hero Section with Gradient Background */}
        <div className="mb-6 sm:mb-8 relative">
          <div className="absolute -top-8 -left-8 w-64 h-64 bg-emerald-500/5 dark:bg-emerald-500/3 rounded-full blur-3xl pointer-events-none" />
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 relative"
          >
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                Welcome back, {user?.name?.split(' ')[0] || 'Developer'} 👋
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground mt-1">
                Build websites with AI agents. Chat, generate, and deploy.
              </p>
            </div>
            <Button
              onClick={() => setShowCreate(true)}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/25 transition-all hover:shadow-emerald-500/40 min-h-[44px]"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Project
            </Button>
          </motion.div>
        </div>

        {/* Stats with better styling */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-6 sm:mb-8">
          {[
            { label: 'Total Projects', value: projects.length, icon: FolderKanban, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-200/50 dark:border-emerald-800/50' },
            { label: 'Deployed', value: projects.filter(p => p.status === 'deployed').length, icon: Globe, color: 'text-teal-600 bg-teal-50 dark:bg-teal-950/30', border: 'border-teal-200/50 dark:border-teal-800/50' },
            { label: 'In Progress', value: projects.filter(p => p.status === 'building').length, icon: Clock, color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-200/50 dark:border-amber-800/50' },
            { label: 'Total Files', value: totalFiles, icon: FileCode, color: 'text-violet-600 bg-violet-50 dark:bg-violet-950/30', border: 'border-violet-200/50 dark:border-violet-800/50' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              <Card className={`hover:shadow-md transition-all border ${stat.border}`}>
                <CardContent className="p-2.5 sm:p-4 flex items-center gap-2 sm:gap-3">
                  <div className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl ${stat.color} flex-shrink-0`}>
                    <stat.icon className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-lg sm:text-2xl font-bold">{stat.value}</p>
                    <p className="text-[9px] sm:text-xs text-muted-foreground truncate">{stat.label}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* How It Works - show when no projects */}
        {projects.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-6 sm:mb-8"
          >
            <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">How It Works</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {[
                { icon: Bot, step: '1', title: 'Describe', desc: 'Tell AI what you want to build', color: 'text-violet-600 bg-violet-50 dark:bg-violet-950/30', border: 'border-violet-200/50 dark:border-violet-800/50' },
                { icon: Layers, step: '2', title: 'Plan', desc: 'AI creates an architecture plan', color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-200/50 dark:border-emerald-800/50' },
                { icon: Sparkles, step: '3', title: 'Generate', desc: 'Code is generated and reviewed', color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-200/50 dark:border-amber-800/50' },
                { icon: Rocket, step: '4', title: 'Deploy', desc: 'One-click deploy to production', color: 'text-sky-600 bg-sky-50 dark:bg-sky-950/30', border: 'border-sky-200/50 dark:border-sky-800/50' },
              ].map((item) => (
                <Card key={item.step} className={`text-center hover:shadow-md transition-all border ${item.border}`}>
                  <CardContent className="p-3 sm:p-4">
                    <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl ${item.color} flex items-center justify-center mx-auto mb-2 sm:mb-3`}>
                      <item.icon className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <div className="text-[9px] sm:text-[10px] text-muted-foreground font-medium mb-1">STEP {item.step}</div>
                    <h3 className="font-semibold text-sm">{item.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>
        )}

        {/* Projects Header with Search and View Toggle */}
        {projects.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 sm:mb-4 gap-2 sm:gap-4">
            <h2 className="text-base sm:text-lg font-semibold flex-shrink-0">Your Projects</h2>
            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:max-w-xs">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  ref={searchInputRef}
                  placeholder="Search projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 sm:h-8 pl-8 text-xs sm:text-sm min-h-[44px] sm:min-h-0"
                />
              </div>
              <div className="flex border rounded-md overflow-hidden flex-shrink-0">
                <Button
                  variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-9 w-9 sm:h-7 sm:w-7 rounded-none min-h-[44px] sm:min-h-0"
                  onClick={() => setViewMode('grid')}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-9 w-9 sm:h-7 sm:w-7 rounded-none min-h-[44px] sm:min-h-0"
                  onClick={() => setViewMode('list')}
                >
                  <List className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Projects Grid/List */}
        {projects.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-10 sm:py-12"
          >
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 flex items-center justify-center mx-auto mb-3 sm:mb-4">
              <Sparkles className="w-8 h-8 sm:w-10 sm:h-10 text-emerald-500" />
            </div>
            <h3 className="text-base sm:text-lg font-semibold">No projects yet</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Create your first project to start building with AI
            </p>
            <Button
              onClick={() => setShowCreate(true)}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white min-h-[44px]"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Project
            </Button>
          </motion.div>
        ) : (
          <>
            {filteredProjects.length === 0 && searchQuery && (
              <div className="text-center py-8">
                <Search className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No projects match &quot;{searchQuery}&quot;</p>
              </div>
            )}
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                <AnimatePresence>
                  {filteredProjects.map((project, i) => (
                    <ProjectCard key={project.id} project={project} index={i} onSelect={selectProject} onDelete={handleDelete} />
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <div className="space-y-2">
                <AnimatePresence>
                  {filteredProjects.map((project, i) => (
                    <ProjectListItem key={project.id} project={project} index={i} onSelect={selectProject} onDelete={handleDelete} />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t mt-auto">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-4 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Zap className="w-3 h-3 text-emerald-500" />
            <span>BuilderAI &copy; {new Date().getFullYear()}</span>
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            <span>Powered by AI</span>
            <span className="hidden sm:inline">Built with Next.js</span>
          </div>
        </div>
      </footer>

      {/* Create Project Dialog - Full-screen on mobile */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md max-w-[calc(100%-1.5rem)] max-h-[90vh] sm:max-h-none p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />
              Create New Project
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Start a new AI-powered web project
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 sm:space-y-4 mt-1 sm:mt-2">
            <div className="space-y-1.5 sm:space-y-2">
              <label className="text-xs sm:text-sm font-medium">Project Name</label>
              <Input
                placeholder="My Awesome App"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                autoFocus
                className="h-11 sm:h-10 text-sm min-h-[44px]"
              />
            </div>
            <div className="space-y-1.5 sm:space-y-2">
              <label className="text-xs sm:text-sm font-medium">Description (optional)</label>
              <Textarea
                placeholder="A brief description of your project..."
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                rows={3}
                className="text-sm"
              />
            </div>
            <Button onClick={handleCreate} className="w-full h-11 sm:h-10 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white min-h-[44px] sm:min-h-0" disabled={creating || !newName.trim()}>
              {creating ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              Create Project
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Keyboard Shortcut Help Dialog */}
      <KeyboardShortcutHelp />
    </div>
  )
}

import { Separator } from '@/components/ui/separator'

function ProjectCard({ project, index, onSelect, onDelete }: {
  project: any
  index: number
  onSelect: (id: string) => void
  onDelete: (e: React.MouseEvent, id: string) => Promise<void>
}) {
  const StatusIcon = STATUS_ICONS[project.status] || FileCode
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card
        className="cursor-pointer hover:shadow-lg hover:border-emerald-200 dark:hover:border-emerald-800 transition-all group relative overflow-hidden"
        onClick={() => onSelect(project.id)}
      >
        {/* Gradient accent on top */}
        <div className="h-1 bg-gradient-to-r from-emerald-400 to-teal-500 opacity-0 group-hover:opacity-100 transition-opacity" />
        <CardHeader className="pb-1.5 sm:pb-2 p-3 sm:p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 flex items-center justify-center flex-shrink-0">
                <StatusIcon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 dark:text-emerald-400 ${project.status === 'building' ? 'animate-spin' : ''}`} />
              </div>
              <CardTitle className="text-sm sm:text-base group-hover:text-emerald-600 transition-colors">
                {project.name}
              </CardTitle>
            </div>
            <Badge variant="secondary" className={`text-[9px] sm:text-[10px] px-1 sm:px-1.5 ${STATUS_COLORS[project.status] || STATUS_COLORS.draft}`}>
              {STATUS_LABELS[project.status] || project.status}
            </Badge>
          </div>
          <CardDescription className="line-clamp-2 ml-7 sm:ml-10 text-xs sm:text-sm">
            {project.description || 'No description'}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0 p-3 sm:p-6">
          <div className="flex items-center justify-between ml-7 sm:ml-10">
            <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(project.updatedAt).toLocaleDateString()}
              </div>
              {project.files?.length > 0 && (
                <div className="flex items-center gap-1">
                  <FileCode className="w-3 h-3" />
                  {project.files.length} files
                </div>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 sm:h-7 sm:w-7 min-h-[44px] sm:min-h-0 opacity-0 group-hover:opacity-100 transition-opacity text-emerald-600 hover:text-emerald-700"
                onClick={(e) => { e.stopPropagation(); api.exportProject(project.id).then(() => toast.success('Exported as ZIP')).catch(() => toast.error('Export failed')) }}
                title="Export as ZIP"
              >
                <Download className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 sm:h-7 sm:w-7 min-h-[44px] sm:min-h-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => onDelete(e, project.id)}
              >
                <Trash2 className="w-3.5 h-3.5 text-destructive" />
              </Button>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-emerald-500 transition-colors" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function ProjectListItem({ project, index, onSelect, onDelete }: {
  project: any
  index: number
  onSelect: (id: string) => void
  onDelete: (e: React.MouseEvent, id: string) => Promise<void>
}) {
  const StatusIcon = STATUS_ICONS[project.status] || FileCode
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      transition={{ delay: index * 0.03 }}
    >
      <Card
        className="cursor-pointer hover:shadow-md hover:border-emerald-200 dark:hover:border-emerald-800 transition-all group"
        onClick={() => onSelect(project.id)}
      >
        <CardContent className="p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 flex items-center justify-center flex-shrink-0">
            <StatusIcon className={`w-4 h-4 text-emerald-600 dark:text-emerald-400 ${project.status === 'building' ? 'animate-spin' : ''}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm truncate group-hover:text-emerald-600 transition-colors">
                {project.name}
              </span>
              <Badge variant="secondary" className={`text-[9px] px-1 ${STATUS_COLORS[project.status] || STATUS_COLORS.draft}`}>
                {STATUS_LABELS[project.status] || project.status}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground truncate">{project.description || 'No description'}</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-shrink-0">
            <Clock className="w-3 h-3" />
            <span className="hidden sm:inline">{new Date(project.updatedAt).toLocaleDateString()}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 min-h-[44px] sm:min-h-0 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => onDelete(e, project.id)}
            >
              <Trash2 className="w-3 h-3 text-destructive" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
