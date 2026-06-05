'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutGrid,
  Wrench,
  Search,
  ShieldCheck,
  Rocket,
  CheckCircle2,
  XCircle,
  Loader2,
  RotateCcw,
  Clock,
  ChevronRight,
  Cpu,
} from 'lucide-react'
import { toast } from 'sonner'

// ─── Types ────────────────────────────────────────────────────────────────
export interface AgentStatusPanelProps {
  agentPipeline: Array<{ role: string; status: string; content: string; timestamp?: string }>
  isProcessing: boolean
}

type AgentStatusType = 'idle' | 'thinking' | 'complete' | 'error'

interface AgentDefinition {
  role: string
  name: string
  icon: React.ElementType
  description: string
  tooltipDetail: string
}

// ─── Agent Definitions ────────────────────────────────────────────────────
const AGENT_DEFINITIONS: AgentDefinition[] = [
  {
    role: 'planner',
    name: 'Planner',
    icon: LayoutGrid,
    description: 'Analyzes requirements and creates a project plan',
    tooltipDetail:
      'The Planner agent breaks down your request into actionable tasks, identifies dependencies, and creates an execution roadmap for the pipeline.',
  },
  {
    role: 'engineer',
    name: 'Engineer',
    icon: Wrench,
    description: 'Generates and modifies code based on the plan',
    tooltipDetail:
      'The Engineer agent writes production-quality code following the plan, creates files, implements features, and follows best practices for the target stack.',
  },
  {
    role: 'reviewer',
    name: 'Reviewer',
    icon: Search,
    description: 'Reviews code quality and suggests improvements',
    tooltipDetail:
      'The Reviewer agent performs a thorough code review checking for bugs, security issues, performance problems, style violations, and architectural concerns.',
  },
  {
    role: 'qa',
    name: 'QA',
    icon: ShieldCheck,
    description: 'Tests and validates the generated code',
    tooltipDetail:
      'The QA agent runs automated tests, validates functionality against requirements, checks edge cases, and ensures the code meets quality standards.',
  },
  {
    role: 'deployer',
    name: 'Deployer',
    icon: Rocket,
    description: 'Prepares and deploys the final application',
    tooltipDetail:
      'The Deployer agent handles build optimization, environment configuration, and prepares the application for deployment to the target platform.',
  },
]

// ─── Mock pipeline history ────────────────────────────────────────────────
const PIPELINE_HISTORY = [
  {
    id: 'run-5',
    timestamp: '2025-03-04 14:32',
    summary: 'Built landing page with responsive design',
    agents: ['planner', 'engineer', 'reviewer', 'qa', 'deployer'] as const,
    duration: '1m 42s',
    status: 'complete' as const,
  },
  {
    id: 'run-4',
    timestamp: '2025-03-04 13:15',
    summary: 'Added authentication module with JWT',
    agents: ['planner', 'engineer', 'reviewer', 'qa'] as const,
    duration: '2m 18s',
    status: 'complete' as const,
  },
  {
    id: 'run-3',
    timestamp: '2025-03-04 11:50',
    summary: 'Created REST API endpoints for users',
    agents: ['planner', 'engineer', 'reviewer'] as const,
    duration: '1m 55s',
    status: 'error' as const,
  },
  {
    id: 'run-2',
    timestamp: '2025-03-04 10:20',
    summary: 'Set up database schema with Prisma',
    agents: ['planner', 'engineer', 'reviewer', 'qa', 'deployer'] as const,
    duration: '2m 05s',
    status: 'complete' as const,
  },
  {
    id: 'run-1',
    timestamp: '2025-03-04 09:00',
    summary: 'Initialized Next.js project structure',
    agents: ['planner', 'engineer', 'deployer'] as const,
    duration: '58s',
    status: 'complete' as const,
  },
]

// ─── Status config ────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<
  AgentStatusType,
  {
    color: string
    bgColor: string
    borderColor: string
    badgeClass: string
    icon: React.ElementType | null
    label: string
  }
> = {
  idle: {
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/40',
    borderColor: 'border-muted',
    badgeClass:
      'bg-muted/60 text-muted-foreground dark:bg-muted/30',
    icon: null,
    label: 'Idle',
  },
  thinking: {
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-950/20',
    borderColor: 'border-amber-300 dark:border-amber-700',
    badgeClass:
      'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    icon: Loader2,
    label: 'Thinking',
  },
  complete: {
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/20',
    borderColor: 'border-emerald-300 dark:border-emerald-700',
    badgeClass:
      'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
    icon: CheckCircle2,
    label: 'Complete',
  },
  error: {
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-950/20',
    borderColor: 'border-red-300 dark:border-red-700',
    badgeClass:
      'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    icon: XCircle,
    label: 'Error',
  },
}

// ─── Helper ───────────────────────────────────────────────────────────────
function getAgentStatus(
  role: string,
  pipeline: AgentStatusPanelProps['agentPipeline']
): AgentStatusType {
  const entry = pipeline.find((p) => p.role === role)
  if (!entry) return 'idle'
  if (entry.status === 'thinking') return 'thinking'
  if (entry.status === 'complete') return 'complete'
  if (entry.status === 'error') return 'error'
  return 'idle'
}

