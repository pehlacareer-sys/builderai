'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  MousePointer2,
  Clock,
  Edit3,
  Eye,
  Circle,
} from 'lucide-react'

interface CollaborationPresenceProps {
  projectName?: string
  className?: string
}

type CollaboratorStatus = 'active' | 'idle' | 'away'

interface Collaborator {
  id: string
  name: string
  avatarColor: string
  avatarBgClass: string
  avatarTextClass: string
  status: CollaboratorStatus
  statusLabel: string
  currentAction: string
  initials: string
}

const MOCK_COLLABORATORS: Collaborator[] = [
  {
    id: 'sarah',
    name: 'Sarah K.',
    avatarColor: 'emerald',
    avatarBgClass: 'bg-emerald-500 dark:bg-emerald-600',
    avatarTextClass: 'text-white',
    status: 'active',
    statusLabel: 'Active now',
    currentAction: 'Cursor at line 42',
    initials: 'SK',
  },
  {
    id: 'alex',
    name: 'Alex M.',
    avatarColor: 'amber',
    avatarBgClass: 'bg-amber-500 dark:bg-amber-600',
    avatarTextClass: 'text-white',
    status: 'idle',
    statusLabel: 'Idle 5m',
    currentAction: 'Last viewed Preview tab',
    initials: 'AM',
  },
  {
    id: 'jordan',
    name: 'Jordan P.',
    avatarColor: 'sky',
    avatarBgClass: 'bg-sky-500 dark:bg-sky-600',
    avatarTextClass: 'text-white',
    status: 'active',
    statusLabel: 'Active now',
    currentAction: 'Editing styles.css',
    initials: 'JP',
  },
]

const CURRENT_USER: Collaborator = {
  id: 'you',
  name: 'You',
  avatarColor: 'violet',
  avatarBgClass: 'bg-violet-500 dark:bg-violet-600',
  avatarTextClass: 'text-white',
  status: 'active',
  statusLabel: 'Active now',
  currentAction: 'Viewing workspace',
  initials: 'Y',
}

const STATUS_DOT_COLORS: Record<CollaboratorStatus, string> = {
  active: 'bg-emerald-500',
  idle: 'bg-amber-400',
  away: 'bg-muted-foreground/50',
}

const CURSOR_COLORS: Record<string, string> = {
  emerald: 'text-emerald-500',
  amber: 'text-amber-500',
  sky: 'text-sky-500',
  violet: 'text-violet-500',
}

