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

export default function Home() {
  const { isAuthenticated, initialize } = useAuthStore()
  const { currentProject, loadProjects } = useProjectStore()
  const [initializing, setInitializing] = useState(true)
  const [forceTour, setForceTour] = useState(false)

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
      loadProjects().catch((error) => {
        console.error('Failed to load projects:', error)
      })
    }
  }, [isAuthenticated, loadProjects])

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
      {isAuthenticated && (
        <OnboardingTour forceOpen={forceTour} onComplete={handleTourComplete} />
      )}
    </ErrorBoundary>
  )
}
