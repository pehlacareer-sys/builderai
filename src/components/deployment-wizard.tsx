'use client'

import { useState, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Rocket, CheckCircle2, XCircle, AlertCircle, Loader2,
  ChevronRight, Globe, Terminal, Plus, Trash2, ShieldCheck,
  FileCode, Package, BookOpen, Settings2, Clock, ArrowRight
} from 'lucide-react'
import { toast } from 'sonner'

interface DeploymentWizardProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectName: string
  files: { path: string; content: string }[]
}

type DeployStep = 'readiness' | 'config' | 'deploy'
type Platform = 'vercel' | 'netlify' | 'railway' | 'custom'

const PLATFORMS: { id: Platform; name: string; icon: React.ReactNode; color: string }[] = [
  { id: 'vercel', name: 'Vercel', icon: <TriangleIcon className="w-5 h-5" />, color: 'text-foreground' },
  { id: 'netlify', name: 'Netlify', icon: <Globe className="w-5 h-5 text-teal-500" />, color: 'text-teal-500' },
  { id: 'railway', name: 'Railway', icon: <TrainIcon className="w-5 h-5 text-purple-500" />, color: 'text-purple-500' },
  { id: 'custom', name: 'Custom', icon: <Settings2 className="w-5 h-5 text-muted-foreground" />, color: 'text-muted-foreground' },
]

function TriangleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 76 65" fill="currentColor" className={className}>
      <path d="M37.5274 0L75.0548 65H0L37.5274 0Z" />
    </svg>
  )
}

function TrainIcon({ className }: { className?: string }) {
  return <Terminal className={className} />
}

interface CheckItem {
  id: string
  label: string
  weight: number
  check: (files: { path: string; content: string }[]) => boolean
  detail: string
}

const CHECKS: CheckItem[] = [
  {
    id: 'package_json',
    label: 'Has package.json',
    weight: 20,
    check: (files) => files.some(f => f.path === 'package.json'),
    detail: 'Required for dependency management'
  },
  {
    id: 'next_config',
    label: 'Has Next.js config',
    weight: 15,
    check: (files) => files.some(f => f.path.includes('next.config')),
    detail: 'Build configuration file'
  },
  {
    id: 'app_dir',
    label: 'Has app directory',
    weight: 20,
    check: (files) => files.some(f => f.path.startsWith('app/') || f.path.startsWith('src/app/')),
    detail: 'App Router directory structure'
  },
  {
    id: 'readme',
    label: 'Has README.md',
    weight: 10,
    check: (files) => files.some(f => f.path.toLowerCase() === 'readme.md'),
    detail: 'Project documentation'
  },
  {
    id: 'tsconfig',
    label: 'Has tsconfig.json',
    weight: 15,
    check: (files) => files.some(f => f.path === 'tsconfig.json'),
    detail: 'TypeScript configuration'
  },
  {
    id: 'dependencies',
    label: 'Dependencies listed',
    weight: 10,
    check: (files) => {
      const pkg = files.find(f => f.path === 'package.json')
      if (!pkg) return false
      try {
        const json = JSON.parse(pkg.content)
        return Object.keys(json.dependencies || {}).length > 0
      } catch { return false }
    },
    detail: 'Package dependencies defined'
  },
  {
    id: 'env_docs',
    label: 'Environment documented',
    weight: 10,
    check: (files) => files.some(f => f.path.includes('.env') || f.path.includes('.env.example')),
    detail: 'Environment variables documented'
  },
]

