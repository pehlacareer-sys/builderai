'use client'

import { Suspense, useEffect, useState, lazy, useCallback } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { useProjectStore } from '@/stores/project-store'
import { ErrorBoundary } from '@/components/error-boundary'
import {
  DashboardSkeleton,
  WorkspaceSkeleton,
  AppLoadingSkeleton,
} from '@/components/loading-skeletons'
import { OnboardingTour, resetOnboarding } from '@/components/onboarding-tour'
import { Loader2, Zap } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

// Lazy load heavy components for better perceived performance
const AuthScreen = lazy(() =>
  import('@/components/auth-screen').then((mod) => ({ default: mod.AuthScreen }))
)
const Dashboard = lazy(() =>
  import('@/components/dashboard').then((mod) => ({ default: mod.Dashboard }))
)
const Workspace = lazy(() =>
  import('@/components/workspace').then((mod) => ({ default: mod.Workspace }))
)

function AuthFallback() {
  return <AppLoadingSkeleton />
}

function DashboardFallback() {
  return <DashboardSkeleton />
}

function WorkspaceFallback() {
  return <WorkspaceSkeleton />
}

// Page transition wrapper with fade + slide
function PageTransition({ children, pageKey }: { children: React.ReactNode; pageKey: string }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pageKey}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="min-h-screen"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

// Loading bar component - thin emerald gradient line
function LoadingBar({ isLoading }: { isLoading: boolean }) {
  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-[100] h-[2px]"
        >
          <motion.div
            className="h-full bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500"
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 1.5, ease: 'easeInOut' }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default function Home() {
  const { isAuthenticated, initialize } = useAuthStore()
  const { currentProject, loadProjects } = useProjectStore()
  const [initializing, setInitializing] = useState(true)
  const [forceTour, setForceTour] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)

  // Track page transitions
  const pageKey = !isAuthenticated ? 'auth' : currentProject ? 'workspace' : 'dashboard'

  const handleShowTour = useCallback(() => {
    resetOnboarding()
    setForceTour(true)
  }, [])

  const handleTourComplete = useCallback(() => {
    setForceTour(false)
  }, [])

  // Listen for custom event from workspace to trigger tour
  useEffect(() => {
    const handler = () => handleShowTour()
    window.addEventListener('show-onboarding-tour', handler)
    return () => window.removeEventListener('show-onboarding-tour', handler)
  }, [handleShowTour])

  useEffect(() => {
    const init = async () => {
      try {
        await initialize()
      } catch (error) {
        console.error('Failed to initialize auth:', error)
      } finally {
        setInitializing(false)
      }
    }
    init()
  }, [initialize])

  useEffect(() => {
    if (isAuthenticated) {
      setIsTransitioning(true)
      loadProjects().catch((error) => {
        console.error('Failed to load projects:', error)
      }).finally(() => {
        setTimeout(() => setIsTransitioning(false), 300)
      })
    }
  }, [isAuthenticated, loadProjects])

  // Show transition bar when page key changes
  useEffect(() => {
    setIsTransitioning(true)
    const timer = setTimeout(() => setIsTransitioning(false), 400)
    return () => clearTimeout(timer)
  }, [pageKey])

  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
            <Loader2 className="w-6 h-6 text-white animate-spin" />
          </div>
          <p className="text-sm text-muted-foreground">Loading BuilderAI...</p>
        </div>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <LoadingBar isLoading={isTransitioning} />
      <PageTransition pageKey={pageKey}>
        {!isAuthenticated ? (
          <Suspense fallback={<AuthFallback />}>
            <AuthScreen />
          </Suspense>
        ) : currentProject ? (
          <Suspense fallback={<WorkspaceFallback />}>
            <Workspace />
          </Suspense>
        ) : (
          <Suspense fallback={<DashboardFallback />}>
            <Dashboard onShowTour={handleShowTour} />
          </Suspense>
        )}
      </PageTransition>
      {isAuthenticated && (
        <OnboardingTour forceOpen={forceTour} onComplete={handleTourComplete} />
      )}
    </ErrorBoundary>
  )
}
