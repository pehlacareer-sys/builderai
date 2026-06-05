'use client'

import { useState, useCallback, useRef, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload } from 'lucide-react'
import { toast } from 'sonner'

interface FileUploadZoneProps {
  children: ReactNode
}

export function FileUploadZone({ children }: FileUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const dragCounter = useRef(0)

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current++
    if (dragCounter.current === 1) {
      setIsDragging(true)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current--
    if (dragCounter.current === 0) {
      setIsDragging(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current = 0
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      const fileNames = files.map(f => f.name).join(', ')
      toast.success(`${files.length} file${files.length !== 1 ? 's' : ''} received!`, {
        description: 'Paste their content in the chat for AI to process.',
      })
      // Log file names to console for debugging
      console.log('Dropped files:', fileNames)
    }
  }, [])

  return (
    <div
      className="relative h-full"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {children}

      {/* Drag overlay */}
      <AnimatePresence>
        {isDragging && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg"
          >
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2, delay: 0.05 }}
              className="flex flex-col items-center gap-4 p-8 rounded-2xl border-2 border-dashed border-emerald-400 dark:border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 animate-pulse"
            >
              <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                <Upload className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-emerald-700 dark:text-emerald-300">
                  Drop files here
                </p>
                <p className="text-sm text-emerald-600/70 dark:text-emerald-400/70 mt-1">
                  Files will be processed by AI when you paste their content
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
