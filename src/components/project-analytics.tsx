'use client'

import { useEffect, useState, useMemo } from 'react'
import { useProjectStore, type ProjectFile } from '@/stores/project-store'
import { useChatStore } from '@/stores/chat-store'
import { motion } from 'framer-motion'
import {
  FileCode, MessageSquare, Bot, Brain, Code2, ShieldCheck,
  TestTube, Rocket, Activity, BarChart3, PieChart, TrendingUp,
  Clock, Zap, Hash
} from 'lucide-react'

// ─── Animated Counter ──────────────────────────────────────────────────────

function AnimatedCounter({ value, duration = 1500, suffix = '' }: { value: number; duration?: number; suffix?: string }) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let start = 0
    const startTime = performance.now()
    const step = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = Math.floor(eased * value)
      setCount(current)
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
    return () => { start = value }
  }, [value, duration])

  return <span>{count}{suffix}</span>
}

// ─── SVG Circular Progress ─────────────────────────────────────────────────

function CircularProgress({ value, size = 80, strokeWidth = 6, color = '#10b981', label }: {
  value: number; size?: number; strokeWidth?: number; color?: string; label: string
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (value / 100) * circumference
  const [animatedOffset, setAnimatedOffset] = useState(circumference)

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedOffset(offset), 100)
    return () => clearTimeout(timer)
  }, [offset])

  return (
    <div className="flex flex-col items-center gap-1.5">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke="currentColor" className="text-muted/30" strokeWidth={strokeWidth} />
        <motion.circle cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={animatedOffset}
          style={{ transition: 'stroke-dashoffset 1.5s ease-out' }} />
      </svg>
      <div className="absolute flex flex-col items-center justify-center" style={{ width: size, height: size }}>
        <span className="text-lg font-bold">{Math.round(value)}%</span>
      </div>
      <span className="text-[10px] text-muted-foreground font-medium">{label}</span>
    </div>
  )
}

// ─── Donut Chart (conic-gradient) ──────────────────────────────────────────

