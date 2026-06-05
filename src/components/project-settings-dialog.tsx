'use client'

import { useState, useEffect } from 'react'
import { useProjectStore, type Project } from '@/stores/project-store'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Settings2,
  FileText,
  ArrowRight,
  Trash2,
  Loader2,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react'
import { toast } from 'sonner'

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft', description: 'Project is in draft mode' },
  { value: 'building', label: 'Building', description: 'Project is being built by AI' },
  { value: 'ready', label: 'Ready', description: 'Project is ready for review' },
  { value: 'deployed', label: 'Deployed', description: 'Project is deployed and live' },
] as const

const STATUS_FLOW: Record<string, string> = {
  draft: 'building',
  building: 'ready',
  ready: 'deployed',
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  building: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  ready: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  deployed: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400',
}

interface ProjectSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  project: Project
}

export function ProjectSettingsDialog({ open, onOpenChange, project }: ProjectSettingsDialogProps) {
  const { updateProject, deleteProject, clearCurrentProject } = useProjectStore()

  // General tab state
  const [name, setName] = useState(project.name)
  const [description, setDescription] = useState(project.description || '')

  // Status tab state
  const [selectedStatus, setSelectedStatus] = useState(project.status)

  // Danger zone state
  const [deleteConfirmName, setDeleteConfirmName] = useState('')
  const [showDeleteAlert, setShowDeleteAlert] = useState(false)

  // Loading states
  const [savingGeneral, setSavingGeneral] = useState(false)
  const [savingStatus, setSavingStatus] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Reset form when dialog opens or project changes
  useEffect(() => {
    if (open) {
      setName(project.name)
      setDescription(project.description || '')
      setSelectedStatus(project.status)
      setDeleteConfirmName('')
    }
  }, [open, project])

  const handleSaveGeneral = async () => {
    if (!name.trim()) {
      toast.error('Project name is required')
      return
    }
    setSavingGeneral(true)
    try {
      await updateProject(project.id, {
        name: name.trim(),
        description: description.trim(),
      })
      toast.success('Project settings saved')
    } catch {
      toast.error('Failed to save project settings')
    } finally {
      setSavingGeneral(false)
    }
  }

  const handleSaveStatus = async () => {
    if (selectedStatus === project.status) {
      toast.info('Status is already set to ' + selectedStatus)
      return
    }
    setSavingStatus(true)
    try {
      await updateProject(project.id, { status: selectedStatus })
      toast.success(`Status updated to ${selectedStatus}`)
    } catch {
      toast.error('Failed to update project status')
    } finally {
      setSavingStatus(false)
    }
  }

  const handleAdvanceStatus = async () => {
    const nextStatus = STATUS_FLOW[project.status]
    if (!nextStatus) {
      toast.info('Project is already deployed')
      return
    }
    setSavingStatus(true)
    try {
      await updateProject(project.id, { status: nextStatus })
      setSelectedStatus(nextStatus)
      toast.success(`Status advanced to ${nextStatus}`)
    } catch {
      toast.error('Failed to advance project status')
    } finally {
      setSavingStatus(false)
    }
  }

  const handleDelete = async () => {
    if (deleteConfirmName !== project.name) {
      toast.error('Project name does not match')
      return
    }
    setDeleting(true)
    try {
      await deleteProject(project.id)
      toast.success('Project deleted successfully')
      setShowDeleteAlert(false)
      onOpenChange(false)
      clearCurrentProject()
    } catch {
      toast.error('Failed to delete project')
    } finally {
      setDeleting(false)
    }
  }

  const nextStatus = STATUS_FLOW[project.status]

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[520px] p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-0">
            <DialogTitle className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <Settings2 className="w-4 h-4 text-white" />
              </div>
              Project Settings
            </DialogTitle>
            <DialogDescription>
              Manage your project configuration and settings.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="general" className="mt-4">
            <div className="px-6">
              <TabsList className="w-full h-9">
                <TabsTrigger value="general" className="text-xs flex-1">
                  <FileText className="w-3 h-3 mr-1" />
                  General
                </TabsTrigger>
                <TabsTrigger value="status" className="text-xs flex-1">
                  <ArrowRight className="w-3 h-3 mr-1" />
                  Status
                </TabsTrigger>
                <TabsTrigger value="danger" className="text-xs flex-1">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Danger Zone
                </TabsTrigger>
              </TabsList>
            </div>

            {/* General Tab */}
            <TabsContent value="general" className="px-6 pb-6 pt-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="project-name" className="text-sm font-medium">
                    Project Name
                  </label>
                  <Input
                    id="project-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter project name"
                    className="h-9"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    This is your project&apos;s display name.
                  </p>
                </div>

                <div className="space-y-2">
                  <label htmlFor="project-description" className="text-sm font-medium">
                    Description
                  </label>
                  <Textarea
                    id="project-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe your project..."
                    className="min-h-[80px] resize-none"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    A brief description of what your project does.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Framework</label>
                  <Input
                    value={project.framework}
                    disabled
                    className="h-9 bg-muted/50"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Framework cannot be changed after creation.
                  </p>
                </div>

                <Separator />

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onOpenChange(false)}
                    className="h-8"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveGeneral}
                    disabled={savingGeneral || !name.trim()}
                    className="h-8 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white"
                  >
                    {savingGeneral ? (
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                    )}
                    Save Changes
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* Status Tab */}
            <TabsContent value="status" className="px-6 pb-6 pt-4">
              <div className="space-y-4">
                <div className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Current Status</span>
                    <Badge
                      variant="secondary"
                      className={`text-xs px-2.5 py-0.5 ${STATUS_COLORS[project.status]}`}
                    >
                      {project.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {STATUS_OPTIONS.find((s) => s.value === project.status)?.description}
                  </p>
                </div>

                {/* Status flow visualization */}
                <div className="rounded-lg border p-4 space-y-3">
                  <span className="text-sm font-medium">Status Pipeline</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {STATUS_OPTIONS.map((status, i) => (
                      <div key={status.value} className="flex items-center gap-1.5">
                        <div
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                            project.status === status.value
                              ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-sm'
                              : STATUS_OPTIONS.findIndex((s) => s.value === project.status) > i
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 line-through opacity-60'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {project.status === status.value && (
                            <CheckCircle2 className="w-3 h-3" />
                          )}
                          {status.label}
                        </div>
                        {i < STATUS_OPTIONS.length - 1 && (
                          <ArrowRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Change status */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Change Status</label>
                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger className="w-full h-9">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          <span className="flex items-center gap-2">
                            {status.label}
                            <span className="text-muted-foreground">— {status.description}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Quick advance */}
                {nextStatus && (
                  <div className="rounded-lg border border-dashed border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Quick Advance</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Move from <span className="font-medium">{project.status}</span> to{' '}
                          <span className="font-medium text-emerald-600 dark:text-emerald-400">
                            {nextStatus}
                          </span>
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={handleAdvanceStatus}
                        disabled={savingStatus}
                        className="h-8 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white"
                      >
                        {savingStatus ? (
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        ) : (
                          <ArrowRight className="w-3 h-3 mr-1" />
                        )}
                        Advance
                      </Button>
                    </div>
                  </div>
                )}

                <Separator />

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onOpenChange(false)}
                    className="h-8"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveStatus}
                    disabled={savingStatus || selectedStatus === project.status}
                    className="h-8 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white"
                  >
                    {savingStatus ? (
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                    )}
                    Update Status
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* Danger Zone Tab */}
            <TabsContent value="danger" className="px-6 pb-6 pt-4">
              <div className="space-y-4">
                <div className="rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    <span className="text-sm font-medium text-red-700 dark:text-red-400">
                      Delete Project
                    </span>
                  </div>
                  <p className="text-xs text-red-600/80 dark:text-red-400/80">
                    This action is irreversible. All project files, conversations, versions, and
                    memory will be permanently deleted. Please be certain before proceeding.
                  </p>
                </div>

                <div className="space-y-2">
                  <label htmlFor="delete-confirm" className="text-sm font-medium">
                    Type <code className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">{project.name}</code> to confirm
                  </label>
                  <Input
                    id="delete-confirm"
                    value={deleteConfirmName}
                    onChange={(e) => setDeleteConfirmName(e.target.value)}
                    placeholder={`Enter "${project.name}" to confirm`}
                    className="h-9 border-red-200 focus-visible:border-red-400 focus-visible:ring-red-200 dark:border-red-900/50 dark:focus-visible:ring-red-900/30"
                  />
                </div>

                <div className="flex justify-end">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      if (deleteConfirmName !== project.name) {
                        toast.error('Please type the project name exactly to confirm')
                        return
                      }
                      setShowDeleteAlert(true)
                    }}
                    disabled={deleteConfirmName !== project.name || deleting}
                    className="h-8"
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    Delete Project
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation AlertDialog */}
      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Delete &quot;{project.name}&quot;?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the project and all its associated data including files,
              conversations, version history, and AI memory. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting ? (
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              ) : (
                <Trash2 className="w-3 h-3 mr-1" />
              )}
              Delete permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
