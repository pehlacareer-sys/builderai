'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Zap, RefreshCw, ArrowLeft, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useProjectStore } from '@/stores/project-store'

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo })
    console.error('[ErrorBoundary] Caught error:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  handleGoToDashboard = () => {
    // Clear current project to return to dashboard
    try {
      useProjectStore.getState().clearCurrentProject()
    } catch {}
    this.handleReset()
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <ErrorFallback
          error={this.state.error}
          onReset={this.handleReset}
          onGoToDashboard={this.handleGoToDashboard}
        />
      )
    }

    return this.props.children
  }
}

function ErrorFallback({
  error,
  onReset,
  onGoToDashboard,
}: {
  error: Error | null
  onReset: () => void
  onGoToDashboard: () => void
}) {
  return (
    <div className="min-h-screen flex relative overflow-hidden">
      {/* Animated background blobs (same style as auth screen) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-red-500/10 dark:bg-red-500/5 blur-3xl animate-blob" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-amber-500/10 dark:bg-amber-500/5 blur-3xl animate-blob animation-delay-2000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-emerald-500/5 dark:bg-emerald-500/3 blur-3xl animate-blob animation-delay-4000" />
      </div>

      {/* Error Content */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="w-full max-w-lg"
        >
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex items-center justify-center gap-3 mb-8"
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent">
              BuilderAI
            </span>
          </motion.div>

          {/* Error Card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="border border-border/50 bg-card/80 backdrop-blur-xl shadow-2xl shadow-black/5 dark:shadow-black/20 rounded-xl p-6 sm:p-8"
          >
            {/* Error Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-100 to-red-100 dark:from-amber-950/40 dark:to-red-950/40 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-amber-600 dark:text-amber-400" />
              </div>
            </div>

            {/* Heading */}
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold tracking-tight mb-2">
                Something went wrong
              </h1>
              <p className="text-muted-foreground text-sm">
                An unexpected error occurred. Don&apos;t worry, your data is safe.
              </p>
            </div>

            {/* Error Details */}
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                transition={{ delay: 0.3 }}
                className="mb-6 rounded-lg border border-border/50 bg-muted/30 p-4"
              >
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  Error Details
                </p>
                <p className="text-sm font-mono text-destructive break-words leading-relaxed">
                  {error.message || 'Unknown error'}
                </p>
              </motion.div>
            )}

            {/* Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex flex-col sm:flex-row gap-3"
            >
              <Button
                onClick={onReset}
                className="flex-1 h-10 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/25"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
              <Button
                variant="outline"
                onClick={onGoToDashboard}
                className="flex-1 h-10"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go to Dashboard
              </Button>
            </motion.div>
          </motion.div>

          {/* Footer hint */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-center text-xs text-muted-foreground mt-6"
          >
            If this problem persists, try refreshing the page or clearing your browser cache.
          </motion.p>
        </motion.div>
      </div>
    </div>
  )
}
