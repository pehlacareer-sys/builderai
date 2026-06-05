'use client'

import { motion } from 'framer-motion'
import { LucideIcon } from 'lucide-react'

interface StatCardProps {
  icon: LucideIcon
  value: number | string
  label: string
  trend?: { value: number; isPositive: boolean }
  iconColor?: string
  iconBg?: string
  delay?: number
}

export function StatCard({ icon: Icon, value, label, trend, iconColor = 'text-emerald-600 dark:text-emerald-400', iconBg = 'bg-emerald-50 dark:bg-emerald-950/30', delay = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className="relative overflow-hidden rounded-xl border bg-card p-4 hover:shadow-md transition-shadow"
    >
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconBg}`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-2xl font-bold tracking-tight">{value}</p>
          <p className="text-xs text-muted-foreground truncate">{label}</p>
        </div>
      </div>
      {trend && (
        <div className={`mt-2 flex items-center gap-1 text-xs ${trend.isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
          <span>{trend.isPositive ? '↑' : '↓'}</span>
          <span>{Math.abs(trend.value)}%</span>
        </div>
      )}
    </motion.div>
  )
}
