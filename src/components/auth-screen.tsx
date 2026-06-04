'use client'

import { useState } from 'react'
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
  Code2, Shield, Globe, Keyboard, Check
} from 'lucide-react'

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

const TRUST_METRICS = [
  { value: '10K+', label: 'Projects Built' },
  { value: '50K+', label: 'Files Generated' },
  { value: '99.9%', label: 'Uptime' },
]

export function AuthScreen() {
  const { login, register, isLoading, error, clearError } = useAuthStore()
  const [activeTab, setActiveTab] = useState('login')
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [registerName, setRegisterName] = useState('')
  const [registerEmail, setRegisterEmail] = useState('')
  const [registerPassword, setRegisterPassword] = useState('')

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
      </div>

      {/* Left side - Marketing / Hero (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative z-10 flex-col justify-center px-12 xl:px-20">
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

          {/* Hero Text */}
          <h1 className="text-4xl xl:text-5xl font-bold tracking-tight leading-tight mb-4">
            Build websites with
            <br />
            <span className="bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent">
              AI superpowers
            </span>
          </h1>
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
                className="flex items-start gap-3"
              >
                <div className={`p-2 rounded-lg ${feature.color} flex-shrink-0`}>
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

          {/* Trust Metrics */}
          <div className="flex items-center gap-8">
            {TRUST_METRICS.map((metric) => (
              <div key={metric.label}>
                <div className="text-2xl font-bold">{metric.value}</div>
                <div className="text-xs text-muted-foreground">{metric.label}</div>
              </div>
            ))}
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

          {/* Auth Card */}
          <Card className="border border-border/50 bg-card/80 backdrop-blur-xl shadow-2xl shadow-black/5 dark:shadow-black/20">
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
                        <div className="space-y-2">
                          <Label htmlFor="login-email">Email</Label>
                          <Input
                            id="login-email"
                            type="email"
                            placeholder="you@example.com"
                            value={loginEmail}
                            onChange={(e) => setLoginEmail(e.target.value)}
                            className="h-10"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="login-password">Password</Label>
                          <Input
                            id="login-password"
                            type="password"
                            placeholder="••••••••"
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            className="h-10"
                            required
                          />
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
                          className="w-full h-10 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/25"
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          ) : (
                            <ArrowRight className="w-4 h-4 mr-2" />
                          )}
                          Sign In
                        </Button>
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
                        <div className="space-y-2">
                          <Label htmlFor="register-name">Name</Label>
                          <Input
                            id="register-name"
                            type="text"
                            placeholder="Your name"
                            value={registerName}
                            onChange={(e) => setRegisterName(e.target.value)}
                            className="h-10"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="register-email">Email</Label>
                          <Input
                            id="register-email"
                            type="email"
                            placeholder="you@example.com"
                            value={registerEmail}
                            onChange={(e) => setRegisterEmail(e.target.value)}
                            className="h-10"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="register-password">Password</Label>
                          <Input
                            id="register-password"
                            type="password"
                            placeholder="••••••••"
                            value={registerPassword}
                            onChange={(e) => setRegisterPassword(e.target.value)}
                            className="h-10"
                            required
                            minLength={4}
                          />
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
                          className="w-full h-10 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/25"
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          ) : (
                            <Sparkles className="w-4 h-4 mr-2" />
                          )}
                          Create Account
                        </Button>
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
            <div className="flex items-center justify-center gap-4">
              {TRUST_METRICS.map((metric) => (
                <div key={metric.label} className="flex items-center gap-1">
                  <Check className="w-3 h-3 text-emerald-500" />
                  <span className="text-xs font-medium">{metric.value} {metric.label}</span>
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
    </div>
  )
}
