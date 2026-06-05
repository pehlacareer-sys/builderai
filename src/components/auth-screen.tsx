'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ThemeToggle } from '@/components/theme-toggle'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Zap, ArrowRight, Loader2, Bot, Layers, Sparkles, Rocket,
  Code2, Shield, Globe, Keyboard, Check, Quote, Github,
  ChevronLeft, ChevronRight
} from 'lucide-react'
import { toast } from 'sonner'

const FEATURES = [
  {
    icon: Bot,
    title: 'AI-Powered Agents',
    description: 'Multi-agent pipeline: Plan, Engineer, Review, QA, and Deploy — all automated.',
    color: 'text-violet-600 bg-violet-100 dark:bg-violet-950/40',
  },
  {
    icon: Code2,
    title: 'Full-Stack Generation',
    description: 'Generate complete Next.js apps with TypeScript, Tailwind CSS, and Prisma ORM.',
    color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-950/40',
  },
  {
    icon: Shield,
    title: 'Code Validation',
    description: 'Automated checks for project health, TypeScript config, and code quality.',
    color: 'text-amber-600 bg-amber-100 dark:bg-amber-950/40',
  },
  {
    icon: Rocket,
    title: 'One-Click Deploy',
    description: 'Ship to production instantly with integrated deployment pipeline.',
    color: 'text-sky-600 bg-sky-100 dark:bg-sky-950/40',
  },
]

// Features for the carousel
const FEATURE_SHOWCASE = [
  {
    title: 'Multi-Agent Pipeline',
    description: 'Five specialized AI agents work together to build your app from start to finish.',
    gradient: 'from-violet-500 to-purple-600',
    icon: Bot,
  },
  {
    title: 'Real-time Code Generation',
    description: 'Watch as AI generates production-quality code in real time with live preview.',
    gradient: 'from-emerald-500 to-teal-600',
    icon: Code2,
  },
  {
    title: 'Smart Code Review',
    description: 'Automated code review catches bugs, suggests improvements, and enforces best practices.',
    gradient: 'from-amber-500 to-orange-600',
    icon: Shield,
  },
  {
    title: 'Instant Deployment',
    description: 'One click to deploy your application to production with zero configuration.',
    gradient: 'from-sky-500 to-blue-600',
    icon: Rocket,
  },
]

const TRUST_METRICS = [
  { value: 10000, suffix: '+', label: 'Projects Built' },
  { value: 50000, suffix: '+', label: 'Files Generated' },
  { value: 99.9, suffix: '%', label: 'Uptime' },
]

const TESTIMONIALS = [
  {
    quote: "BuilderAI reduced our development time by 70%. The AI agents handle the heavy lifting while we focus on design.",
    author: "Sarah Chen",
    role: "CTO, TechVenture",
  },
  {
    quote: "From idea to deployed app in under 10 minutes. It's like having a full engineering team on demand.",
    author: "Marcus Johnson",
    role: "Founder, StartupKit",
  },
  {
    quote: "The code quality from AI is impressive. Clean, well-structured, and follows best practices out of the box.",
    author: "Priya Patel",
    role: "Lead Developer, CodeCraft",
  },
]

// Animated counter component
function AnimatedCounter({ value, suffix, duration = 2000 }: { value: number; suffix: string; duration?: number }) {
  const [count, setCount] = useState(0)
  const [hasStarted, setHasStarted] = useState(false)

  useEffect(() => {
    const startTimer = setTimeout(() => setHasStarted(true), 500)
    return () => clearTimeout(startTimer)
  }, [])

  useEffect(() => {
    if (!hasStarted) return

    let start = 0
    const increment = value / (duration / 16)
    const isDecimal = value % 1 !== 0

    const timer = setInterval(() => {
      start += increment
      if (start >= value) {
        setCount(value)
        clearInterval(timer)
      } else {
        setCount(isDecimal ? parseFloat(start.toFixed(1)) : Math.floor(start))
      }
    }, 16)

    return () => clearInterval(timer)
  }, [hasStarted, value, duration])

  return (
    <span>
      {value === 10000 ? `${(count / 1000).toFixed(count >= 1000 ? 0 : 1)}K` : value === 50000 ? `${(count / 1000).toFixed(count >= 1000 ? 0 : 1)}K` : count}{suffix}
    </span>
  )
}