function DonutChart({ data }: { data: Array<{ label: string; value: number; color: string }> }) {
  const total = data.reduce((sum, d) => sum + d.value, 0)

  // Calculate segments with cumulative angles
  const segments = data.reduce<Array<{ label: string; value: number; color: string; start: number; end: number }>>((acc, d, i) => {
    const prevEnd = i > 0 ? acc[i - 1].end : 0
    const end = prevEnd + (d.value / total) * 360
    acc.push({ ...d, start: prevEnd, end })
    return acc
  }, [])

  const conicStops = segments.map(s => `${s.color} ${s.start}deg ${s.end}deg`).join(', ')

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="w-24 h-24 rounded-full relative"
        style={{
          background: `conic-gradient(${conicStops})`,
          WebkitMask: 'radial-gradient(circle, transparent 35%, black 36%)',
          mask: 'radial-gradient(circle, transparent 35%, black 36%)',
        }}
      />
      <div className="flex flex-wrap gap-x-3 gap-y-1 justify-center">
        {data.map(d => (
          <div key={d.label} className="flex items-center gap-1.5 text-[10px]">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: d.color }} />
            <span className="text-muted-foreground">{d.label}</span>
            <span className="font-medium">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Bar Chart (CSS) ───────────────────────────────────────────────────────

function BarChart({ data, maxValue, label }: {
  data: Array<{ label: string; value: number; color: string }>
  maxValue: number
  label: string
}) {
  return (
    <div>
      <div className="text-[10px] text-muted-foreground font-medium mb-2">{label}</div>
      <div className="space-y-1.5">
        {data.map((d, i) => (
          <motion.div
            key={d.label}
            className="flex items-center gap-2"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <span className="text-[10px] text-muted-foreground w-16 text-right truncate flex-shrink-0">{d.label}</span>
            <div className="flex-1 h-4 bg-muted/30 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: d.color }}
                initial={{ width: 0 }}
                animate={{ width: `${maxValue > 0 ? (d.value / maxValue) * 100 : 0}%` }}
                transition={{ duration: 0.8, delay: i * 0.05, ease: 'easeOut' }}
              />
            </div>
            <span className="text-[10px] font-medium w-6 text-right">{d.value}</span>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

// ─── Main Analytics Component ──────────────────────────────────────────────

interface ProjectAnalyticsProps {
  files: ProjectFile[]
  conversations: Array<{ id: string; title: string | null; messages?: any[]; createdAt: string }>
  messages: Array<{ role: string; content: string; createdAt?: string }>
  agentPipeline: Array<{ agent: string; status: string }>
  projectId: string
}

export function ProjectAnalytics({ files, conversations, messages, agentPipeline, projectId }: ProjectAnalyticsProps) {

  // ─── Computed Metrics ──────────────────────────────────────────────

  const fileStats = useMemo(() => {
    const typeCounts: Record<string, number> = {}
    let totalLines = 0
    for (const file of files) {
      const ext = file.path.split('.').pop()?.toLowerCase() || 'other'
      const normalizedExt = ext === 'tsx' ? 'TSX' : ext === 'ts' ? 'TS' : ext === 'jsx' ? 'JSX' : ext === 'js' ? 'JS' : ext === 'css' ? 'CSS' : ext === 'json' ? 'JSON' : ext === 'md' ? 'MD' : ext.toUpperCase()
      typeCounts[normalizedExt] = (typeCounts[normalizedExt] || 0) + 1
      totalLines += file.content.split('\n').length
    }
    return { totalFiles: files.length, totalLines, typeCounts }
  }, [files])

  const chatStats = useMemo(() => {
    const userMsgs = messages.filter(m => m.role === 'user').length
    const aiMsgs = messages.filter(m => m.role !== 'user').length
    const totalMsgs = messages.length
    const avgPerConv = conversations.length > 0 ? Math.round(totalMsgs / conversations.length) : 0
    return { userMsgs, aiMsgs, totalMsgs, conversations: conversations.length, avgPerConv }
  }, [messages, conversations])

  const agentPerformance = useMemo(() => {
    const agentCounts: Record<string, number> = {
      planner: 0, engineer: 0, reviewer: 0, qa: 0, deployer: 0,
    }
    for (const msg of messages) {
      if (agentCounts[msg.role] !== undefined) {
        agentCounts[msg.role]++
      }
    }
    return agentCounts
  }, [messages])

  const healthScore = useMemo(() => {
    const hasPackageJson = files.some(f => f.path.includes('package.json'))
    const hasTsConfig = files.some(f => f.path.includes('tsconfig'))
    const hasAppDir = files.some(f => f.path.includes('app/'))
    const hasReadme = files.some(f => f.path.toLowerCase().includes('readme'))
    const hasEnv = files.some(f => f.path.includes('.env') || f.path.includes('env'))

    let score = 0
    if (hasPackageJson) score += 25
    if (hasTsConfig) score += 20
    if (hasAppDir) score += 25
    if (hasReadme) score += 15
    if (hasEnv) score += 15
    return score
  }, [files])

  // ─── Chart Data ────────────────────────────────────────────────────

  const fileTypeChartData = useMemo(() => {
    const colors: Record<string, string> = {
      TSX: '#38bdf8', TS: '#0ea5e9', JSX: '#f59e0b', JS: '#fbbf24',
      CSS: '#a855f7', JSON: '#eab308', MD: '#6b7280', OTHER: '#94a3b8',
    }
    return Object.entries(fileStats.typeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([ext, count]) => ({
        label: ext,
        value: count,
        color: colors[ext] || colors.OTHER,
      }))
  }, [fileStats.typeCounts])

  const agentChartData = useMemo(() => {
    const agentColors: Record<string, string> = {
      planner: '#8b5cf6', engineer: '#10b981', reviewer: '#f59e0b', qa: '#0ea5e9', deployer: '#f43f5e',
    }
    return Object.entries(agentPerformance)
      .map(([agent, count]) => ({
        label: agent.charAt(0).toUpperCase() + agent.slice(1),
        value: count,
        color: agentColors[agent] || '#94a3b8',
      }))
      .filter(d => d.value > 0)
  }, [agentPerformance])

  const linesPerFile = useMemo(() => {
    const colors = ['#10b981', '#14b8a6', '#0d9488', '#0f766e', '#115e59']
    return files
      .slice(0, 8)
      .map((f, i) => ({
        label: f.path.split('/').pop() || f.path,
        value: f.content.split('\n').length,
        color: colors[i % colors.length],
      }))
      .sort((a, b) => b.value - a.value)
  }, [files])

  const maxLines = linesPerFile.length > 0 ? Math.max(...linesPerFile.map(d => d.value)) : 1
  const maxAgent = agentChartData.length > 0 ? Math.max(...agentChartData.map(d => d.value)) : 1

  const healthLabel = healthScore >= 80 ? 'Excellent' : healthScore >= 60 ? 'Good' : healthScore >= 40 ? 'Fair' : 'Needs Work'
  const healthColor = healthScore >= 80 ? '#10b981' : healthScore >= 60 ? '#f59e0b' : '#ef4444'

  // ─── Render ────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">
      <div className="border-b px-3 sm:px-4 py-2 flex items-center gap-2 bg-muted/30">
        <Activity className="w-4 h-4 text-emerald-500" />
        <span className="text-xs font-medium text-muted-foreground">Project Analytics</span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4">
        {/* ─── Top Stats Row ──────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          {[
            { icon: FileCode, label: 'Total Files', value: fileStats.totalFiles, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30' },
            { icon: Hash, label: 'Total Lines', value: fileStats.totalLines, color: 'text-teal-600 bg-teal-50 dark:bg-teal-950/30' },
            { icon: MessageSquare, label: 'Messages', value: chatStats.totalMsgs, color: 'text-violet-600 bg-violet-50 dark:bg-violet-950/30' },
            { icon: Bot, label: 'Conversations', value: chatStats.conversations, color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/30' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="rounded-lg border p-2.5 sm:p-3 flex items-center gap-2"
            >
              <div className={`p-1.5 rounded-lg ${stat.color} flex-shrink-0`}>
                <stat.icon className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="text-base sm:text-lg font-bold">
                  <AnimatedCounter value={stat.value} />
                </div>
                <div className="text-[9px] sm:text-[10px] text-muted-foreground">{stat.label}</div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* ─── Health Score + File Type Donut ─────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Project Health */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-lg border p-4"
          >
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-xs font-medium text-muted-foreground">Project Health Score</span>
            </div>
            <div className="flex items-center justify-center relative">
              <CircularProgress value={healthScore} size={100} strokeWidth={8} color={healthColor} label="" />
              <div className="absolute flex flex-col items-center justify-center" style={{ top: 'calc(50% - 14px)' }}>
                <span className="text-2xl font-bold" style={{ color: healthColor }}>{healthScore}</span>
                <span className="text-[10px] text-muted-foreground">{healthLabel}</span>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-1.5">
              {[
                { label: 'package.json', ok: files.some(f => f.path.includes('package.json')) },
                { label: 'tsconfig', ok: files.some(f => f.path.includes('tsconfig')) },
                { label: 'app/ dir', ok: files.some(f => f.path.includes('app/')) },
                { label: 'README', ok: files.some(f => f.path.toLowerCase().includes('readme')) },
              ].map(check => (
                <div key={check.label} className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-full ${
                  check.ok
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: check.ok ? '#10b981' : '#94a3b8' }} />
                  {check.label}
                </div>
              ))}
            </div>
          </motion.div>

          {/* File Type Distribution */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="rounded-lg border p-4"
          >
            <div className="flex items-center gap-2 mb-3">
              <PieChart className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-xs font-medium text-muted-foreground">File Type Distribution</span>
            </div>
            {fileTypeChartData.length > 0 ? (
              <DonutChart data={fileTypeChartData} />
            ) : (
              <div className="flex items-center justify-center h-24 text-xs text-muted-foreground">
                No files yet
              </div>
            )}
          </motion.div>
        </div>

        {/* ─── Activity Timeline (Lines per file) ────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-lg border p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-xs font-medium text-muted-foreground">Lines per File</span>
          </div>
          {linesPerFile.length > 0 ? (
            <BarChart data={linesPerFile} maxValue={maxLines} label="" />
          ) : (
            <div className="flex items-center justify-center h-16 text-xs text-muted-foreground">
              No files yet
            </div>
          )}
        </motion.div>

        {/* ─── Agent Performance ─────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="rounded-lg border p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <Bot className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-xs font-medium text-muted-foreground">Agent Performance</span>
          </div>
          {agentChartData.length > 0 ? (
            <BarChart data={agentChartData} maxValue={maxAgent} label="" />
          ) : (
            <div className="flex items-center justify-center h-16 text-xs text-muted-foreground">
              <div className="flex flex-col items-center gap-1">
                <Bot className="w-6 h-6 text-muted-foreground/30" />
                <span>No agent activity yet</span>
              </div>
            </div>
          )}
        </motion.div>

        {/* ─── Chat Stats ────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="rounded-lg border p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-xs font-medium text-muted-foreground">Chat Statistics</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'User Messages', value: chatStats.userMsgs, icon: MessageSquare },
              { label: 'AI Responses', value: chatStats.aiMsgs, icon: Bot },
              { label: 'Total Conversations', value: chatStats.conversations, icon: Clock },
              { label: 'Avg per Conversation', value: chatStats.avgPerConv, icon: Activity },
            ].map(stat => (
              <div key={stat.label} className="text-center">
                <div className="text-lg font-bold">
                  <AnimatedCounter value={stat.value} />
                </div>
                <div className="text-[10px] text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
