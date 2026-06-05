'use client'

import { useState } from 'react'
import { BrandButton } from '@/components/ui/brand-button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { motion } from 'framer-motion'
import {
  Shield, Play, CheckCircle2, XCircle, AlertCircle,
  FileCode, FileText, Settings2, Code2,
} from 'lucide-react'

export function ValidationPanel({
  results,
  summary,
  onValidate,
  validating,
}: {
  results: Array<{ status: string; message: string; details?: string }>
  summary: { total: number; passed: number; failed: number; warnings: number } | null
  onValidate: () => void
  validating: boolean
}) {
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set())
  const toggleExpand = (idx: number) => {
    setExpandedItems(prev => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  // Categorize results
  const categories = [
    { key: 'required', label: 'Required Files', icon: FileCode, results: results.filter(r => r.message.includes('is missing') || r.message.includes('exists')).filter(r => r.message.includes('Root layout') || r.message.includes('Home page') || r.message.includes('Package configuration')) },
    { key: 'recommended', label: 'Recommended Files', icon: FileText, results: results.filter(r => r.message.includes('is missing') || r.message.includes('exists')).filter(r => r.message.includes('TypeScript configuration') || r.message.includes('Next.js configuration') || r.message.includes('Global styles')) },
    { key: 'config', label: 'Configuration', icon: Settings2, results: results.filter(r => r.message.includes('package.json') || r.message.includes('tsconfig') || r.message.includes('Dependency') || r.message.includes('Build script') || r.message.includes('strict mode') || r.message.includes('Path alias') || r.message.includes('name field')) },
    { key: 'code', label: 'Code Quality', icon: Code2, results: results.filter(r => r.message.includes('unbalanced') || r.message.includes('No export') || r.message.includes('empty') || r.message.includes('not valid JSON')) },
  ]
  // Add uncategorized results
  const categorized = new Set(categories.flatMap(c => c.results))
  const uncategorized = results.filter(r => !categorized.has(r))
  if (uncategorized.length > 0) {
    categories.push({ key: 'other', label: 'Other', icon: AlertCircle, results: uncategorized })
  }

  const passCount = summary?.passed ?? results.filter(r => r.status === 'pass').length
  const failCount = summary?.failed ?? results.filter(r => r.status === 'fail').length
  const warnCount = summary?.warnings ?? results.filter(r => r.status === 'warn').length
  const total = summary?.total ?? results.length

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="p-4 border-b bg-muted/30">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-500" />
            Project Validation
          </h3>
          <BrandButton
            icon={Play}
            size="sm"
            className="h-8 text-xs"
            onClick={onValidate}
            loading={validating}
          >
            Run Checks
          </BrandButton>
        </div>

        {results.length > 0 && (
          <>
            {/* Summary Progress Bar */}
            <div className="mb-3">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="flex-1 h-2.5 rounded-full overflow-hidden bg-muted flex">
                  {passCount > 0 && (
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(passCount / total) * 100}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                      className="bg-emerald-500 h-full"
                    />
                  )}
                  {warnCount > 0 && (
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(warnCount / total) * 100}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut', delay: 0.2 }}
                      className="bg-amber-500 h-full"
                    />
                  )}
                  {failCount > 0 && (
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(failCount / total) * 100}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut', delay: 0.4 }}
                      className="bg-red-500 h-full"
                    />
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs">
                {passCount > 0 && (
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-3 h-3" />
                    {passCount} passed
                  </span>
                )}
                {warnCount > 0 && (
                  <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                    <AlertCircle className="w-3 h-3" />
                    {warnCount} warnings
                  </span>
                )}
                {failCount > 0 && (
                  <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                    <XCircle className="w-3 h-3" />
                    {failCount} failed
                  </span>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4">
          {results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Shield className="w-12 h-12 mb-3 opacity-20" />
              <p className="text-sm font-medium">No validation results yet</p>
              <p className="text-xs mt-1">Click &quot;Run Checks&quot; to validate your project</p>
            </div>
          ) : (
            <div className="space-y-4">
              {categories.filter(c => c.results.length > 0).map(category => (
                <div key={category.key}>
                  <div className="flex items-center gap-2 mb-2">
                    <category.icon className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{category.label}</span>
                    <Badge variant="secondary" className="text-[10px] px-1.5">{category.results.length}</Badge>
                  </div>
                  <div className="space-y-1">
                    {category.results.map((result) => {
                      const globalIdx = results.indexOf(result)
                      const hasDetails = !!result.details
                      const isExpanded = expandedItems.has(globalIdx)
                      return (
                        <motion.div
                          key={globalIdx}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: globalIdx * 0.03 }}
                          className={`rounded-lg border p-2.5 text-xs transition-colors ${
                            result.status === 'pass' ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/30 dark:bg-emerald-950/10' :
                            result.status === 'fail' ? 'border-red-200 bg-red-50/50 dark:border-red-900/30 dark:bg-red-950/10' :
                            'border-amber-200 bg-amber-50/50 dark:border-amber-900/30 dark:bg-amber-950/10'
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            {result.status === 'pass' ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
                            ) : result.status === 'fail' ? (
                              <XCircle className="w-3.5 h-3.5 text-red-500 mt-0.5 flex-shrink-0" />
                            ) : (
                              <AlertCircle className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <span className="font-medium">{result.message}</span>
                              {hasDetails && (
                                <button
                                  onClick={() => toggleExpand(globalIdx)}
                                  className="ml-2 text-muted-foreground hover:text-foreground underline decoration-dotted underline-offset-2"
                                >
                                  {isExpanded ? 'Hide' : 'Details'}
                                </button>
                              )}
                              {hasDetails && isExpanded && (
                                <motion.p
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  className="mt-1.5 text-muted-foreground text-[11px] pl-0 border-l-2 border-emerald-300 dark:border-emerald-700 py-0.5"
                                >
                                  {result.details}
                                </motion.p>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
