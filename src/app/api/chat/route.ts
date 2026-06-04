import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'

// Lazy-initialize the ZAI SDK
let zai: Awaited<ReturnType<typeof ZAI.create>> | null = null

async function getZAI() {
  if (!zai) {
    zai = await ZAI.create()
  }
  return zai
}

const AGENT_CONFIG = {
  planner: {
    name: 'Planner',
    systemPrompt: `You are a senior software architect. Analyze the user's request and create a detailed implementation plan for a Next.js application. Consider architecture, components, routes, database schema, and user experience. Be specific about the files that need to be created and their purposes.`,
  },
  engineer: {
    name: 'Engineer',
    systemPrompt: `You are an expert Next.js/TypeScript engineer. Generate production-quality code based on the implementation plan. Use Next.js App Router, TypeScript, Tailwind CSS, and shadcn/ui components.

IMPORTANT: Output each code file using this exact format:

---FILE: path/to/file.tsx---
(file content here)
---END FILE---

Rules:
- Use 'use client' directive for client components
- Use TypeScript for all files
- Use Tailwind CSS for styling
- Import shadcn/ui components from '@/components/ui/...'
- Use proper TypeScript types and interfaces
- Follow Next.js App Router conventions
- Include proper error handling
- Make components responsive (mobile-first)
- Use semantic HTML with accessibility attributes
- All API routes should use NextResponse for responses
- Use Prisma Client via import { db } from '@/lib/db' for database operations

Generate ALL files needed for the feature to work completely. Do not leave placeholders or TODOs.`,
  },
  reviewer: {
    name: 'Reviewer',
    systemPrompt: `You are a senior code reviewer. Review the generated code for: bugs, security issues, performance problems, accessibility issues, and missing requirements. Provide specific, actionable feedback. Focus on the most important issues first.`,
  },
  qa: {
    name: 'QA',
    systemPrompt: `You are a QA engineer. Validate the implementation by checking: TypeScript types, component structure, responsive design, SEO requirements, and overall code quality. Provide a quality assessment with specific observations.`,
  },
  deployer: {
    name: 'Deployer',
    systemPrompt: `You are a DevOps engineer. Assess deployment readiness for a Vercel deployment. Check: environment variables needed, build configuration, API routes, database setup, and deployment steps. Provide a deployment checklist with specific steps.`,
  },
}

function parseFilesFromResponse(response: string): Array<{ path: string; content: string; language: string }> {
  const files: Array<{ path: string; content: string; language: string }> = []
  const fileRegex = /---FILE:\s*(.+?)---\n([\s\S]*?)---END FILE---/g
  let match

  while ((match = fileRegex.exec(response)) !== null) {
    const filePath = match[1].trim()
    const content = match[2].trim()
    const ext = filePath.split('.').pop()?.toLowerCase() || ''
    const languageMap: Record<string, string> = {
      tsx: 'typescript', ts: 'typescript', jsx: 'javascript', js: 'javascript',
      css: 'css', json: 'json', prisma: 'prisma', sql: 'sql', md: 'markdown',
      html: 'html', yaml: 'yaml', yml: 'yaml',
    }
    files.push({ path: filePath, content, language: languageMap[ext] || 'plaintext' })
  }

  return files
}