function getAgentContent(
  role: string,
  pipeline: AgentStatusPanelProps['agentPipeline']
): string {
  const entry = pipeline.find((p) => p.role === role)
  return entry?.content || ''
}

// ─── Animation variants ───────────────────────────────────────────────────
const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const agentVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 24,
    },
  },
}

const historyVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.3 },
  },
}

// ─── Component ────────────────────────────────────────────────────────────
export function AgentStatusPanel({
  agentPipeline,
  isProcessing,
}: AgentStatusPanelProps) {
  // Count agents by status
  const statusCounts = useMemo(() => {
    const counts = { idle: 0, thinking: 0, complete: 0, error: 0 }
    AGENT_DEFINITIONS.forEach((def) => {
      const s = getAgentStatus(def.role, agentPipeline)
      counts[s]++
    })
    return counts
  }, [agentPipeline])

  const handleRestartPipeline = () => {
    toast.info('Pipeline restart coming soon', {
      description: 'This feature is under development.',
    })
  }

  return (
    <div className="h-full flex flex-col bg-background">
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* ─── Header ──────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600">
                <Cpu className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="text-sm font-semibold">AI Agent Pipeline</h2>
                <p className="text-[11px] text-muted-foreground">
                  {isProcessing ? 'Pipeline active...' : 'Multi-agent orchestration'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isProcessing && (
                <Badge
                  variant="secondary"
                  className="text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 animate-pulse"
                >
                  <Loader2 className="w-2.5 h-2.5 mr-1 animate-spin" />
                  Processing
                </Badge>
              )}
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1.5 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:text-emerald-700 dark:hover:text-emerald-400"
                onClick={handleRestartPipeline}
              >
                <RotateCcw className="w-3 h-3" />
                Restart Pipeline
              </Button>
            </div>
          </motion.div>

          {/* ─── Status Summary Badges ──────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="flex items-center gap-2 flex-wrap"
          >
            {statusCounts.complete > 0 && (
              <Badge
                variant="secondary"
                className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
              >
                {statusCounts.complete} Complete
              </Badge>
            )}
            {statusCounts.thinking > 0 && (
              <Badge
                variant="secondary"
                className="text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
              >
                {statusCounts.thinking} Thinking
              </Badge>
            )}
            {statusCounts.error > 0 && (
              <Badge
                variant="secondary"
                className="text-[10px] bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
              >
                {statusCounts.error} Error
              </Badge>
            )}
            {statusCounts.idle > 0 && (
              <Badge
                variant="secondary"
                className="text-[10px] bg-muted/60 text-muted-foreground"
              >
                {statusCounts.idle} Idle
              </Badge>
            )}
          </motion.div>

          {/* ─── Agent Pipeline Flow ─────────────────────────────────── */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-0"
          >
            {AGENT_DEFINITIONS.map((agentDef, index) => {
              const status = getAgentStatus(agentDef.role, agentPipeline)
              const content = getAgentContent(agentDef.role, agentPipeline)
              const config = STATUS_CONFIG[status]
              const Icon = agentDef.icon
              const StatusIcon = config.icon
              const isLast = index === AGENT_DEFINITIONS.length - 1

              return (
                <motion.div
                  key={agentDef.role}
                  variants={agentVariants}
                  className="relative"
                >
                  {/* Connecting line to next agent */}
                  {!isLast && (
                    <div className="absolute left-[23px] top-[56px] bottom-0 w-px z-0">
                      <motion.div
                        className="w-full h-full"
                        initial={{ scaleY: 0 }}
                        animate={{ scaleY: 1 }}
                        transition={{ delay: 0.1 * index + 0.2, duration: 0.4 }}
                        style={{ transformOrigin: 'top' }}
                      >
                        <div
                          className={`w-full h-full ${
                            status === 'complete'
                              ? 'bg-emerald-300 dark:bg-emerald-700'
                              : status === 'thinking'
                                ? 'bg-amber-300 dark:bg-amber-700'
                                : status === 'error'
                                  ? 'bg-red-300 dark:bg-red-700'
                                  : 'bg-muted-foreground/20'
                          }`}
                        />
                      </motion.div>
                      {/* Arrow head */}
                      <div
                        className={`absolute -bottom-[3px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[4px] border-r-[4px] border-t-[5px] border-l-transparent border-r-transparent ${
                          status === 'complete'
                            ? 'border-t-emerald-300 dark:border-t-emerald-700'
                            : status === 'thinking'
                              ? 'border-t-amber-300 dark:border-t-amber-700'
                              : status === 'error'
                                ? 'border-t-red-300 dark:border-t-red-700'
                                : 'border-t-muted-foreground/20'
                        }`}
                      />
                    </div>
                  )}

                  {/* Agent Card */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <motion.div
                        layout
                        className={`relative rounded-xl border p-3 transition-all duration-300 cursor-default ${config.bgColor} ${config.borderColor} ${
                          status === 'thinking'
                            ? 'shadow-[0_0_15px_rgba(245,158,11,0.15)] dark:shadow-[0_0_15px_rgba(245,158,11,0.1)]'
                            : status === 'complete'
                              ? 'shadow-[0_0_10px_rgba(16,185,129,0.1)] dark:shadow-[0_0_10px_rgba(16,185,129,0.05)]'
                              : ''
                        } ${isLast ? 'mb-0' : 'mb-6'}`}
                        whileHover={{ scale: 1.01 }}
                      >
                        <div className="flex items-start gap-3">
                          {/* Icon with pulse */}
                          <div className="relative flex-shrink-0">
                            <AnimatePresence mode="wait">
                              <motion.div
                                key={`${agentDef.role}-${status}`}
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.8, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className={`w-10 h-10 rounded-lg flex items-center justify-center ${config.bgColor} border ${config.borderColor}`}
                              >
                                <Icon className={`w-5 h-5 ${config.color}`} />
                              </motion.div>
                            </AnimatePresence>
                            {/* Thinking pulse ring */}
                            {status === 'thinking' && (
                              <motion.div
                                className="absolute inset-0 rounded-lg border-2 border-amber-400 dark:border-amber-500"
                                animate={{
                                  scale: [1, 1.4, 1],
                                  opacity: [0.6, 0, 0.6],
                                }}
                                transition={{
                                  duration: 1.5,
                                  repeat: Infinity,
                                  ease: 'easeInOut',
                                }}
                              />
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold">
                                {agentDef.name}
                              </span>
                              <Badge
                                variant="secondary"
                                className={`text-[9px] px-1.5 py-0 ${config.badgeClass}`}
                              >
                                {StatusIcon && status === 'thinking' ? (
                                  <StatusIcon className="w-2.5 h-2.5 mr-0.5 animate-spin" />
                                ) : StatusIcon ? (
                                  <StatusIcon className="w-2.5 h-2.5 mr-0.5" />
                                ) : null}
                                {config.label}
                              </Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              {agentDef.description}
                            </p>
                            {/* Content preview for active/completed agents */}
                            {content && status !== 'idle' && (
                              <motion.p
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="text-[10px] text-emerald-700 dark:text-emerald-400 mt-1 truncate"
                              >
                                {content}
                              </motion.p>
                            )}
                          </div>

                          {/* Step number */}
                          <div className="flex-shrink-0">
                            <span className="text-[10px] text-muted-foreground/60 font-mono">
                              {String(index + 1).padStart(2, '0')}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    </TooltipTrigger>
                    <TooltipContent
                      side="right"
                      className="max-w-[260px] bg-popover text-popover-foreground border shadow-lg"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <Icon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span className="font-semibold text-xs">
                            {agentDef.name} Agent
                          </span>
                        </div>
                        <p className="text-[11px] leading-relaxed">
                          {agentDef.tooltipDetail}
                        </p>
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <span>Status:</span>
                          <Badge
                            variant="secondary"
                            className={`text-[9px] px-1 py-0 ${config.badgeClass}`}
                          >
                            {config.label}
                          </Badge>
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </motion.div>
              )
            })}
          </motion.div>

          {/* ─── Pipeline History ────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Card className="border-dashed bg-muted/20">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-xs flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                  Pipeline History
                  <Badge
                    variant="secondary"
                    className="text-[9px] px-1.5 bg-muted/60"
                  >
                    Last 5
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-0">
                <ScrollArea className="max-h-48">
                  <div className="space-y-2">
                    {PIPELINE_HISTORY.map((run, idx) => (
                      <motion.div
                        key={run.id}
                        variants={historyVariants}
                        initial="hidden"
                        animate="visible"
                        transition={{ delay: 0.7 + idx * 0.08 }}
                        className="flex items-start gap-2 p-2 rounded-lg hover:bg-muted/40 transition-colors group"
                      >
                        <div className="flex-shrink-0 mt-0.5">
                          {run.status === 'complete' ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 text-red-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-medium truncate leading-tight">
                            {run.summary}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[9px] text-muted-foreground">
                              {run.timestamp}
                            </span>
                            <ChevronRight className="w-2.5 h-2.5 text-muted-foreground/40" />
                            <span className="text-[9px] text-muted-foreground">
                              {run.duration}
                            </span>
                            <ChevronRight className="w-2.5 h-2.5 text-muted-foreground/40" />
                            <span className="text-[9px] text-muted-foreground">
                              {run.agents.length} agents
                            </span>
                          </div>
                        </div>
                        <Badge
                          variant="secondary"
                          className={`text-[8px] px-1 py-0 flex-shrink-0 ${
                            run.status === 'complete'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                          }`}
                        >
                          {run.status === 'complete' ? 'Success' : 'Failed'}
                        </Badge>
                      </motion.div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </ScrollArea>
    </div>
  )
}
