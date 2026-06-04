'use client'

import { Skeleton } from '@/components/ui/skeleton'

// ─── Dashboard Skeleton ──────────────────────────────────────────────────
// Mimics the dashboard layout: header, stats row, project cards grid

export function DashboardSkeleton() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="w-8 h-8 rounded-lg" />
            <Skeleton className="w-24 h-5" />
            <Skeleton className="w-16 h-5 rounded-full" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="w-8 h-8 rounded-full" />
            <Skeleton className="w-8 h-8 rounded-full" />
            <Skeleton className="w-20 h-4 hidden sm:block" />
            <Skeleton className="w-8 h-8 rounded" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Hero */}
        <div className="mb-8">
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="border rounded-lg p-3 sm:p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="w-9 h-9 rounded-xl" />
                <div>
                  <Skeleton className="h-7 w-10 mb-1" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Section header */}
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-6 w-32" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-48 rounded-md" />
            <Skeleton className="h-7 w-14 rounded-md" />
          </div>
        </div>

        {/* Project Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <ProjectCardSkeleton key={i} />
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-3 w-40" />
        </div>
      </footer>
    </div>
  )
}

// ─── Project Card Skeleton ───────────────────────────────────────────────
// Single project card skeleton

export function ProjectCardSkeleton() {
  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <Skeleton className="w-8 h-8 rounded-lg" />
          <Skeleton className="h-5 w-28" />
        </div>
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <div className="ml-10 mb-3">
        <Skeleton className="h-3 w-full mb-1" />
        <Skeleton className="h-3 w-2/3" />
      </div>
      <div className="ml-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-14" />
        </div>
        <Skeleton className="h-4 w-4 rounded" />
      </div>
    </div>
  )
}

// ─── Workspace Skeleton ──────────────────────────────────────────────────
// Mimics the workspace layout: top bar, sidebar, chat, code viewer

export function WorkspaceSkeleton() {
  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top Bar */}
      <header className="border-b bg-background/80 backdrop-blur-sm h-12 flex items-center px-3 gap-2 flex-shrink-0">
        <Skeleton className="w-7 h-7 rounded" />
        <Skeleton className="h-5 w-px mx-1" />
        <div className="flex items-center gap-2">
          <Skeleton className="w-6 h-6 rounded-md" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-14 rounded-full" />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-7 w-16 rounded" />
          <Skeleton className="h-5 w-px mx-1" />
          <Skeleton className="w-6 h-6 rounded-full" />
          <Skeleton className="w-7 h-7 rounded" />
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* File Tree Sidebar */}
        <div className="border-r w-[220px] flex-shrink-0 flex flex-col">
          <div className="px-3 py-2 border-b flex items-center justify-between">
            <Skeleton className="h-3 w-10" />
            <Skeleton className="h-4 w-6 rounded-full" />
          </div>
          <div className="p-2 space-y-1">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="flex items-center gap-1.5 py-0.5">
                <Skeleton className="w-3 h-3 rounded-sm flex-shrink-0" />
                <Skeleton
                  className="h-3 rounded"
                  style={{ width: `${60 + Math.random() * 80}px` }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Toggle sidebar button */}
        <div className="w-5 flex-shrink-0 border-r flex items-center justify-center">
          <Skeleton className="w-3 h-3 rounded" />
        </div>

        {/* Chat Panel */}
        <div className="flex-1 min-w-0 border-r flex flex-col">
          {/* Chat Header */}
          <div className="border-b px-3 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="w-3.5 h-3.5 rounded" />
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-4 w-12 rounded-full" />
            </div>
            <Skeleton className="w-6 h-6 rounded" />
          </div>

          {/* Chat Messages */}
          <div className="flex-1 p-3 space-y-3">
            <ChatMessageSkeleton isUser />
            <ChatMessageSkeleton />
            <ChatMessageSkeleton isUser />
            <ChatMessageSkeleton />
          </div>

          {/* Input Area */}
          <div className="border-t p-2.5">
            <div className="flex gap-2 items-end">
              <Skeleton className="flex-1 h-10 rounded-md" />
              <Skeleton className="w-10 h-10 rounded-md" />
            </div>
          </div>
        </div>

        {/* Right Panel - Code Viewer */}
        <div className="w-[45%] flex-shrink-0 flex flex-col">
          {/* Tabs */}
          <div className="border-b px-2 flex items-center h-9">
            <div className="flex gap-1">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-7 w-16 rounded" />
              ))}
            </div>
          </div>
          {/* Code area */}
          <div className="flex-1 p-4 space-y-2">
            {Array.from({ length: 20 }).map((_, i) => (
              <Skeleton
                key={i}
                className="h-3 rounded"
                style={{ width: `${40 + Math.random() * 60}%` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Chat Message Skeleton ───────────────────────────────────────────────
// Single chat message skeleton

export function ChatMessageSkeleton({ isUser = false }: { isUser?: boolean }) {
  return (
    <div className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : ''}`}>
      <Skeleton className="h-6 w-6 rounded-full flex-shrink-0 mt-1" />
      <div className={`flex-1 min-w-0 ${isUser ? 'text-right' : ''}`}>
        <Skeleton className={`h-3 w-10 mb-1 ${isUser ? 'ml-auto' : ''}`} />
        <div
          className={`inline-block rounded-xl px-3 py-2 ${
            isUser ? 'bg-primary/10' : 'bg-muted/50'
          }`}
        >
          <Skeleton className="h-3 w-48 mb-1.5" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
    </div>
  )
}

// ─── App Loading Skeleton ────────────────────────────────────────────────
// Full-screen initial loading skeleton (shown before auth check)

export function AppLoadingSkeleton() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/25 animate-pulse">
          <Skeleton className="w-6 h-6 rounded" />
        </div>
        <Skeleton className="h-3 w-28" />
      </div>
    </div>
  )
}
