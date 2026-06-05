import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyToken, getTokenFromHeaders } from '@/lib/auth'

async function getAuthenticatedUserId(headers: Headers): Promise<string | null> {
  const token = getTokenFromHeaders(headers)
  if (!token) return null
  return verifyToken(token)
}

export async function GET(
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

    const project = await db.project.findUnique({ where: { id: projectId, userId } })
    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      )
    }

    const conversation = await db.conversation.findUnique({
      where: { id: conversationId, projectId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    })

    if (!conversation) {
      return NextResponse.json(
        { success: false, error: 'Conversation not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { success: true, data: conversation },
      { status: 200 }
    )
  } catch (error) {
    console.error('Get conversation error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
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

    const project = await db.project.findUnique({ where: { id: projectId, userId } })
    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      )
    }

    const existing = await db.conversation.findUnique({
      where: { id: conversationId, projectId },
    })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Conversation not found' },
        { status: 404 }
      )
    }

    await db.conversation.delete({ where: { id: conversationId } })

    return NextResponse.json(
      { success: true, data: { message: 'Conversation deleted successfully' } },
      { status: 200 }
    )
  } catch (error) {
    console.error('Delete conversation error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
