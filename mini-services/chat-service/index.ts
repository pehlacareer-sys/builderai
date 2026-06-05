import { createServer } from 'http'
import { Server, Socket } from 'socket.io'
import ZAI from 'z-ai-web-dev-sdk'
import {
  PLANNER_SYSTEM_PROMPT,
  PLANNER_AGENT_NAME,
  PLANNER_STATUS,
} from './agents/planner'
import {
  ENGINEER_SYSTEM_PROMPT,
  ENGINEER_AGENT_NAME,
  ENGINEER_STATUS,
  parseFilesFromResponse,
} from './agents/engineer'
import {
  REVIEWER_SYSTEM_PROMPT,
  REVIEWER_AGENT_NAME,
  REVIEWER_STATUS,
} from './agents/reviewer'
import {
  QA_SYSTEM_PROMPT,
  QA_AGENT_NAME,
  QA_STATUS,
} from './agents/qa'
import {
  DEPLOYER_SYSTEM_PROMPT,
  DEPLOYER_AGENT_NAME,
  DEPLOYER_STATUS,
} from './agents/deployer'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface ConversationState {
  messages: ChatMessage[]
  projectMemory: string
  isProcessing: boolean
  abortController: AbortController | null
}

interface ChatMessagePayload {
  projectId: string
  conversationId: string
  content: string
}

interface StreamStopPayload {
  conversationId: string
}

interface HistoryPayload {
  conversationId: string
}

interface GeneratedFile {
  path: string
  content: string
  language: string
}

// ─── In-Memory Store ──────────────────────────────────────────────────────────

const MAX_HISTORY_LENGTH = 20
const conversations = new Map<string, ConversationState>()

function getConversation(id: string): ConversationState {
  if (!conversations.has(id)) {
    conversations.set(id, {
      messages: [],
      projectMemory: '',
      isProcessing: false,
      abortController: null,
    })
  }
  return conversations.get(id)!
}

function trimMessages(messages: ChatMessage[]): ChatMessage[] {
  if (messages.length <= MAX_HISTORY_LENGTH) return messages
  // Keep the first message (if it's a system/context message) and the last 19
  return messages.slice(-MAX_HISTORY_LENGTH)
}

// ─── ZAI SDK Initialization ──────────────────────────────────────────────────

let zai: Awaited<ReturnType<typeof ZAI.create>> | null = null

async function getZAI() {
  if (!zai) {
    console.log('[ZAI] Initializing SDK...')
    zai = await ZAI.create()
    console.log('[ZAI] SDK initialized successfully')
  }
  return zai
}

// ─── Agent Orchestration ─────────────────────────────────────────────────────

async function runAgent(
  socket: Socket,
  conversationId: string,
  agentName: string,
  agentStatus: string,
  systemPrompt: string,
  messages: ChatMessage[],
  userMessage: string
): Promise<string> {
  // Emit agent status
  socket.emit('chat:agent:status', {
    conversationId,
    agent: agentName,
    status: agentStatus,
    message: `${agentName.charAt(0).toUpperCase() + agentName.slice(1)} is ${agentStatus}...`,
  })

  const sdk = await getZAI()

  const completionMessages = [
    { role: 'assistant' as const, content: systemPrompt },
    ...messages,
    { role: 'user' as const, content: userMessage },
  ]

  try {
    const completion = await sdk.chat.completions.create({
      messages: completionMessages,
      thinking: { type: 'disabled' },
    })

    const response = completion.choices[0]?.message?.content || ''

    // Stream the response in chunks for real-time feel
    const chunks = splitIntoChunks(response, 80)
    for (let i = 0; i < chunks.length; i++) {
      // Check if processing was stopped
      const conv = getConversation(conversationId)
      if (!conv.isProcessing) {
        socket.emit('chat:stream', {
          conversationId,
          chunk: '',
          agent: agentName,
          done: true,
        })
        return ''
      }

      socket.emit('chat:stream', {
        conversationId,
        chunk: chunks[i],
        agent: agentName,
        done: i === chunks.length - 1,
      })

      // Small delay between chunks for streaming effect
      if (i < chunks.length - 1) {
        await sleep(30)
      }
    }

    return response
  } catch (error: any) {
    console.error(`[Agent ${agentName}] Error:`, error)
    socket.emit('chat:error', {
      conversationId,
      error: `Agent ${agentName} failed: ${error.message || 'Unknown error'}`,
    })
    throw error
  }
}

/**
 * Split text into chunks, trying to break at word boundaries
 */
