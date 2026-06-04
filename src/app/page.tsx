'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { useProjectStore } from '@/stores/project-store'
import { AuthScreen } from '@/components/auth-screen'
import { Dashboard } from '@/components/dashboard'
import { Workspace } from '@/components/workspace'
import { Loader2 } from 'lucide-react'

export default function Home() {
  const { isAuthenticated, initialize } = useAuthStore()
  const { currentProject, loadProjects } = useProjectStore()
  const [initializing, setInitializing] = useState(true)

  useEffect(() => {
    const init = async () => {
      await initialize()
      setInitializing(false)
    }
    init()
  }, [initialize])

  useEffect(() => {
    if (isAuthenticated) {
      loadProjects()
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

  if (!isAuthenticated) {
    return <AuthScreen />
  }

  if (currentProject) {
    return <Workspace />
  }

  return <Dashboard />
}
