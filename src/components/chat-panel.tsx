'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
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
  Copy, Check, ThumbsUp, ThumbsDown, RefreshCw, Clock
} from 'lucide-react'
import { ModelSelector } from '@/components/model-selector'
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts'
import { toast } from 'sonner'

const AGENT_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  planner: { icon: Brain, color: 'text-violet-500 bg-violet-50 dark:bg-violet-950/30', label: 'Planner' },
  engineer: { icon: Code2, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30', label: 'Engineer' },
  reviewer: { icon: ShieldCheck, color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/30', label: 'Reviewer' },
  qa: { icon: TestTube, color: 'text-sky-500 bg-sky-50 dark:bg-sky-950/30', label: 'QA' },
  deployer: { icon: Rocket, color: 'text-rose-500 bg-rose-50 dark:bg-rose-950/30', label: 'Deployer' },
  assistant: { icon: Bot, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30', label: 'AI' },
}

// Typing indicator: three bouncing dots
function TypingIndicator() {
  return (
    <div className="flex gap-2.5">
      <Avatar className="h-6 w-6 flex-shrink-0 mt-1">
        <AvatarFallback className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500 text-[10px]">
          <Bot className="w-3 h-3" />
        </AvatarFallback>
      </Avatar>
      <div className="inline-flex items-center gap-1 rounded-xl px-4 py-3 bg-muted/50">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-typing-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-typing-bounce" style={{ animationDelay: '200ms' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-typing-bounce" style={{ animationDelay: '400ms' }} />
      </div>
    </div>
  )
}

// Animated pipeline progress bar
function AgentStatusBar() {
  const { agentPipeline, isProcessing, currentAgent } = useChatStore()

  if (agentPipeline.length === 0 && !isProcessing) return null

  const pipelineOrder = ['planner', 'engineer', 'reviewer', 'qa', 'deployer']
  const completedCount = agentPipeline.filter(a => a.status === 'complete').length
  const totalCount = pipelineOrder.length
  const progress = (completedCount / totalCount) * 100

  return (
    <div className="border-t bg-muted/30 px-3 py-2">
      {/* Progress bar */}
      <div className="h-0.5 w-full bg-muted rounded-full mb-2 overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
      <div className="flex items-center gap-1.5 overflow-x-auto">
        <span className="text-[10px] font-medium text-muted-foreground whitespace-nowrap">Pipeline:</span>
        {pipelineOrder.map((agentKey) => {
          const config = AGENT_CONFIG[agentKey]
          const status = agentPipeline.find((a) => a.agent === agentKey)
          const isActive = currentAgent?.agent === agentKey
          const isDone = status?.status === 'complete'

          return (
            <motion.div
              key={agentKey}
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
              <config.icon className="w-2.5 h-2.5" />
              <span>{config.label}</span>
              {isActive && <Loader2 className="w-2.5 h-2.5 animate-spin" />}
              {isDone && <span className="text-[8px]">✓</span>}
            </motion.div>
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
  const { currentProject, addGeneratedFiles } = useProjectStore()
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (currentProject) {
      loadConversations(currentProject.id)
    }
  }, [currentProject, loadConversations])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isProcessing])

  useEffect(() => {
    if (generatedFiles.length > 0 && currentProject) {
      addGeneratedFiles(currentProject.id, generatedFiles)
    }
  }, [generatedFiles, currentProject, addGeneratedFiles])

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
          <Badge variant="outline" className="text-[9px] px-1 flex-shrink-0 border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400">
            <span className="relative flex h-1.5 w-1.5 mr-1">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
            </span>
            Online
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <ModelSelector />
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

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3 scroll-smooth">
        {messages.length === 0 && !isProcessing && (
          <div className="flex flex-col items-center justify-center h-full text-center">
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
                  className="w-full text-left px-3 py-2 text-xs rounded-lg border border-border/50 hover:border-emerald-300 dark:hover:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-all hover:shadow-sm group"
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

        {/* Typing indicator */}
        {isProcessing && messages.length > 0 && (
          <TypingIndicator />
        )}

        {/* Error */}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-destructive/10 text-destructive text-xs p-2.5 rounded-lg"
          >
            {error}
            <Button variant="ghost" size="sm" onClick={clearError} className="ml-2 h-5 text-[10px]">
              Dismiss
            </Button>
          </motion.div>
        )}

        {/* Generated files notification */}
        {generatedFiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 p-2.5 rounded-lg"
          >
            <div className="flex items-center gap-1.5 mb-1">
              <Code className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-xs font-medium text-emerald-800 dark:text-emerald-200">
                {generatedFiles.length} files generated
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {generatedFiles.map((f) => (
                <Badge key={f.path} variant="secondary" className="text-[9px] px-1 py-0">
                  {f.path}
                </Badge>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Agent Status Bar */}
      <AgentStatusBar />

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