function splitIntoChunks(text: string, chunkSize: number): string[] {
  if (!text) return ['']
  if (text.length <= chunkSize) return [text]

  const chunks: string[] = []
  let remaining = text

  while (remaining.length > 0) {
    if (remaining.length <= chunkSize) {
      chunks.push(remaining)
      break
    }

    // Try to find a good break point (space, newline, etc.)
    let breakPoint = remaining.lastIndexOf(' ', chunkSize)
    if (breakPoint <= 0) {
      breakPoint = remaining.lastIndexOf('\n', chunkSize)
    }
    if (breakPoint <= 0) {
      breakPoint = chunkSize
    }

    chunks.push(remaining.slice(0, breakPoint))
    remaining = remaining.slice(breakPoint).trimStart()
  }

  return chunks
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ─── Multi-Agent Pipeline ────────────────────────────────────────────────────

async function runMultiAgentPipeline(
  socket: Socket,
  conversationId: string,
  userMessage: string
) {
  const conversation = getConversation(conversationId)
  conversation.isProcessing = true
  conversation.abortController = new AbortController()

  let plannerResponse = ''
  let engineerResponse = ''
  let reviewerResponse = ''
  let qaResponse = ''
  let deployerResponse = ''
  let generatedFiles: GeneratedFile[] = []

  try {
    // ── Step 1: Planner Agent ──────────────────────────────────────────
    const contextMessage = conversation.projectMemory
      ? `Project context from previous interactions:\n${conversation.projectMemory}\n\nNew user request: ${userMessage}`
      : userMessage

    plannerResponse = await runAgent(
      socket,
      conversationId,
      PLANNER_AGENT_NAME,
      PLANNER_STATUS,
      PLANNER_SYSTEM_PROMPT,
      conversation.messages,
      contextMessage
    )

    if (!conversation.isProcessing) return

    // ── Step 2: Engineer Agent ─────────────────────────────────────────
    const engineerPrompt = `Here is the implementation plan:\n\n${plannerResponse}\n\nNow generate the complete code implementation based on this plan. Remember to output each file using the ---FILE: path--- format.`

    engineerResponse = await runAgent(
      socket,
      conversationId,
      ENGINEER_AGENT_NAME,
      ENGINEER_STATUS,
      ENGINEER_SYSTEM_PROMPT,
      conversation.messages,
      engineerPrompt
    )

    if (!conversation.isProcessing) return

    // Parse generated files from engineer response
    generatedFiles = parseFilesFromResponse(engineerResponse)
    if (generatedFiles.length > 0) {
      socket.emit('chat:files:generated', {
        conversationId,
        files: generatedFiles,
      })
    }

    // ── Step 3: Reviewer Agent ─────────────────────────────────────────
    const reviewerPrompt = `Here is the implementation plan:\n\n${plannerResponse}\n\nHere is the generated code:\n\n${engineerResponse}\n\nPlease review this code thoroughly.`

    reviewerResponse = await runAgent(
      socket,
      conversationId,
      REVIEWER_AGENT_NAME,
      REVIEWER_STATUS,
      REVIEWER_SYSTEM_PROMPT,
      conversation.messages,
      reviewerPrompt
    )

    if (!conversation.isProcessing) return

    // ── Step 4: QA Agent ──────────────────────────────────────────────
    const qaPrompt = `Here is the generated code:\n\n${engineerResponse}\n\nHere is the code review:\n\n${reviewerResponse}\n\nPlease validate the implementation quality and provide a score.`

    qaResponse = await runAgent(
      socket,
      conversationId,
      QA_AGENT_NAME,
      QA_STATUS,
      QA_SYSTEM_PROMPT,
      conversation.messages,
      qaPrompt
    )

    if (!conversation.isProcessing) return

    // ── Step 5: Deployer Agent ────────────────────────────────────────
    const deployerPrompt = `Here is the project with the following files:\n${generatedFiles.map((f) => `- ${f.path} (${f.language})`).join('\n')}\n\nHere is the QA assessment:\n\n${qaResponse}\n\nPlease provide a deployment readiness checklist.`

    deployerResponse = await runAgent(
      socket,
      conversationId,
      DEPLOYER_AGENT_NAME,
      DEPLOYER_STATUS,
      DEPLOYER_SYSTEM_PROMPT,
      conversation.messages,
      deployerPrompt
    )

    if (!conversation.isProcessing) return

    // ── Update Conversation State ──────────────────────────────────────
    conversation.messages.push({ role: 'user', content: userMessage })
    conversation.messages.push({
      role: 'assistant',
      content: `## Plan\n${plannerResponse}\n\n## Implementation\n${engineerResponse}\n\n## Review\n${reviewerResponse}\n\n## QA\n${qaResponse}\n\n## Deployment\n${deployerResponse}`,
    })

    conversation.messages = trimMessages(conversation.messages)

    // Update project memory with key information
    conversation.projectMemory = `Last request: ${userMessage.slice(0, 200)}\nFiles generated: ${generatedFiles.map((f) => f.path).join(', ')}\nKey decisions: ${plannerResponse.slice(0, 500)}`

    // ── Emit Completion ────────────────────────────────────────────────
    const summary = `Pipeline completed: Plan ✓ | Code ✓ (${generatedFiles.length} files) | Review ✓ | QA ✓ | Deploy ✓`
    socket.emit('chat:complete', {
      conversationId,
      summary,
    })
  } catch (error: any) {
    console.error('[Pipeline] Error:', error)
    socket.emit('chat:error', {
      conversationId,
      error: error.message || 'An unexpected error occurred in the pipeline',
    })
  } finally {
    conversation.isProcessing = false
    conversation.abortController = null
  }
}

// ─── Socket.IO Server Setup ──────────────────────────────────────────────────

const httpServer = createServer()
const io = new Server(httpServer, {
  path: '/',
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
})

io.on('connection', (socket: Socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`)

  // ── Handle chat:message ────────────────────────────────────────────────
  socket.on('chat:message', async (data: ChatMessagePayload) => {
    const { projectId, conversationId, content } = data

    if (!conversationId || !content) {
      socket.emit('chat:error', {
        conversationId: conversationId || 'unknown',
        error: 'Missing required fields: conversationId and content',
      })
      return
    }

    const conversation = getConversation(conversationId)

    if (conversation.isProcessing) {
      socket.emit('chat:error', {
        conversationId,
        error: 'A request is already being processed for this conversation. Please wait or stop the current process.',
      })
      return
    }

    console.log(`[Chat] Message received for conversation ${conversationId}: ${content.slice(0, 100)}...`)

    // Run the multi-agent pipeline
    await runMultiAgentPipeline(socket, conversationId, content)
  })

  // ── Handle chat:stream:stop ────────────────────────────────────────────
  socket.on('chat:stream:stop', (data: StreamStopPayload) => {
    const { conversationId } = data
    const conversation = getConversation(conversationId)

    if (conversation.isProcessing) {
      console.log(`[Chat] Stopping stream for conversation ${conversationId}`)
      conversation.isProcessing = false
      if (conversation.abortController) {
        conversation.abortController.abort()
      }
      socket.emit('chat:stream', {
        conversationId,
        chunk: '',
        agent: 'system',
        done: true,
      })
      socket.emit('chat:complete', {
        conversationId,
        summary: 'Stream stopped by user',
      })
    }
  })

  // ── Handle chat:history ────────────────────────────────────────────────
  socket.on('chat:history', (data: HistoryPayload) => {
    const { conversationId } = data
    const conversation = getConversation(conversationId)

    console.log(`[Chat] History requested for conversation ${conversationId}: ${conversation.messages.length} messages`)

    socket.emit('chat:history', {
      conversationId,
      messages: conversation.messages,
      projectMemory: conversation.projectMemory,
    })
  })

  // ── Handle Disconnect ──────────────────────────────────────────────────
  socket.on('disconnect', (reason) => {
    console.log(`[Socket] Client disconnected: ${socket.id} (${reason})`)
  })

  // ── Handle Errors ──────────────────────────────────────────────────────
  socket.on('error', (error) => {
    console.error(`[Socket] Error on ${socket.id}:`, error)
  })
})

// ─── Start Server ─────────────────────────────────────────────────────────────

const PORT = 3003
httpServer.listen(PORT, () => {
  console.log(`[Chat Service] WebSocket server running on port ${PORT}`)
  console.log(`[Chat Service] Multi-agent pipeline: Planner → Engineer → Reviewer → QA → Deployer`)
})

// Keep process alive
process.stdin.resume()

// Prevent the process from exiting due to unhandled promise rejections
process.on('unhandledRejection', (reason) => {
  console.error('[Chat Service] Unhandled Rejection:', reason)
})

// ─── Graceful Shutdown ────────────────────────────────────────────────────────

process.on('SIGTERM', () => {
  console.log('[Chat Service] Received SIGTERM, shutting down...')
  io.close()
  httpServer.close(() => {
    console.log('[Chat Service] Server closed')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('[Chat Service] Received SIGINT, shutting down...')
  io.close()
  httpServer.close(() => {
    console.log('[Chat Service] Server closed')
    process.exit(0)
  })
})
