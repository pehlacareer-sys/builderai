'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Copy, Terminal as TerminalIcon } from 'lucide-react'
import { toast } from 'sonner'

interface TerminalPanelProps {
  projectId: string
  files: any[]
}

interface TerminalLine {
  type: 'input' | 'output' | 'error' | 'system'
  content: string
}

const PROMPT = 'builderai@project:~$'

const MOCK_FILES = [
  'src/',
  'src/app/',
  'src/app/page.tsx',
  'src/app/layout.tsx',
  'src/components/',
  'src/components/header.tsx',
  'src/components/footer.tsx',
  'src/lib/',
  'src/lib/utils.ts',
  'package.json',
  'tsconfig.json',
  'tailwind.config.ts',
  'README.md',
]

export function TerminalPanel({ projectId, files }: TerminalPanelProps) {
  const [lines, setLines] = useState<TerminalLine[]>([
    { type: 'system', content: `BuilderAI Terminal v1.0.0 — Project: ${projectId}` },
    { type: 'system', content: 'Type "help" for available commands.' },
    { type: 'output', content: '' },
  ])
  const [currentInput, setCurrentInput] = useState('')
  const [isBuilding, setIsBuilding] = useState(false)
  const [isDeploying, setIsDeploying] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom on new lines
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [lines])

  const addLines = useCallback((newLines: TerminalLine[]) => {
    setLines(prev => [...prev, ...newLines])
  }, [])

  const handleCommand = useCallback((cmd: string) => {
    const trimmed = cmd.trim().toLowerCase()
    const commandParts = cmd.trim().split(/\s+/)
    const command = commandParts[0].toLowerCase()

    // Add the input line
    addLines([{ type: 'input', content: `${PROMPT} ${cmd}` }])

    if (!trimmed) return

    switch (command) {
      case 'help':
        addLines([
          { type: 'output', content: 'Available commands:' },
          { type: 'output', content: '  help      - Show available commands' },
          { type: 'output', content: '  ls        - List project files' },
          { type: 'output', content: '  status    - Show project status' },
          { type: 'output', content: '  build     - Simulate a project build' },
          { type: 'output', content: '  deploy    - Simulate deployment' },
          { type: 'output', content: '  clear     - Clear terminal output' },
          { type: 'output', content: '  date      - Show current date/time' },
          { type: 'output', content: '  whoami    - Show current user' },
          { type: 'output', content: '' },
        ])
        break

      case 'ls': {
        const fileNames = files.length > 0
          ? files.map((f: any) => f.path || f.name)
          : MOCK_FILES
        addLines([
          { type: 'output', content: fileNames.join('\n') },
          { type: 'output', content: '' },
        ])
        break
      }

      case 'status':
        addLines([
          { type: 'output', content: 'Project Status:' },
          { type: 'output', content: `  ID:       ${projectId}` },
          { type: 'output', content: `  Files:    ${files.length}` },
          { type: 'output', content: '  Status:   Ready' },
          { type: 'output', content: `  Uptime:   ${Math.floor(Math.random() * 72 + 1)}h ${Math.floor(Math.random() * 59)}m` },
          { type: 'output', content: `  Memory:   ${(Math.random() * 256 + 64).toFixed(1)} MB` },
          { type: 'output', content: '' },
        ])
        break

      case 'build': {
        if (isBuilding) {
          addLines([{ type: 'error', content: 'Build already in progress...' }])
          break
        }
        setIsBuilding(true)
        addLines([{ type: 'system', content: 'Starting build...' }])

        const buildSteps = [
          { delay: 300, line: { type: 'output', content: '[1/5] Resolving dependencies...' } },
          { delay: 800, line: { type: 'output', content: '[2/5] Compiling TypeScript...' } },
          { delay: 600, line: { type: 'output', content: '[3/5] Bundling assets...' } },
          { delay: 500, line: { type: 'output', content: '[4/5] Optimizing output...' } },
          { delay: 400, line: { type: 'output', content: '[5/5] Generating build manifest...' } },
          { delay: 200, line: { type: 'system', content: 'Build completed successfully!' } },
          { delay: 100, line: { type: 'output', content: `  Output size: ${(Math.random() * 500 + 100).toFixed(1)} KB` } },
          { delay: 100, line: { type: 'output', content: `  Build time: ${(Math.random() * 3 + 1).toFixed(1)}s` } },
          { delay: 100, line: { type: 'output', content: '' } },
        ]

        buildSteps.forEach(({ delay, line }, i) => {
          setTimeout(() => {
            addLines([line])
            if (i === buildSteps.length - 1) {
              setIsBuilding(false)
            }
          }, delay)
        })
        break
      }

      case 'deploy': {
        if (isDeploying) {
          addLines([{ type: 'error', content: 'Deployment already in progress...' }])
          break
        }
        setIsDeploying(true)
        addLines([{ type: 'system', content: 'Starting deployment...' }])

        const deploySteps = [
          { delay: 500, line: { type: 'output', content: 'Validating build artifacts...' } },
          { delay: 800, line: { type: 'output', content: 'Uploading to CDN...' } },
          { delay: 1200, line: { type: 'output', content: 'Configuring edge functions...' } },
          { delay: 600, line: { type: 'output', content: 'Provisioning SSL certificate...' } },
          { delay: 400, line: { type: 'output', content: 'Running health checks...' } },
          { delay: 300, line: { type: 'system', content: 'Deployment successful!' } },
          { delay: 100, line: { type: 'output', content: `  URL: https://${projectId}.builderai.app` } },
          { delay: 100, line: { type: 'output', content: `  Region: us-east-1` } },
          { delay: 100, line: { type: 'output', content: '' } },
        ]

        deploySteps.forEach(({ delay, line }, i) => {
          setTimeout(() => {
            addLines([line])
            if (i === deploySteps.length - 1) {
              setIsDeploying(false)
            }
          }, delay)
        })
        break
      }

      case 'clear':
        setLines([])
        break

      case 'date':
        addLines([
          { type: 'output', content: new Date().toString() },
          { type: 'output', content: '' },
        ])
        break

      case 'whoami':
        addLines([
          { type: 'output', content: 'builderai-user' },
          { type: 'output', content: '' },
        ])
        break

      default:
        addLines([
          { type: 'error', content: `Command not found: ${commandParts[0]}. Type "help" for available commands.` },
          { type: 'output', content: '' },
        ])
    }
  }, [addLines, files, isBuilding, isDeploying, projectId])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleCommand(currentInput)
      setCurrentInput('')
    }
  }

  const handleCopy = async () => {
    const text = lines
      .map(l => l.type === 'input' ? l.content : l.content)
      .join('\n')
    try {
      await navigator.clipboard.writeText(text)
      toast.success('Terminal output copied')
    } catch {
      toast.error('Failed to copy')
    }
  }

  const handleFocusInput = () => {
    inputRef.current?.focus()
  }

  const getLineColor = (type: TerminalLine['type']) => {
    switch (type) {
      case 'input': return 'text-emerald-400'
      case 'output': return 'text-emerald-300/80'
      case 'error': return 'text-red-400'
      case 'system': return 'text-sky-400'
    }
  }

  return (
    <div className="h-full flex flex-col bg-gray-950 dark:bg-gray-950 text-emerald-400 font-mono text-xs">
      {/* Terminal Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-gray-900 border-b border-gray-800 flex-shrink-0">
        <div className="flex items-center gap-2">
          <TerminalIcon className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-emerald-400 text-xs font-medium">Terminal</span>
          {(isBuilding || isDeploying) && (
            <span className="flex items-center gap-1 text-amber-400">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              {isBuilding ? 'Building' : 'Deploying'}...
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-gray-500 hover:text-emerald-400 hover:bg-gray-800"
          onClick={handleCopy}
          title="Copy output"
        >
          <Copy className="w-3 h-3" />
        </Button>
      </div>

      {/* Terminal Output */}
      <ScrollArea className="flex-1">
        <div
          ref={scrollRef}
          className="p-3 cursor-text min-h-full"
          onClick={handleFocusInput}
        >
          {lines.map((line, i) => (
            <div
              key={i}
              className={`${getLineColor(line.type)} whitespace-pre-wrap break-all leading-5 ${
                line.type === 'input' ? 'font-semibold' : ''
              }`}
            >
              {line.content || '\u00A0'}
            </div>
          ))}

          {/* Input Line */}
          <div className="flex items-center text-emerald-400 font-semibold leading-5">
            <span className="flex-shrink-0">{PROMPT}&nbsp;</span>
            <input
              ref={inputRef}
              type="text"
              value={currentInput}
              onChange={(e) => setCurrentInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-transparent outline-none text-emerald-300 caret-emerald-400 font-mono text-xs"
              disabled={isBuilding || isDeploying}
              autoFocus
              spellCheck={false}
              autoComplete="off"
              autoCapitalize="off"
            />
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