// Password strength indicator with smooth transitions
function PasswordStrength({ password }: { password: string }) {
  if (!password) return null

  const getStrength = (pw: string) => {
    let score = 0
    if (pw.length >= 4) score++
    if (pw.length >= 8) score++
    if (/[A-Z]/.test(pw)) score++
    if (/[0-9]/.test(pw)) score++
    if (/[^A-Za-z0-9]/.test(pw)) score++
    return score
  }

  const strength = getStrength(password)
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong']
  const colors = ['', 'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-emerald-500', 'bg-emerald-600']
  const textColors = ['', 'text-red-500', 'text-orange-500', 'text-amber-500', 'text-emerald-500', 'text-emerald-600']
  const percentage = (strength / 5) * 100

  return (
    <div className="mt-1.5 space-y-1">
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${colors[strength]}`}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>
      <p className={`text-[10px] font-medium ${textColors[strength]} transition-colors duration-300`}>
        {labels[strength]}
      </p>
    </div>
  )
}

// Typing animation component for hero heading
function TypingText({ text, speed = 50, delay = 0 }: { text: string; speed?: number; delay?: number }) {
  const [displayed, setDisplayed] = useState('')
  const [cursorVisible, setCursorVisible] = useState(true)
  const startedRef = useRef(false)

  useEffect(() => {
    const delayTimer = setTimeout(() => {
      startedRef.current = true
      let i = 0
      const timer = setInterval(() => {
        if (i < text.length) {
          setDisplayed(text.slice(0, i + 1))
          i++
        } else {
          clearInterval(timer)
          setTimeout(() => setCursorVisible(false), 2000)
        }
      }, speed)
      return () => clearInterval(timer)
    }, delay)
    return () => clearTimeout(delayTimer)
  }, [text, speed, delay])

  return (
    <span>
      {displayed}
      {cursorVisible && (
        <span className="animate-cursor-blink text-emerald-500 ml-0.5">|</span>
      )}
    </span>
  )
}

export function AuthScreen() {
  const { login, register, isLoading, error, clearError } = useAuthStore()
  const [activeTab, setActiveTab] = useState('login')
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [registerName, setRegisterName] = useState('')
  const [registerEmail, setRegisterEmail] = useState('')
  const [registerPassword, setRegisterPassword] = useState('')
  const [testimonialIndex, setTestimonialIndex] = useState(0)
  const [featureIndex, setFeatureIndex] = useState(0)

  // Spotlight cursor tracking
  const heroRef = useRef<HTMLDivElement>(null)
  const [spotlightStyle, setSpotlightStyle] = useState<React.CSSProperties>({})

  const handleHeroMouseMove = useCallback((e: React.MouseEvent) => {
    if (!heroRef.current) return
    const rect = heroRef.current.getBoundingClientRect()
    setSpotlightStyle({
      left: e.clientX - rect.left,
      top: e.clientY - rect.top,
    })
  }, [])

  // Rotate testimonials
  useEffect(() => {
    const timer = setInterval(() => {
      setTestimonialIndex((prev) => (prev + 1) % TESTIMONIALS.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [])

  // Auto-rotate feature carousel
  useEffect(() => {
    const timer = setInterval(() => {
      setFeatureIndex((prev) => (prev + 1) % FEATURE_SHOWCASE.length)
    }, 4000)
    return () => clearInterval(timer)
  }, [])

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    clearError()
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await login(loginEmail, loginPassword)
    } catch {}
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await register(registerEmail, registerName, registerPassword)
    } catch {}
  }

  return (
    <div className="min-h-screen flex relative overflow-hidden">
      {/* Animated background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-emerald-500/10 dark:bg-emerald-500/5 blur-3xl animate-blob" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-teal-500/10 dark:bg-teal-500/5 blur-3xl animate-blob animation-delay-2000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-violet-500/5 dark:bg-violet-500/3 blur-3xl animate-blob animation-delay-4000" />

        {/* Floating particle dots */}
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className={`absolute w-1 h-1 rounded-full bg-emerald-400/30 dark:bg-emerald-400/20 ${
              i % 3 === 0 ? 'animate-particle' : i % 3 === 1 ? 'animate-particle-slow' : 'animate-particle-fast'
            }`}
            style={{
              left: `${5 + (i * 8) % 90}%`,
              bottom: `-5%`,
              animationDelay: `${i * 1.3}s`,
            }}
          />
        ))}
      </div>

      {/* Left side - Marketing / Hero (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative z-10 flex-col justify-center px-12 xl:px-20" ref={heroRef} onMouseMove={handleHeroMouseMove}>
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent">
              BuilderAI
            </span>
          </div>

          {/* Animated Grid Background on hero */}
          <div className="relative">
            {/* Spotlight cursor effect */}
            <div
              className="absolute pointer-events-none z-0"
              style={{
                width: 400,
                height: 400,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(16, 185, 129, 0.06) 0%, transparent 70%)',
                transform: 'translate(-50%, -50%)',
                transition: 'left 0.15s ease-out, top 0.15s ease-out',
                ...spotlightStyle,
              }}
            />
            <div className="absolute inset-0 bg-grid-pattern opacity-[0.03] dark:opacity-[0.02] pointer-events-none" />

            {/* Hero Text with typing animation */}
            <h1 className="text-4xl xl:text-5xl font-bold tracking-tight leading-tight mb-4 relative">
              <TypingText text="Build websites with" speed={40} delay={600} />
              <br />
              <span className="bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent animate-gradient-shift">
                <TypingText text="AI superpowers" speed={50} delay={1800} />
              </span>
            </h1>
          </div>
          <p className="text-lg text-muted-foreground mb-10 max-w-lg">
            Describe what you want, and our AI agents will plan, code, review, and deploy
            production-ready Next.js applications — all from a simple chat.
          </p>

          {/* Feature List */}
          <div className="grid grid-cols-2 gap-4 mb-10">
            {FEATURES.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                className="flex items-start gap-3 group"
              >
                <div className={`p-2 rounded-lg ${feature.color} flex-shrink-0 feature-icon-hover`}>
                  <feature.icon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold">{feature.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Trust Metrics with animated counters */}
          <div className="flex items-center gap-8 mb-6">
            {TRUST_METRICS.map((metric) => (
              <div key={metric.label}>
                <div className="text-2xl font-bold">
                  <AnimatedCounter value={metric.value} suffix={metric.suffix} />
                </div>
                <div className="text-xs text-muted-foreground">{metric.label}</div>
              </div>
            ))}
          </div>

          {/* Trusted By Logos Bar */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mb-10"
          >
            <div className="border-t border-border/30 pt-4">
              <p className="text-xs text-muted-foreground/40 font-semibold tracking-wider uppercase mb-3 text-center">Trusted by</p>
              <div className="flex items-center justify-center gap-6 flex-wrap">
                {['Acme Corp', 'TechFlow', 'DataVerse', 'CloudNine', 'StartupX'].map((name) => (
                  <div key={name} className="flex items-center gap-1.5 opacity-30 hover:opacity-50 transition-opacity">
                    <div className="w-5 h-5 rounded bg-muted-foreground/20 flex items-center justify-center">
                      <span className="text-[8px] font-bold text-muted-foreground/60">{name.charAt(0)}</span>
                    </div>
                    <span className="text-xs text-muted-foreground/40 font-semibold tracking-wider uppercase">{name}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Features Showcase Carousel */}
          <div className="mb-8">
            <div className="relative overflow-hidden rounded-xl border border-border/30 bg-card/40 backdrop-blur-sm">
              <AnimatePresence mode="wait">
                <motion.div
                  key={featureIndex}
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -40 }}
                  transition={{ duration: 0.4 }}
                  className="p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${FEATURE_SHOWCASE[featureIndex].gradient} flex items-center justify-center flex-shrink-0 shadow-lg`}>
                      {(() => {
                        const FIcon = FEATURE_SHOWCASE[featureIndex].icon
                        return <FIcon className="w-5 h-5 text-white" />
                      })()}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold">{FEATURE_SHOWCASE[featureIndex].title}</h4>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        {FEATURE_SHOWCASE[featureIndex].description}
                      </p>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
              {/* Carousel indicators */}
              <div className="flex items-center justify-center gap-1 pb-3">
                {FEATURE_SHOWCASE.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setFeatureIndex(i)}
                    className={`w-1.5 h-1.5 rounded-full transition-all ${
                      i === featureIndex ? 'bg-emerald-500 w-4' : 'bg-muted-foreground/30'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Rotating Testimonial */}
          <div className="relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={testimonialIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4 }}
                className="bg-card/60 backdrop-blur-sm border border-border/30 rounded-xl p-4 max-w-md"
              >
                <Quote className="w-4 h-4 text-emerald-500 mb-2" />
                <p className="text-sm text-muted-foreground italic leading-relaxed">
                  &ldquo;{TESTIMONIALS[testimonialIndex].quote}&rdquo;
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                    <span className="text-[9px] font-bold text-white">
                      {TESTIMONIALS[testimonialIndex].author.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs font-medium">{TESTIMONIALS[testimonialIndex].author}</span>
                    <span className="text-[10px] text-muted-foreground block">{TESTIMONIALS[testimonialIndex].role}</span>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
            {/* Dots indicator */}
            <div className="flex items-center gap-1 mt-3">
              {TESTIMONIALS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setTestimonialIndex(i)}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                    i === testimonialIndex ? 'bg-emerald-500 w-4' : 'bg-muted-foreground/30'
                  }`}
                />
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Right side - Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Mobile Logo (shown only on mobile) */}
          <div className="flex items-center justify-between mb-6 lg:hidden">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent">
                BuilderAI
              </span>
            </div>
            <ThemeToggle />
          </div>

          {/* AI Ready Badge with shimmer */}
          <div className="flex justify-center mb-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 animate-pulsing-ring animate-badge-shimmer"
            >
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="text-sm font-semibold">AI is ready</span>
              <Bot className="w-3.5 h-3.5" />
            </motion.div>
          </div>

          {/* Auth Card with animated gradient border */}
          <div className="animate-border-rotate rounded-lg">
          <Card className="border-0 bg-card/80 backdrop-blur-xl shadow-2xl shadow-black/5 dark:shadow-black/20">
            <Tabs value={activeTab} onValueChange={handleTabChange}>
              <CardHeader className="pb-4 pt-6 px-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold">
                      {activeTab === 'login' ? 'Welcome back' : 'Create account'}
                    </h2>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {activeTab === 'login'
                        ? 'Sign in to continue building'
                        : 'Start building with AI today'}
                    </p>
                  </div>
                  <div className="hidden sm:block">
                    <ThemeToggle />
                  </div>
                </div>
                <TabsList className="grid w-full grid-cols-2 h-10">
                  <TabsTrigger value="login" className="text-sm">Sign In</TabsTrigger>
                  <TabsTrigger value="register" className="text-sm">Sign Up</TabsTrigger>
                </TabsList>
              </CardHeader>
              <CardContent className="px-6 pb-6">
                <AnimatePresence mode="wait">
                  {activeTab === 'login' ? (
                    <motion.div
                      key="login"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ duration: 0.2 }}
                    >
                      <form onSubmit={handleLogin} className="space-y-4">
                        <div className="floating-label-group">
                          <Input
                            id="login-email"
                            type="email"
                            placeholder=" "
                            value={loginEmail}
                            onChange={(e) => setLoginEmail(e.target.value)}
                            className="h-11 sm:h-10 transition-all focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 min-h-[44px] sm:min-h-0"
                            required
                          />
                          <Label htmlFor="login-email">Email</Label>
                        </div>
                        <div className="floating-label-group">
                          <Input
                            id="login-password"
                            type="password"
                            placeholder=" "
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            className="h-11 sm:h-10 transition-all focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 min-h-[44px] sm:min-h-0"
                            required
                          />
                          <Label htmlFor="login-password">Password</Label>
                        </div>
                        {/* Remember me checkbox */}
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="remember-me"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            className="w-3.5 h-3.5 rounded border-border text-emerald-500 focus:ring-emerald-500/20 accent-emerald-500"
                          />
                          <Label htmlFor="remember-me" className="text-xs text-muted-foreground cursor-pointer">
                            Remember me
                          </Label>
                        </div>
                        <AnimatePresence>
                          {error && (
                            <motion.p
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="text-sm text-destructive"
                            >
                              {error}
                            </motion.p>
                          )}
                        </AnimatePresence>
                        <Button
                          type="submit"
                          className={`w-full h-10 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/25 transition-all hover:shadow-emerald-500/40 ${!isLoading ? 'animate-btn-shimmer' : ''}`}
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          ) : (
                            <ArrowRight className="w-4 h-4 mr-2" />
                          )}
                          Sign In
                        </Button>

                        {/* Social Login Buttons */}
                        <div className="relative my-3">
                          <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                          </div>
                          <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            className="h-9 text-xs relative overflow-hidden group"
                            onClick={() => toast.info('Google sign-in coming soon!')}
                          >
                            <svg className="w-3.5 h-3.5 mr-1.5" viewBox="0 0 24 24">
                              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                            </svg>
                            Google
                            <span className="absolute inset-0 bg-muted/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            className="h-9 text-xs relative overflow-hidden group"
                            onClick={() => toast.info('GitHub sign-in coming soon!')}
                          >
                            <Github className="w-3.5 h-3.5 mr-1.5" />
                            GitHub
                            <span className="absolute inset-0 bg-muted/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </Button>
                        </div>

                        <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                          <Keyboard className="w-3 h-3" />
                          <span>Press <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-[10px]">Enter</kbd> to submit</span>
                        </div>
                      </form>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="register"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.2 }}
                    >
                      <form onSubmit={handleRegister} className="space-y-4">
                        <div className="floating-label-group">
                          <Input
                            id="register-name"
                            type="text"
                            placeholder=" "
                            value={registerName}
                            onChange={(e) => setRegisterName(e.target.value)}
                            className="h-11 sm:h-10 transition-all focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 min-h-[44px] sm:min-h-0"
                            required
                          />
                          <Label htmlFor="register-name">Name</Label>
                        </div>
                        <div className="floating-label-group">
                          <Input
                            id="register-email"
                            type="email"
                            placeholder=" "
                            value={registerEmail}
                            onChange={(e) => setRegisterEmail(e.target.value)}
                            className="h-11 sm:h-10 transition-all focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 min-h-[44px] sm:min-h-0"
                            required
                          />
                          <Label htmlFor="register-email">Email</Label>
                        </div>
                        <div className="floating-label-group">
                          <Input
                            id="register-password"
                            type="password"
                            placeholder=" "
                            value={registerPassword}
                            onChange={(e) => setRegisterPassword(e.target.value)}
                            className="h-11 sm:h-10 transition-all focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 min-h-[44px] sm:min-h-0"
                            required
                            minLength={4}
                          />
                          <Label htmlFor="register-password">Password</Label>
                          <PasswordStrength password={registerPassword} />
                        </div>
                        <AnimatePresence>
                          {error && (
                            <motion.p
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="text-sm text-destructive"
                            >
                              {error}
                            </motion.p>
                          )}
                        </AnimatePresence>
                        <Button
                          type="submit"
                          className={`w-full h-10 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/25 transition-all hover:shadow-emerald-500/40 ${!isLoading ? 'animate-btn-shimmer' : ''}`}
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          ) : (
                            <Sparkles className="w-4 h-4 mr-2" />
                          )}
                          Create Account
                        </Button>

                        {/* Social Login Buttons */}
                        <div className="relative my-3">
                          <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                          </div>
                          <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            className="h-9 text-xs relative overflow-hidden group"
                            onClick={() => toast.info('Google sign-in coming soon!')}
                          >
                            <svg className="w-3.5 h-3.5 mr-1.5" viewBox="0 0 24 24">
                              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                            </svg>
                            Google
                            <span className="absolute inset-0 bg-muted/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            className="h-9 text-xs relative overflow-hidden group"
                            onClick={() => toast.info('GitHub sign-in coming soon!')}
                          >
                            <Github className="w-3.5 h-3.5 mr-1.5" />
                            GitHub
                            <span className="absolute inset-0 bg-muted/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </Button>
                        </div>

                        <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                          <Keyboard className="w-3 h-3" />
                          <span>Press <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-[10px]">Enter</kbd> to submit</span>
                        </div>
                      </form>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Terms hint */}
                <p className="text-[11px] text-muted-foreground text-center mt-4 leading-relaxed">
                  By continuing, you agree to our Terms of Service and Privacy Policy.
                </p>
              </CardContent>
            </Tabs>
          </Card>
          </div>

          {/* Bottom features (mobile visible) */}
          <div className="mt-6 grid grid-cols-3 gap-3">
            {[
              { icon: Globe, label: 'AI Agents' },
              { icon: Layers, label: 'Full-Stack' },
              { icon: Rocket, label: 'Deploy' },
            ].map((feature) => (
              <div
                key={feature.label}
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-card/60 backdrop-blur-sm border border-border/30"
              >
                <feature.icon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-medium text-muted-foreground">{feature.label}</span>
              </div>
            ))}
          </div>

          {/* Trusted by section */}
          <div className="mt-6 text-center">
            <p className="text-xs text-muted-foreground mb-3">Trusted by developers worldwide</p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              {TRUST_METRICS.map((metric) => (
                <div key={metric.label} className="flex items-center gap-1">
                  <Check className="w-3 h-3 text-emerald-500" />
                  <span className="text-xs font-medium">
                    {metric.value >= 1000 ? `${metric.value / 1000}K` : metric.value}{metric.suffix} {metric.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Desktop theme toggle (top right) */}
      <div className="hidden sm:block lg:hidden fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      {/* Floating Powered By Badge */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.5 }}
          className="glass-card flex items-center gap-2 px-3 py-1.5 rounded-full"
        >
          <Zap className="w-3 h-3 text-emerald-500" />
          <span className="text-[10px] text-muted-foreground">
            Powered by <span className="font-semibold gradient-text">BuilderAI</span> &amp; Next.js
          </span>
        </motion.div>
      </div>
    </div>
  )
}
