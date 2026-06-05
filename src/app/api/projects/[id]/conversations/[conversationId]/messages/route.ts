import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyToken, getTokenFromHeaders } from '@/lib/auth'

async function getAuthenticatedUserId(headers: Headers): Promise<string | null> {
  const token = getTokenFromHeaders(headers)
  if (!token) return null
  return verifyToken(token)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; conversationId: string }> }
) {
  try {
    const userId = await getAuthenticatedUserId(request.headers)
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id: projectId, conversationId } = await params
    const body = await request.json()
    const { role, content, metadata } = body

    if (!role || !content) {
      return NextResponse.json(
        { success: false, error: 'Role and content are required' },
        { status: 400 }
      )
    }

    const project = await db.project.findUnique({ where: { id: projectId, userId } })
    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      )
    }

    const conversation = await db.conversation.findUnique({
      where: { id: conversationId, projectId },
    })
    if (!conversation) {
      return NextResponse.json(
        { success: false, error: 'Conversation not found' },
        { status: 404 }
      )
    }

    const message = await db.message.create({
      data: {
        conversationId,
        role,
        content,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    })

    return NextResponse.json(
      { success: true, data: message },
      { status: 201 }
    )
  } catch (error) {
    console.error('Create message error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
