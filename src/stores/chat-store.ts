import { create } from 'zustand'
import { api } from '@/lib/api'

export interface ChatMessage {
  id?: string
  role: 'user' | 'assistant' | 'system' | 'planner' | 'engineer' | 'reviewer' | 'qa' | 'deployer'
  content: string
  metadata?: string
  createdAt?: string
}

export interface AgentStatus {
  agent: string
  status: string
  message: string
}

export interface Conversation {
  id: string
  projectId: string
  title: string | null
  messages: ChatMessage[]
  createdAt: string
  updatedAt: string
}

const DEFAULT_MODEL = 'gpt-4o'

function getInitialModel(): string {
  if (typeof window === 'undefined') return DEFAULT_MODEL
  try {
    const stored = localStorage.getItem('builderai-selected-model')
    return stored || DEFAULT_MODEL
  } catch {
    return DEFAULT_MODEL
  }
}

interface ChatState {
  conversations: Conversation[]
  currentConversation: Conversation | null
  messages: ChatMessage[]
  currentAgent: AgentStatus | null
  agentPipeline: AgentStatus[]
  generatedFiles: Array<{ path: string; content: string; language: string }>
  isProcessing: boolean
  error: string | null
  selectedModel: string

  loadConversations: (projectId: string) => Promise<void>
  createConversation: (projectId: string, title?: string) => Promise<Conversation>
  selectConversation: (projectId: string, conversationId: string) => Promise<void>
  deleteConversation: (projectId: string, conversationId: string) => Promise<void>
  sendMessage: (projectId: string, conversationId: string, content: string) => Promise<void>
  stopProcessing: () => void
  clearCurrentConversation: () => void
  clearError: () => void
  setModel: (model: string) => void
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  currentConversation: null,
  messages: [],
  currentAgent: null,
  agentPipeline: [],
  generatedFiles: [],
  isProcessing: false,
  error: null,
  selectedModel: DEFAULT_MODEL,
  abortController: null as AbortController | null,

  loadConversations: async (projectId) => {
    try {
      const conversations = await api.getConversations(projectId)
      set({ conversations })
    } catch (error: any) {
      set({ error: error.message })
    }
  },

  createConversation: async (projectId, title) => {
    const conversation = await api.createConversation(projectId, title || 'New Chat')
    set((state) => ({
      conversations: [conversation, ...state.conversations],
      currentConversation: conversation,
      messages: [],
      agentPipeline: [],
      generatedFiles: [],
    }))
    return conversation
  },

  selectConversation: async (projectId, conversationId) => {
    try {
      const conversation = await api.getConversation(projectId, conversationId)
      set({
        currentConversation: conversation,
        messages: conversation.messages || [],
        agentPipeline: [],
        generatedFiles: [],
      })
    } catch (error: any) {
      set({ error: error.message })
    }
  },

  deleteConversation: async (projectId, conversationId) => {
    try {
      await api.deleteConversation(projectId, conversationId)
      set((state) => ({
        conversations: state.conversations.filter((c) => c.id !== conversationId),
        currentConversation: state.currentConversation?.id === conversationId ? null : state.currentConversation,
        messages: state.currentConversation?.id === conversationId ? [] : state.messages,
      }))
    } catch (error: any) {
      set({ error: error.message })
    }
  },

  sendMessage: async (projectId, conversationId, content) => {
    const { isProcessing } = get()
    if (isProcessing) {
      set({ error: 'Already processing a message' })
      return
    }

    // Add user message immediately
    set((state) => ({
      messages: [
        ...state.messages,
        { role: 'user' as const, content, createdAt: new Date().toISOString() },
      ],
      isProcessing: true,
      agentPipeline: [],
      generatedFiles: [],
      error: null,
    }))

    // Persist user message
    api.addMessage(projectId, conversationId, 'user', content).catch(console.error)

    const abortController = new AbortController()
    set({ abortController } as any)

    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          message: content,
          projectId,
          model: get().selectedModel,
          conversationHistory: get().messages.filter(m => m.role !== 'system').slice(-10),
        }),
        signal: abortController.signal,
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))

              if (data.type === 'files') {
                set({ generatedFiles: data.files })
              } else if (data.type === 'complete') {
                // Pipeline complete
                set({ isProcessing: false, currentAgent: null })

                // Use get() to access current messages (state is not in scope outside set callback)
                const currentMessages = get().messages

                // Persist all agent messages that haven't been persisted yet
                const agentMessages = currentMessages.filter(m =>
                  ['planner', 'engineer', 'reviewer', 'qa', 'deployer'].includes(m.role)
                )
                for (const msg of agentMessages) {
                  api.addMessage(projectId, conversationId, msg.role, msg.content).catch(console.error)
                }

                // Add a final assistant summary message
                const summary = data.summary || 'Pipeline completed successfully'
                set((state) => ({
                  messages: [
                    ...state.messages,
                    {
                      role: 'assistant' as const,
                      content: summary,
                      createdAt: new Date().toISOString(),
                    },
                  ],
                }))

                // Persist the assistant summary message
                api.addMessage(projectId, conversationId, 'assistant', summary).catch(console.error)
              } else if (data.type === 'error') {
                set({
                  error: data.error,
                  isProcessing: false,
                })
              } else if (data.agent && data.status === 'thinking') {
                // Agent starting
                set((state) => {
                  const newPipeline = [...state.agentPipeline]
                  const idx = newPipeline.findIndex(a => a.agent === data.agent)
                  const statusObj = { agent: data.agent, status: data.status, message: `${data.agent} is thinking...` }
                  if (idx >= 0) newPipeline[idx] = statusObj
                  else newPipeline.push(statusObj)
                  return { currentAgent: statusObj, agentPipeline: newPipeline }
                })
              } else if (data.agent && data.status === 'complete' && data.data) {
                // Agent completed with response
                set((state) => {
                  const newPipeline = [...state.agentPipeline]
                  const idx = newPipeline.findIndex(a => a.agent === data.agent)
                  const statusObj = { agent: data.agent, status: 'complete', message: `${data.agent} ✓` }
                  if (idx >= 0) newPipeline[idx] = statusObj
                  else newPipeline.push(statusObj)

                  return {
                    currentAgent: statusObj,
                    agentPipeline: newPipeline,
                    messages: [
                      ...state.messages,
                      {
                        role: data.agent as ChatMessage['role'],
                        content: data.data,
                        createdAt: new Date().toISOString(),
                      },
                    ],
                  }
                })
              }
            } catch {
              // Ignore JSON parse errors for incomplete chunks
            }
          }
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        set({ isProcessing: false })
      } else {
        set({
          error: error.message || 'Failed to send message',
          isProcessing: false,
        })
      }
    }
  },

  stopProcessing: () => {
    const { abortController } = get() as any
    if (abortController) {
      abortController.abort()
    }
    set({ isProcessing: false })
  },

  clearCurrentConversation: () => {
    set({
      currentConversation: null,
      messages: [],
      agentPipeline: [],
      generatedFiles: [],
    })
  },

  clearError: () => set({ error: null }),

  setModel: (model: string) => set({ selectedModel: model }),
}))
