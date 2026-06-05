'use client'

import { Button } from '@/components/ui/button'
import { Loader2, LucideIcon } from 'lucide-react'

interface BrandButtonProps extends React.ComponentProps<typeof Button> {
  icon?: LucideIcon
  loading?: boolean
  gradient?: boolean
}

export function BrandButton({ icon: Icon, loading, gradient = true, children, disabled, className, ...props }: BrandButtonProps) {
  return (
    <Button
      disabled={disabled || loading}
      className={
        gradient
          ? `bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-sm shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all hover:scale-[1.02] active:scale-[0.98] ${className || ''}`
          : className
      }
      {...props}
    >
      {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : Icon ? <Icon className="w-4 h-4 mr-2" /> : null}
      {children}
    </Button>
  )
}
