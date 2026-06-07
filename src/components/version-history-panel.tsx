'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
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
import { motion } from 'framer-motion'
import {
  History, Loader2, Plus, ChevronRight, FileCode, RotateCcw,
} from 'lucide-react'
import { toast } from 'sonner'

export interface VersionData {
  id: string
  version: number
  description: string | null
  snapshot: string
  status: string
  createdAt: string
}

export const VERSION_STATUS_BADGE: Record<string, string> = {
  created: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  restoring: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  restored: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400',
}

export function VersionHistoryPanel({
  versions,
  loading,
  creating,
  onCreateVersion,
  onRefresh,
  expandedVersions,
  onToggleExpand,
  onRestoreVersion,
  restoringVersionId,
}: {
  versions: VersionData[]
  loading: boolean
  creating: boolean
  onCreateVersion: () => void
  onRefresh: () => void
  expandedVersions: Set<string>
  onToggleExpand: (id: string) => void
  onRestoreVersion?: (versionId: string) => Promise<void>
  restoringVersionId?: string | null
}) {
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [selectedVersion, setSelectedVersion] = useState<VersionData | null>(null)

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
      ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }

  const parseSnapshot = (snapshot: string): Array<{ path: string; language: string | null }> => {
    try {
      return JSON.parse(snapshot)
    } catch {
      return []
    }
  }

  const handleRestoreClick = (e: React.MouseEvent, version: VersionData) => {
    e.stopPropagation()
    setSelectedVersion(version)
    setConfirmDialogOpen(true)
  }

  const handleConfirmRestore = async () => {
    if (!selectedVersion || !onRestoreVersion) return
    setConfirmDialogOpen(false)
    try {
      await onRestoreVersion(selectedVersion.id)
      toast.success('Version restored', {
        description: `Restored to v${selectedVersion.version}. A backup was created automatically.`,
      })
    } catch (error: any) {
      toast.error('Restore failed', {
        description: error.message || 'Could not restore version',
      })
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="border-b px-3 sm:px-4 py-2 flex items-center justify-between bg-muted/30">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">Version History</span>
          <Badge variant="secondary" className="text-[10px] px-1.5">
            {versions.length}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-[10px] px-2 min-h-[44px] md:min-h-0"
            onClick={onRefresh}
            disabled={loading}
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Refresh'}
          </Button>
          <Button
            variant="default"
            size="sm"
            className="h-6 text-[10px] px-2 bg-emerald-600 hover:bg-emerald-700 min-h-[44px] md:min-h-0"
            onClick={onCreateVersion}
            disabled={creating}
          >
            {creating ? (
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            ) : (
              <Plus className="w-3 h-3 mr-1" />
            )}
            Save Version
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 sm:p-4">
          {loading && versions.length === 0 ? (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3 animate-spin" />
              <p className="text-sm text-muted-foreground">Loading version history...</p>
            </div>
          ) : versions.length === 0 ? (
            <div className="text-center py-8">
              <History className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No versions saved yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Click &quot;Save Version&quot; to create a snapshot of your project
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {versions.map((version, i) => {
                const isExpanded = expandedVersions.has(version.id)
                const snapshotFiles = isExpanded ? parseSnapshot(version.snapshot) : []
                const isRestoring = restoringVersionId === version.id
                return (
                  <Collapsible
                    key={version.id}
                    open={isExpanded}
                    onOpenChange={() => onToggleExpand(version.id)}
                  >
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="rounded-lg border"
                    >
                      <CollapsibleTrigger asChild>
                        <button className="w-full text-left p-3 hover:bg-muted/30 transition-colors rounded-lg min-h-[44px]">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <ChevronRight className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                              <span className="text-sm font-medium">v{version.version}</span>
                              <Badge
                                variant="secondary"
                                className={`text-[10px] px-1.5 ${VERSION_STATUS_BADGE[version.status] || 'bg-muted text-muted-foreground'}`}
                              >
                                {version.status}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-muted-foreground">
                                {formatDate(version.createdAt)}
                              </span>
                              {onRestoreVersion && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 text-muted-foreground hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 min-h-[44px] md:min-h-0"
                                  onClick={(e) => handleRestoreClick(e, version)}
                                  disabled={isRestoring}
                                  title={`Restore to v${version.version}`}
                                >
                                  {isRestoring ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <RotateCcw className="w-3 h-3" />
                                  )}
                                </Button>
                              )}
                            </div>
                          </div>
                          {version.description && (
                            <p className="text-xs text-muted-foreground mt-1 ml-6">{version.description}</p>
                          )}
                        </button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="px-3 pb-3 pt-0 ml-6 border-t">
                          <div className="pt-2 space-y-1 max-h-48 overflow-y-auto">
                            {snapshotFiles.length > 0 ? snapshotFiles.map((f, j) => (
                              <div key={j} className="flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground py-0.5">
                                <FileCode className="w-3 h-3 flex-shrink-0" />
                                <span className="truncate">{f.path}</span>
                                {f.language && (
                                  <Badge variant="secondary" className="text-[8px] px-1 py-0 ml-auto flex-shrink-0">
                                    {f.language}
                                  </Badge>
                                )}
                              </div>
                            )) : (
                              <p className="text-xs text-muted-foreground">No files in snapshot</p>
                            )}
                          </div>
                        </div>
                      </CollapsibleContent>
                    </motion.div>
                  </Collapsible>
                )
              })}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Restore Confirmation Dialog */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Version v{selectedVersion?.version}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will replace all current project files with the files from version v{selectedVersion?.version}.
              A backup of your current state will be created automatically before restoring.
              This action cannot be undone (though you can restore from the backup).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRestore}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-2" />
              Restore Version
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