export async function POST(request: NextRequest) {
  try {
    const { message, projectId, conversationHistory = [] } = await request.json()

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    const sdk = await getZAI()

    // Create a TransformStream for SSE-like streaming
    const encoder = new TextEncoder()
    const stream = new TransformStream()
    const writer = stream.writable.getWriter()

    // Run the multi-agent pipeline asynchronously
    ;(async () => {
      try {
        let plannerResponse = ''
        let engineerResponse = ''
        let reviewerResponse = ''
        let qaResponse = ''
        let deployerResponse = ''

        const sendMessage = async (agent: string, status: string, data: string, done = false) => {
          await writer.write(encoder.encode(`data: ${JSON.stringify({ agent, status, data, done })}\n\n`))
        }

        // Step 1: Planner Agent
        await sendMessage('planner', 'thinking', '')
        const plannerMessages = [
          { role: 'assistant' as const, content: AGENT_CONFIG.planner.systemPrompt },
          ...conversationHistory.slice(-10),
          { role: 'user' as const, content: message },
        ]

        const plannerCompletion = await sdk.chat.completions.create({
          messages: plannerMessages,
          thinking: { type: 'disabled' },
        })
        plannerResponse = plannerCompletion.choices[0]?.message?.content || ''
        await sendMessage('planner', 'complete', plannerResponse)

        // Step 2: Engineer Agent
        await sendMessage('engineer', 'coding', '')
        const engineerPrompt = `Here is the implementation plan:\n\n${plannerResponse}\n\nNow generate the complete code implementation based on this plan. Remember to output each file using the ---FILE: path--- format.`
        const engineerMessages = [
          { role: 'assistant' as const, content: AGENT_CONFIG.engineer.systemPrompt },
          { role: 'user' as const, content: engineerPrompt },
        ]

        const engineerCompletion = await sdk.chat.completions.create({
          messages: engineerMessages,
          thinking: { type: 'disabled' },
        })
        engineerResponse = engineerCompletion.choices[0]?.message?.content || ''
        const generatedFiles = parseFilesFromResponse(engineerResponse)
        await sendMessage('engineer', 'complete', engineerResponse, false)

        // Send generated files
        if (generatedFiles.length > 0) {
          await writer.write(encoder.encode(`data: ${JSON.stringify({ type: 'files', files: generatedFiles })}\n\n`))
        }

        // Step 3: Reviewer Agent
        await sendMessage('reviewer', 'reviewing', '')
        const reviewerPrompt = `Here is the implementation plan:\n\n${plannerResponse}\n\nHere is the generated code:\n\n${engineerResponse}\n\nPlease review this code thoroughly.`
        const reviewerMessages = [
          { role: 'assistant' as const, content: AGENT_CONFIG.reviewer.systemPrompt },
          { role: 'user' as const, content: reviewerPrompt },
        ]

        const reviewerCompletion = await sdk.chat.completions.create({
          messages: reviewerMessages,
          thinking: { type: 'disabled' },
        })
        reviewerResponse = reviewerCompletion.choices[0]?.message?.content || ''
        await sendMessage('reviewer', 'complete', reviewerResponse)

        // Step 4: QA Agent
        await sendMessage('qa', 'testing', '')
        const qaPrompt = `Here is the generated code:\n\n${engineerResponse}\n\nHere is the code review:\n\n${reviewerResponse}\n\nPlease validate the implementation quality.`
        const qaMessages = [
          { role: 'assistant' as const, content: AGENT_CONFIG.qa.systemPrompt },
          { role: 'user' as const, content: qaPrompt },
        ]

        const qaCompletion = await sdk.chat.completions.create({
          messages: qaMessages,
          thinking: { type: 'disabled' },
        })
        qaResponse = qaCompletion.choices[0]?.message?.content || ''
        await sendMessage('qa', 'complete', qaResponse)

        // Step 5: Deployer Agent
        await sendMessage('deployer', 'preparing', '')
        const deployerPrompt = `Here is the project with the following files:\n${generatedFiles.map((f) => `- ${f.path} (${f.language})`).join('\n')}\n\nHere is the QA assessment:\n\n${qaResponse}\n\nPlease provide a deployment readiness checklist.`
        const deployerMessages = [
          { role: 'assistant' as const, content: AGENT_CONFIG.deployer.systemPrompt },
          { role: 'user' as const, content: deployerPrompt },
        ]

        const deployerCompletion = await sdk.chat.completions.create({
          messages: deployerMessages,
          thinking: { type: 'disabled' },
        })
        deployerResponse = deployerCompletion.choices[0]?.message?.content || ''
        await sendMessage('deployer', 'complete', deployerResponse)

        // Final summary
        await writer.write(encoder.encode(`data: ${JSON.stringify({
          type: 'complete',
          summary: `Pipeline completed: Plan ✓ | Code ✓ (${generatedFiles.length} files) | Review ✓ | QA ✓ | Deploy ✓`,
          files: generatedFiles,
        })}\n\n`))

      } catch (error: any) {
        await writer.write(encoder.encode(`data: ${JSON.stringify({ type: 'error', error: error.message || 'Unknown error' })}\n\n`))
      } finally {
        await writer.close()
      }
    })()

    return new Response(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
