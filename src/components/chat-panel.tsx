'use client'

import { useRef, useEffect, useState, useCallback, useMemo } from 'react'
import { useChatStore, ChatMessage } from '@/stores/chat-store'
import { useProjectStore } from '@/stores/project-store'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import ReactMarkdown from 'react-markdown'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Send, StopCircle, Loader2, Bot, User, Sparkles,
  Brain, Code2, ShieldCheck, TestTube, Rocket,
  Plus, MessageSquare, Code, Keyboard,
  Copy, Check, ThumbsUp, ThumbsDown, RefreshCw,
  ChevronDown, FileCode, GitCompare, Download,
  Hash
} from 'lucide-react'
import { ModelSelector } from '@/components/model-selector'
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts'
import { toast } from 'sonner'
import { DiffDialog, FileDiff as FileDiffType } from '@/components/file-diff-viewer'

const AGENT_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  planner: { icon: Brain, color: 'text-violet-500 bg-violet-50 dark:bg-violet-950/30', label: 'Planner' },
  engineer: { icon: Code2, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30', label: 'Engineer' },
  reviewer: { icon: ShieldCheck, color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/30', label: 'Reviewer' },
  qa: { icon: TestTube, color: 'text-sky-500 bg-sky-50 dark:bg-sky-950/30', label: 'QA' },
  deployer: { icon: Rocket, color: 'text-rose-500 bg-rose-50 dark:bg-rose-950/30', label: 'Deployer' },
  assistant: { icon: Bot, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30', label: 'AI' },
}

// Wave/sound animation when AI is typing (like ChatGPT dots but more polished)
function WaveTypingIndicator({ agentKey }: { agentKey?: string }) {
  const agentLabel = agentKey ? AGENT_CONFIG[agentKey]?.label || 'AI' : 'AI'
  const agentColor = agentKey ? AGENT_CONFIG[agentKey]?.color || 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30' : 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30'

  return (
    <div className="flex gap-2.5">
      <Avatar className="h-6 w-6 flex-shrink-0 mt-1">
        <AvatarFallback className={`${agentColor} text-[10px]`}>
          <Bot className="w-3 h-3" />
        </AvatarFallback>
      </Avatar>
      <div className="inline-flex items-center gap-3 rounded-xl px-4 py-2.5 bg-muted/50">
        <span className={`text-[11px] font-medium ${agentColor.split(' ')[0]}`}>{agentLabel} is thinking</span>
        <div className="flex items-center gap-[3px]">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="w-[3px] rounded-full bg-emerald-500 animate-wave-bar"
              style={{
                height: '12px',
                animationDelay: `${i * 0.15}s`,
                animationDuration: `${0.6 + i * 0.1}s`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// Token counter component
function TokenCounter({ messages }: { messages: ChatMessage[] }) {
  const totalChars = messages.reduce((sum, m) => sum + m.content.length, 0)
  const estimatedTokens = Math.round(totalChars / 4)

  if (messages.length === 0) return null

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1 text-[9px] text-muted-foreground cursor-default">
            <Hash className="w-2.5 h-2.5" />
            <span>~{estimatedTokens.toLocaleString()} tokens</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-[10px]">
          Estimated {estimatedTokens.toLocaleString()} tokens (~4 chars/token) across {messages.length} messages
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// Vertical timeline agent pipeline visualization
function AgentPipelineTimeline() {
  const { agentPipeline, isProcessing, currentAgent } = useChatStore()

  if (agentPipeline.length === 0 && !isProcessing) return null

  const pipelineOrder = ['planner', 'engineer', 'reviewer', 'qa', 'deployer']
  const completedCount = agentPipeline.filter(a => a.status === 'complete').length
  const progress = (completedCount / pipelineOrder.length) * 100

  return (
    <div className="border-t bg-muted/30 px-3 py-2">
      {/* Progress bar */}
      <div className="h-0.5 w-full bg-muted rounded-full mb-2.5 overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
      {/* Vertical timeline pipeline */}
      <div className="flex items-center gap-0 overflow-x-auto">
        <span className="text-[10px] font-medium text-muted-foreground whitespace-nowrap mr-1.5">Pipeline:</span>
        {pipelineOrder.map((agentKey, i) => {
          const config = AGENT_CONFIG[agentKey]
          const status = agentPipeline.find((a) => a.agent === agentKey)
          const isActive = currentAgent?.agent === agentKey
          const isDone = status?.status === 'complete'

          return (
            <div key={agentKey} className="flex items-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] whitespace-nowrap transition-all ${
                  isActive
                    ? `${config.color} font-medium ring-1 ring-current/20`
                    : isDone
                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                <div className={`w-1.5 h-1.5 rounded-full ${
                  isActive ? 'bg-current animate-pulse' : isDone ? 'bg-emerald-500' : 'bg-muted-foreground/40'
                }`} />
                <span>{config.label}</span>
                {isActive && <Loader2 className="w-2.5 h-2.5 animate-spin" />}
                {isDone && <span className="text-[8px]">✓</span>}
              </motion.div>
              {/* Connecting line between agents */}
              {i < pipelineOrder.length - 1 && (
                <div className={`w-3 h-px mx-0.5 flex-shrink-0 transition-colors ${
                  isDone ? 'bg-emerald-400' : 'bg-muted-foreground/20'
                }`} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Message reactions (stored locally)
const messageReactions: Record<string, 'up' | 'down' | null> = {}

function MessageBubble({ message, isLastAiMessage, onRegenerate }: {
  message: ChatMessage
  isLastAiMessage: boolean
  onRegenerate?: () => void
}) {
  const isUser = message.role === 'user'
  const config = AGENT_CONFIG[message.role]
  const Icon = config?.icon || (isUser ? User : Bot)
  const [copied, setCopied] = useState(false)
  const [reaction, setReaction] = useState<'up' | 'down' | null>(messageReactions[message.id || ''] || null)
  const [showActions, setShowActions] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content)
    setCopied(true)
    toast.success('Copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleReaction = (type: 'up' | 'down') => {
    const newReaction = reaction === type ? null : type
    setReaction(newReaction)
    if (message.id) {
      messageReactions[message.id] = newReaction
    }
  }

  const formatTimestamp = (dateStr?: string) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-2.5 group ${isUser ? 'flex-row-reverse' : ''}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <Avatar className="h-6 w-6 flex-shrink-0 mt-1">
        <AvatarFallback className={isUser ? 'bg-primary text-primary-foreground text-[10px]' : `${config?.color || 'bg-muted'} text-[10px]`}>
          <Icon className="w-3 h-3" />
        </AvatarFallback>
      </Avatar>
      <div className={`flex-1 min-w-0 ${isUser ? 'text-right' : ''}`}>
        <div className="flex items-center gap-1.5 mb-0.5">
          {!isUser && (
            <span className="text-[10px] font-medium text-muted-foreground">
              {config?.label || 'AI'}
            </span>
          )}
          {message.createdAt && (
            <span className="text-[9px] text-muted-foreground/50">
              {formatTimestamp(message.createdAt)}
            </span>
          )}
        </div>
        <div
          className={`inline-block text-left rounded-xl px-3 py-2 text-sm max-w-full overflow-hidden ${
            isUser
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted/50'
          }`}
        >
          <div className="prose prose-sm dark:prose-invert max-w-none break-words
            [&_pre]:bg-background [&_pre]:rounded-lg [&_pre]:p-3 [&_pre]:overflow-x-auto [&_pre]:border [&_pre]:border-border/30
            [&_code]:text-xs [&_code]:bg-muted/50 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:before:content-none [&_code]:after:content-none
            [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:rounded-none
            [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm
            [&_table]:w-full [&_table]:border-collapse [&_th]:border [&_th]:p-1.5 [&_th]:text-xs [&_th]:bg-muted/30 [&_td]:border [&_td]:p-1.5 [&_td]:text-xs
            [&_ul]:list-disc [&_ol]:list-decimal [&_li]:text-xs
          ">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        </div>

        {/* Action buttons - show on hover for non-user messages */}
        {!isUser && showActions && (
          <motion.div
            initial={{ opacity: 0, y: -3 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex items-center gap-0.5 mt-1 ${isUser ? 'justify-end' : ''}`}
          >
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleCopy}
                    className="p-1 rounded-md hover:bg-muted transition-colors"
                  >
                    {copied ? (
                      <Check className="w-3 h-3 text-emerald-500" />
                    ) : (
                      <Copy className="w-3 h-3 text-muted-foreground" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-[10px]">Copy message</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => handleReaction('up')}
                    className={`p-1 rounded-md hover:bg-muted transition-colors ${reaction === 'up' ? 'text-emerald-500' : 'text-muted-foreground'}`}
                  >
                    <ThumbsUp className="w-3 h-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-[10px]">Helpful</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => handleReaction('down')}
                    className={`p-1 rounded-md hover:bg-muted transition-colors ${reaction === 'down' ? 'text-red-500' : 'text-muted-foreground'}`}
                  >
                    <ThumbsDown className="w-3 h-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-[10px]">Not helpful</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {isLastAiMessage && onRegenerate && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={onRegenerate}
                      className="p-1 rounded-md hover:bg-muted transition-colors text-muted-foreground"
                    >
                      <RefreshCw className="w-3 h-3" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-[10px]">Regenerate</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}

export function ChatPanel() {
  const {
    messages, isProcessing, currentConversation,
    conversations, generatedFiles, error,
    sendMessage, stopProcessing, createConversation,
    selectConversation, loadConversations,
    clearError,
  } = useChatStore()
  const { currentProject, addGeneratedFiles, files } = useProjectStore()
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const [showScrollBtn, setShowScrollBtn] = useState(false)
  const [scrollProgress, setScrollProgress] = useState(0)
  const [diffDialogOpen, setDiffDialogOpen] = useState(false)

  useEffect(() => {
    if (currentProject) {
      loadConversations(currentProject.id)
    }
  }, [currentProject, loadConversations])

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, isProcessing, scrollToBottom])

  // Detect when user scrolls up to show scroll-to-bottom button
  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight
    setShowScrollBtn(distanceFromBottom > 100)
    // Calculate scroll progress
    const maxScroll = scrollHeight - clientHeight
    const progress = maxScroll > 0 ? (scrollTop / maxScroll) * 100 : 0
    setScrollProgress(progress)
  }, [])

  // Compute file diffs for the diff viewer dialog
  const pendingDiffs: FileDiffType[] = useMemo(() => {
    if (generatedFiles.length === 0) return []
    return generatedFiles.map((genFile) => {
      const existingFile = files.find((f) => f.path === genFile.path)
      return {
        path: genFile.path,
        language: genFile.language || 'text',
        oldContent: existingFile ? existingFile.content : null,
        newContent: genFile.content,
      }
    })
  }, [generatedFiles, files])

  useEffect(() => {
    if (generatedFiles.length > 0 && currentProject) {
      addGeneratedFiles(currentProject.id, generatedFiles)
    }
  }, [generatedFiles, currentProject, addGeneratedFiles])

  // Handle accepting diffs
  const handleAcceptDiffs = useCallback((acceptedPaths: string[]) => {
    toast.success(`Applied ${acceptedPaths.length} file change${acceptedPaths.length !== 1 ? 's' : ''}`)
  }, [])

  const handleRejectDiffs = useCallback(() => {
    toast.info('File changes discarded')
  }, [])

  // Export conversation as markdown
  const handleExportChat = useCallback(() => {
    if (messages.length === 0) {
      toast.info('No messages to export')
      return
    }

    const title = currentConversation?.title || 'Chat Export'
    const date = new Date().toLocaleString()
    let markdown = `# ${title}\n\nExported on ${date}\n\n---\n\n`

    messages.forEach((msg) => {
      const config = AGENT_CONFIG[msg.role]
      const role = config?.label || (msg.role === 'user' ? 'You' : 'AI')
      const timestamp = msg.createdAt
        ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : ''

      markdown += `### ${role}${timestamp ? ` _${timestamp}_` : ''}\n\n`
      markdown += `${msg.content}\n\n---\n\n`
    })

    const blob = new Blob([markdown], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success('Chat exported as markdown')
  }, [messages, currentConversation])

  const handleSend = async () => {
    if (!input.trim() || !currentProject) return

    let convId = currentConversation?.id
    if (!convId) {
      const conv = await createConversation(currentProject.id, input.slice(0, 50))
      convId = conv.id
    }

    await sendMessage(currentProject.id, convId, input.trim())
    setInput('')
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Ctrl/Cmd + Enter sends message
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleSend()
      return
    }
    // Regular Enter also sends (unless shift held)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Global keyboard shortcut for Ctrl+Enter
  useKeyboardShortcuts({
    shortcuts: [
      {
        key: 'enter',
        ctrlKey: true,
        metaKey: true,
        description: 'Send chat message',
        category: 'chat',
        action: () => {
          if (input.trim() && currentProject && !isProcessing) {
            handleSend()
          }
        },
      },
    ],
  })

  const handleNewChat = async () => {
    if (!currentProject) return
    await createConversation(currentProject.id)
  }

  // Find last AI message index for regenerate
  const lastAiMessageIndex = messages.findLastIndex(m => m.role !== 'user')

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="border-b px-3 py-2 flex items-center justify-between bg-background/80 backdrop-blur-sm">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
          <span className="text-xs font-medium truncate">
            {currentConversation?.title || 'New Chat'}
          </span>
          <Badge variant="outline" className="text-[9px] px-1 flex-shrink-0 border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 animate-breathing">
            <span className="relative flex h-1.5 w-1.5 mr-1">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
            </span>
            Online
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          {/* Token Counter */}
          <TokenCounter messages={messages} />
          <div className="w-px h-3 bg-border mx-0.5" />
          <ModelSelector />
          {/* Export chat button */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleExportChat} title="Export chat as markdown">
                  <Download className="w-3 h-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-[10px]">Export as Markdown</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleNewChat} title="New Chat">
            <Plus className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Conversations List */}
      {conversations.length > 0 && (
        <div className="border-b px-3 py-1 flex gap-1 overflow-x-auto">
          {conversations.slice(0, 5).map((conv) => (
            <button
              key={conv.id}
              onClick={() => currentProject && selectConversation(currentProject.id, conv.id)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] whitespace-nowrap transition-colors ${
                currentConversation?.id === conv.id
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200'
                  : 'hover:bg-muted'
              }`}
            >
              <MessageSquare className="w-2.5 h-2.5" />
              {conv.title || 'Chat'}
            </button>
          ))}
        </div>
      )}

      {/* Messages Area - with subtle gradient background */}
      <div className="relative flex-1 overflow-hidden">
        {/* Scroll progress indicator */}
        <div className="scroll-progress-bar" style={{ width: `${scrollProgress}%` }} />
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/[0.02] via-transparent to-teal-500/[0.02] dark:from-emerald-500/[0.01] dark:to-teal-500/[0.01] pointer-events-none" />
        <div
          ref={scrollRef}
          className="h-full overflow-y-auto p-3 space-y-3 scroll-smooth relative"
          onScroll={handleScroll}
        >
          {messages.length === 0 && !isProcessing && (
            <div className="flex flex-col items-center justify-center h-full text-center relative">
              {/* Animated background pattern */}
              <div className="absolute inset-0 bg-dot-pattern opacity-40 pointer-events-none" />

              <div className="relative z-10">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 flex items-center justify-center mb-4 ring-1 ring-emerald-500/10">
                  <Bot className="w-8 h-8 text-emerald-500" />
                </div>
                <h3 className="text-lg font-semibold">AI Website Builder</h3>
                <p className="text-xs text-muted-foreground mt-1.5 max-w-xs leading-relaxed">
                  Describe what you want to build. Our AI agents will plan, code, review, test, and prepare your app for deployment.
                </p>
                <div className="mt-4 w-full max-w-xs space-y-2">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Try these prompts</p>
                  {[
                    { text: 'Build a blog with markdown support', icon: '📝' },
                    'Create an e-commerce landing page',
                    'Make a task management dashboard',
                    'Build a portfolio website with dark mode',
                  ].map((suggestion, i) => (
                    <button
                      key={i}
                      onClick={() => setInput(typeof suggestion === 'string' ? suggestion : suggestion.text)}
                      className="w-full text-left px-3 py-2 text-xs rounded-lg border border-border/50 hover:border-transparent suggestion-btn-gradient hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-all hover:shadow-sm group"
                    >
                      <Sparkles className="w-3 h-3 inline mr-1.5 text-emerald-500 group-hover:scale-110 transition-transform" />
                      {typeof suggestion === 'string' ? suggestion : suggestion.text}
                    </button>
                  ))}
                </div>

                {/* Command palette style hints */}
                <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/50 border border-border/30">
                    <Keyboard className="w-2.5 h-2.5" />
                    <kbd className="font-mono">Ctrl+Enter</kbd> to send
                  </span>
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/50 border border-border/30">
                    <kbd className="font-mono">Shift+Enter</kbd> new line
                  </span>
                </div>

                <div className="mt-4 flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  5 AI agents ready
                </div>
              </div>
            </div>
          )}

          <AnimatePresence>
            {messages.map((msg, i) => (
              <MessageBubble
                key={msg.id || i}
                message={msg}
                isLastAiMessage={i === lastAiMessageIndex && msg.role !== 'user'}
              />
            ))}
          </AnimatePresence>

          {/* Wave/sound typing indicator */}
          {isProcessing && messages.length > 0 && (
            <WaveTypingIndicator agentKey={useChatStore.getState().currentAgent?.agent} />
          )}

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-destructive/10 text-destructive text-xs p-2.5 rounded-lg"
            >
              {error}
              <Button variant="ghost" size="sm" onClick={clearError} className="ml-2 h-5 text-[10px] min-h-[44px] sm:min-h-0">
                Dismiss
              </Button>
            </motion.div>
          )}

          {/* Generated files notification with Review Changes button */}
          {generatedFiles.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 p-2.5 rounded-lg"
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <Code className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-xs font-medium text-emerald-800 dark:text-emerald-200">
                    {generatedFiles.length} files generated
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 text-[10px] px-2 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/30"
                  onClick={() => setDiffDialogOpen(true)}
                >
                  <GitCompare className="w-3 h-3 mr-1" />
                  Review Changes
                </Button>
              </div>
              <div className="flex flex-wrap gap-1">
                {generatedFiles.map((f) => (
                  <button
                    key={f.path}
                    onClick={() => {
                      // Try to select the file in the project store
                      const store = useProjectStore.getState()
                      const file = store.files.find(file => file.path === f.path)
                      if (file) {
                        store.selectFile(file.id)
                      }
                    }}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-mono bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors cursor-pointer border border-emerald-200/50 dark:border-emerald-800/50"
                  >
                    <FileCode className="w-2.5 h-2.5" />
                    {f.path}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        {/* Scroll to bottom button */}
        <AnimatePresence>
          {showScrollBtn && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={scrollToBottom}
              className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-background border shadow-md flex items-center justify-center hover:bg-muted transition-colors z-10"
              title="Scroll to bottom"
            >
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Agent Status Bar */}
      <AgentPipelineTimeline />

      {/* Diff Viewer Dialog */}
      <DiffDialog
        open={diffDialogOpen}
        onOpenChange={setDiffDialogOpen}
        fileDiffs={pendingDiffs}
        onAcceptAll={handleAcceptDiffs}
        onRejectAll={handleRejectDiffs}
      />

      {/* Input Area */}
      <div className="border-t p-2.5 bg-background/80 backdrop-blur-sm">
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <Textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isProcessing
                  ? 'AI agents are working...'
                  : 'Describe what you want to build...'
              }
              disabled={isProcessing}
              className="min-h-[40px] max-h-[100px] resize-none text-sm"
              rows={1}
            />
          </div>
          {isProcessing ? (
            <Button
              variant="destructive"
              size="icon"
              onClick={stopProcessing}
              className="h-10 w-10 flex-shrink-0"
            >
              <StopCircle className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSend}
              disabled={!input.trim()}
              className="h-10 w-10 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white flex-shrink-0 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all animate-pulse-glow disabled:animate-none disabled:shadow-none"
              size="icon"
            >
              <Send className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
