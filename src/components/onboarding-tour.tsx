'use client'

import { useState, useEffect, useCallback } from 'react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { BrandButton } from '@/components/ui/brand-button'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bot,
  MessageSquare,
  Code2,
  Eye,
  Rocket,
} from 'lucide-react'

const ONBOARDING_KEY = 'builderai-onboarding-complete'

interface TourStep {
  icon: React.ElementType
  title: string
  description: string
}

const STEPS: TourStep[] = [
  {
    icon: Bot,
    title: 'Welcome to BuilderAI!',
    description: 'Build websites with AI superpowers. Let us show you around.',
  },
  {
    icon: MessageSquare,
    title: 'AI Chat',
    description: 'Describe what you want and our 5 AI agents will plan, code, review, test, and deploy your app.',
  },
  {
    icon: Code2,
    title: 'Code Editor',
    description: 'View and edit generated code in real-time. Find & replace, syntax highlighting, and more.',
  },
  {
    icon: Eye,
    title: 'Preview & Validate',
    description: 'Preview your project live and run validation checks to ensure code quality.',
  },
  {
    icon: Rocket,
    title: 'Ready to Build!',
    description: 'Choose from 10 AI models, export as ZIP, and start building amazing things.',
  },
]

interface OnboardingTourProps {
  forceOpen?: boolean
  onComplete?: () => void
}

export function OnboardingTour({ forceOpen, onComplete }: OnboardingTourProps) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState(1)

  // Check if user has already completed onboarding
  useEffect(() => {
    if (forceOpen) {
      // Use microtask to avoid synchronous setState in effect
      const raf = requestAnimationFrame(() => {
        setOpen(true)
        setStep(0)
      })
      return () => cancelAnimationFrame(raf)
    }
    const completed = localStorage.getItem(ONBOARDING_KEY)
    if (!completed) {
      // Slight delay so the page renders first
      const timer = setTimeout(() => setOpen(true), 800)
      return () => clearTimeout(timer)
    }
  }, [forceOpen])

  const handleClose = useCallback(() => {
    localStorage.setItem(ONBOARDING_KEY, 'true')
    setOpen(false)
    onComplete?.()
  }, [onComplete])

  const handleNext = useCallback(() => {
    if (step < STEPS.length - 1) {
      setDirection(1)
      setStep(step + 1)
    } else {
      handleClose()
    }
  }, [step, handleClose])

  const handleBack = useCallback(() => {
    if (step > 0) {
      setDirection(-1)
      setStep(step - 1)
    }
  }, [step])

  const handleSkip = useCallback(() => {
    handleClose()
  }, [handleClose])

  const currentStep = STEPS[step]
  const Icon = currentStep.icon
  const isFirst = step === 0
  const isLast = step === STEPS.length - 1

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleSkip() }}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-background/80 backdrop-blur-xl border-white/10">
        <DialogTitle className="sr-only">{currentStep.title}</DialogTitle>
        <DialogDescription className="sr-only">{currentStep.description}</DialogDescription>
        <div className="p-6 sm:p-8">
          {/* Step Content with Animation */}
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              initial={{ opacity: 0, x: direction * 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -60 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="flex flex-col items-center text-center"
            >
              {/* Gradient Icon Circle */}
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center mb-5 shadow-lg shadow-emerald-500/25">
                <Icon className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
              </div>

              {/* Step Title */}
              <h2 className="text-lg sm:text-xl font-bold mb-2">
                {currentStep.title}
              </h2>

              {/* Step Description */}
              <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
                {currentStep.description}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Progress Dots */}
          <div className="flex items-center justify-center gap-2 mt-6">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => {
                  setDirection(i > step ? 1 : -1)
                  setStep(i)
                }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === step
                    ? 'w-6 bg-emerald-500'
                    : i < step
                    ? 'w-2 bg-emerald-400/60'
                    : 'w-2 bg-muted-foreground/25'
                }`}
                aria-label={`Go to step ${i + 1}`}
              />
            ))}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6">
            {/* Skip / Back */}
            <div>
              {isFirst ? (
                <button
                  onClick={handleSkip}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Skip Tour
                </button>
              ) : (
                <button
                  onClick={handleBack}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                >
                  <span>←</span>
                  Back
                </button>
              )}
            </div>

            {/* Next / Get Started */}
            <BrandButton
              onClick={handleNext}
              size="sm"
              className="h-9 text-xs"
            >
              {isLast ? 'Get Started' : 'Next →'}
            </BrandButton>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Clear the onboarding flag so the tour will show again on next mount.
 * Call this from the user profile dropdown "Show Tour" action.
 */
export function resetOnboarding() {
  localStorage.removeItem(ONBOARDING_KEY)
}