export function DeploymentWizard({ open, onOpenChange, projectName, files }: DeploymentWizardProps) {
  const [step, setStep] = useState<DeployStep>('readiness')
  const [platform, setPlatform] = useState<Platform>('vercel')
  const [buildCommand, setBuildCommand] = useState('next build')
  const [outputDir, setOutputDir] = useState('.next')
  const [envVars, setEnvVars] = useState<{ key: string; value: string }[]>([])
  const [deploying, setDeploying] = useState(false)
  const [deployStage, setDeployStage] = useState(0)

  // Compute checks
  const checkResults = useMemo(() => {
    return CHECKS.map(check => ({
      ...check,
      passed: check.check(files)
    }))
  }, [files])

  const readinessScore = useMemo(() => {
    const total = checkResults.reduce((sum, c) => sum + c.weight, 0)
    const passed = checkResults.filter(c => c.passed).reduce((sum, c) => sum + c.weight, 0)
    return total > 0 ? Math.round((passed / total) * 100) : 0
  }, [checkResults])

  const readinessColor = readinessScore >= 80 ? 'text-emerald-500' : readinessScore >= 50 ? 'text-amber-500' : 'text-red-500'

  const handleDeploy = () => {
    setDeploying(true)
    setDeployStage(0)

    // Mock deployment stages
    setTimeout(() => setDeployStage(1), 1500)
    setTimeout(() => setDeployStage(2), 3500)
    setTimeout(() => {
      setDeploying(false)
      setDeployStage(0)
      toast.success('Deployment simulated successfully! 🚀', {
        description: 'Real deployment integration coming soon.'
      })
    }, 5500)
  }

  const resetWizard = () => {
    setStep('readiness')
    setDeploying(false)
    setDeployStage(0)
  }

  const addEnvVar = () => setEnvVars([...envVars, { key: '', value: '' }])
  const removeEnvVar = (idx: number) => setEnvVars(envVars.filter((_, i) => i !== idx))
  const updateEnvVar = (idx: number, field: 'key' | 'value', val: string) => {
    const updated = [...envVars]
    updated[idx][field] = val
    setEnvVars(updated)
  }

  // Deploy history (mock)
  const deployHistory = [
    { version: 'v1.2.0', date: '2h ago', duration: '45s', status: 'success' as const },
    { version: 'v1.1.0', date: '1d ago', duration: '52s', status: 'success' as const },
    { version: 'v1.0.0', date: '3d ago', duration: '1m 03s', status: 'failed' as const },
  ]

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetWizard(); onOpenChange(v) }}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Rocket className="w-5 h-5 text-emerald-500" />
            Deploy {projectName}
          </DialogTitle>
          <DialogDescription>
            Configure and deploy your project to production
          </DialogDescription>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 mb-4">
          {(['readiness', 'config', 'deploy'] as DeployStep[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <button
                onClick={() => !deploying && setStep(s)}
                className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${
                  step === s
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <span className="w-5 h-5 rounded-full border flex items-center justify-center text-[10px] font-bold ${
                  step === s ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-muted-foreground/30'
                }">
                  {i + 1}
                </span>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
              {i < 2 && <ChevronRight className="w-3 h-3 text-muted-foreground/40" />}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* Step 1: Readiness */}
          {step === 'readiness' && (
            <motion.div
              key="readiness"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              {/* Readiness Score */}
              <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/30 border border-border/50">
                <div className="relative w-20 h-20">
                  <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r="34" fill="none" stroke="currentColor" strokeWidth="6" className="text-muted/30" />
                    <circle
                      cx="40" cy="40" r="34" fill="none" stroke="currentColor" strokeWidth="6"
                      strokeDasharray={`${2 * Math.PI * 34}`}
                      strokeDashoffset={`${2 * Math.PI * 34 * (1 - readinessScore / 100)}`}
                      strokeLinecap="round"
                      className={readinessScore >= 80 ? 'text-emerald-500' : readinessScore >= 50 ? 'text-amber-500' : 'text-red-500'}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className={`text-xl font-bold ${readinessColor}`}>{readinessScore}%</span>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Deployment Readiness</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {readinessScore >= 80 ? 'Your project is ready to deploy!' : readinessScore >= 50 ? 'Almost ready, fix warnings for best results' : 'Several issues need attention'}
                  </p>
                </div>
              </div>

              {/* Check Items */}
              <div className="space-y-2">
                {checkResults.map((check) => (
                  <div
                    key={check.id}
                    className={`flex items-center gap-3 p-2.5 rounded-lg border transition-colors ${
                      check.passed
                        ? 'border-emerald-200 dark:border-emerald-900/30 bg-emerald-50/50 dark:bg-emerald-950/10'
                        : 'border-red-200 dark:border-red-900/30 bg-red-50/50 dark:bg-red-950/10'
                    }`}
                  >
                    {check.passed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{check.label}</p>
                      <p className="text-[11px] text-muted-foreground">{check.detail}</p>
                    </div>
                    <Badge variant="secondary" className="text-[9px] px-1.5">
                      {check.weight}%
                    </Badge>
                  </div>
                ))}
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={() => setStep('config')}
                  className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
                >
                  Next: Configuration
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 2: Configuration */}
          {step === 'config' && (
            <motion.div
              key="config"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              {/* Platform Selection */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">Platform</label>
                <div className="grid grid-cols-4 gap-2">
                  {PLATFORMS.map(p => (
                    <button
                      key={p.id}
                      onClick={() => setPlatform(p.id)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-all ${
                        platform === p.id
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 shadow-sm'
                          : 'border-border/50 hover:border-emerald-300 dark:hover:border-emerald-700'
                      }`}
                    >
                      <span className={platform === p.id ? 'text-emerald-600' : p.color}>{p.icon}</span>
                      <span className="text-[11px] font-medium">{p.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Build Settings */}
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Build Command</label>
                  <Input
                    value={buildCommand}
                    onChange={(e) => setBuildCommand(e.target.value)}
                    className="h-9 text-sm font-mono"
                    placeholder="next build"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Output Directory</label>
                  <Input
                    value={outputDir}
                    onChange={(e) => setOutputDir(e.target.value)}
                    className="h-9 text-sm font-mono"
                    placeholder=".next"
                  />
                </div>
              </div>

              {/* Environment Variables */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-muted-foreground">Environment Variables</label>
                  <Button variant="ghost" size="sm" className="h-6 text-[11px] text-emerald-600" onClick={addEnvVar}>
                    <Plus className="w-3 h-3 mr-1" /> Add
                  </Button>
                </div>
                <div className="space-y-2">
                  {envVars.map((env, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Input
                        value={env.key}
                        onChange={(e) => updateEnvVar(idx, 'key', e.target.value)}
                        className="h-8 text-xs font-mono"
                        placeholder="KEY"
                      />
                      <Input
                        value={env.value}
                        onChange={(e) => updateEnvVar(idx, 'value', e.target.value)}
                        className="h-8 text-xs font-mono"
                        placeholder="value"
                      />
                      <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => removeEnvVar(idx)}>
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </Button>
                    </div>
                  ))}
                  {envVars.length === 0 && (
                    <p className="text-[11px] text-muted-foreground/50 text-center py-2">No environment variables added</p>
                  )}
                </div>
              </div>

              <div className="flex justify-between">
                <Button variant="ghost" onClick={() => setStep('readiness')}>Back</Button>
                <Button
                  onClick={() => setStep('deploy')}
                  className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
                >
                  Next: Deploy
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Deploy */}
          {step === 'deploy' && (
            <motion.div
              key="deploy"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              {/* Deploy Button / Progress */}
              {!deploying ? (
                <div className="text-center py-6">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/25">
                    <Rocket className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold mb-1">Ready to Deploy</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Deploy to {PLATFORMS.find(p => p.id === platform)?.name}
                  </p>
                  <Button
                    onClick={handleDeploy}
                    size="lg"
                    className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg shadow-emerald-500/25"
                  >
                    <Rocket className="w-4 h-4 mr-2" />
                    Deploy Now
                  </Button>
                </div>
              ) : (
                <div className="space-y-4 py-4">
                  {/* Deploy Progress */}
                  {['Building project...', 'Optimizing assets...', 'Deploying to production...'].map((label, i) => (
                    <div key={i} className="flex items-center gap-3">
                      {deployStage > i ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                      ) : deployStage === i ? (
                        <Loader2 className="w-5 h-5 text-emerald-500 animate-spin flex-shrink-0" />
                      ) : (
                        <Clock className="w-5 h-5 text-muted-foreground/30 flex-shrink-0" />
                      )}
                      <span className={`text-sm ${deployStage >= i ? 'text-foreground' : 'text-muted-foreground/50'}`}>
                        {label}
                      </span>
                    </div>
                  ))}
                  <Progress value={(deployStage + 1) / 3 * 100} className="h-2" />
                </div>
              )}

              {/* Deploy History */}
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-2">Deploy History</h4>
                <div className="space-y-1.5">
                  {deployHistory.map((dep, i) => (
                    <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30 text-xs">
                      <span className="font-mono font-medium">{dep.version}</span>
                      <span className="text-muted-foreground">{dep.date}</span>
                      <span className="text-muted-foreground">{dep.duration}</span>
                      <Badge
                        variant="secondary"
                        className={`text-[9px] px-1.5 ml-auto ${
                          dep.status === 'success'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                        }`}
                      >
                        {dep.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-start">
                <Button variant="ghost" onClick={() => setStep('config')} disabled={deploying}>Back</Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  )
}