export function CollaborationPresence({ projectName, className }: CollaborationPresenceProps) {
  const [open, setOpen] = useState(false)

  const otherCollaborators = MOCK_COLLABORATORS
  const allCollaborators = [CURRENT_USER, ...MOCK_COLLABORATORS]
  const activeCount = allCollaborators.filter(c => c.status === 'active').length
  const displayCount = otherCollaborators.length

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Live Cursors Indicator */}
      <div className="hidden md:flex items-center gap-1 text-[10px] text-muted-foreground px-1.5">
        <MousePointer2 className="w-3 h-3" />
        <span>Live Cursors</span>
        <div className="flex items-center gap-0.5 ml-0.5">
          {otherCollaborators.map((c) => (
            <motion.span
              key={c.id}
              className={cn('w-1.5 h-1.5 rounded-full', c.avatarBgClass)}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25, delay: 0.1 }}
            />
          ))}
        </div>
      </div>

      {/* Avatar Stack with Popover */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            className="relative flex items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded-full"
            aria-label={`${displayCount + 1} collaborators online. Click to see details.`}
          >
            {/* Overlapping Avatars */}
            <div className="flex items-center -space-x-2">
              <AnimatePresence>
                {otherCollaborators.map((collaborator, i) => (
                  <motion.div
                    key={collaborator.id}
                    initial={{ opacity: 0, x: -10, scale: 0.8 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: -10, scale: 0.8 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25, delay: i * 0.05 }}
                    className="relative"
                    style={{ zIndex: otherCollaborators.length - i }}
                  >
                    <Avatar className="h-7 w-7 border-2 border-background ring-1 ring-background/50">
                      <AvatarFallback
                        className={cn(
                          'text-[9px] font-semibold',
                          collaborator.avatarBgClass,
                          collaborator.avatarTextClass
                        )}
                      >
                        {collaborator.initials}
                      </AvatarFallback>
                    </Avatar>
                    {/* Pulse ring for active collaborators */}
                    {collaborator.status === 'active' && (
                      <motion.span
                        className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-background bg-emerald-500"
                        animate={{
                          boxShadow: [
                            '0 0 0 0 rgba(16, 185, 129, 0.4)',
                            '0 0 0 4px rgba(16, 185, 129, 0)',
                          ],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: 'easeOut',
                        }}
                      />
                    )}
                    {collaborator.status === 'idle' && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-background bg-amber-400" />
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Count Badge */}
            <motion.div
              className="absolute -top-1.5 -right-1.5"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25, delay: 0.2 }}
            >
              <Badge className="h-4 min-w-[16px] px-1 text-[9px] bg-emerald-600 text-white border-0 hover:bg-emerald-600">
                {displayCount}
              </Badge>
            </motion.div>
          </button>
        </PopoverTrigger>

        <PopoverContent
          className="w-72 p-0 rounded-lg shadow-lg"
          align="end"
          sideOffset={8}
        >
          {/* Header */}
          <div className="px-4 py-3 border-b bg-muted/30">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">Who&apos;s Online</h4>
              <div className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400">
                <Circle className="w-2 h-2 fill-emerald-500 text-emerald-500" />
                {activeCount} active
              </div>
            </div>
            {projectName && (
              <p className="text-[10px] text-muted-foreground mt-0.5">{projectName}</p>
            )}
          </div>

          {/* Collaborator List */}
          <div className="p-2 max-h-72 overflow-y-auto">
            <div className="space-y-0.5">
              {allCollaborators.map((collaborator, i) => (
                <motion.div
                  key={collaborator.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={cn(
                    'flex items-center gap-3 px-2 py-2 rounded-md transition-colors',
                    collaborator.id === 'you'
                      ? 'bg-muted/50'
                      : 'hover:bg-muted/30'
                  )}
                >
                  {/* Avatar with status */}
                  <div className="relative flex-shrink-0">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback
                        className={cn(
                          'text-[10px] font-semibold',
                          collaborator.avatarBgClass,
                          collaborator.avatarTextClass
                        )}
                      >
                        {collaborator.initials}
                      </AvatarFallback>
                    </Avatar>
                    <span
                      className={cn(
                        'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-popover',
                        STATUS_DOT_COLORS[collaborator.status]
                      )}
                    />
                  </div>

                  {/* Name and activity */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium truncate">
                        {collaborator.name}
                        {collaborator.id === 'you' && (
                          <span className="text-muted-foreground font-normal"> (you)</span>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      {collaborator.status === 'active' ? (
                        <>
                          <Edit3 className="w-2.5 h-2.5 flex-shrink-0" />
                          <span className="truncate">{collaborator.currentAction}</span>
                        </>
                      ) : collaborator.status === 'idle' ? (
                        <>
                          <Clock className="w-2.5 h-2.5 flex-shrink-0" />
                          <span className="truncate">{collaborator.currentAction}</span>
                        </>
                      ) : (
                        <>
                          <Eye className="w-2.5 h-2.5 flex-shrink-0" />
                          <span className="truncate">{collaborator.currentAction}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Status label */}
                  <div className="flex-shrink-0">
                    <span
                      className={cn(
                        'text-[10px] font-medium px-1.5 py-0.5 rounded-full',
                        collaborator.status === 'active'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
                          : collaborator.status === 'idle'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
                            : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {collaborator.statusLabel}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Footer with live cursors legend */}
          <div className="px-4 py-2.5 border-t bg-muted/30">
            <div className="flex items-center gap-2">
              <MousePointer2 className="w-3 h-3 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">Live cursors active</span>
              <div className="flex items-center gap-1 ml-auto">
                {otherCollaborators.map((c) => (
                  <span key={c.id} className={cn('w-2 h-2 rounded-full', c.avatarBgClass)} />
                ))}
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
