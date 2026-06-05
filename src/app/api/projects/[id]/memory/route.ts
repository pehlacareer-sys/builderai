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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getAuthenticatedUserId(request.headers)
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id: projectId } = await params

    const project = await db.project.findUnique({ where: { id: projectId, userId } })
    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      )
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')

    const memories = await db.projectMemory.findMany({
      where: {
        projectId,
        ...(type ? { type } : {}),
      },
      orderBy: { updatedAt: 'desc' },
    })

    return NextResponse.json(
      { success: true, data: memories },
      { status: 200 }
    )
  } catch (error) {
    console.error('Get memories error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getAuthenticatedUserId(request.headers)
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id: projectId } = await params
    const body = await request.json()
    const { type, key, value } = body

    if (!type || !key || value === undefined) {
      return NextResponse.json(
        { success: false, error: 'Type, key, and value are required' },
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

    const memory = await db.projectMemory.upsert({
      where: {
        projectId_type_key: { projectId, type, key },
      },
      create: {
        projectId,
        type,
        key,
        value,
      },
      update: {
        value,
      },
    })

    return NextResponse.json(
      { success: true, data: memory },
      { status: 200 }
    )
  } catch (error) {
    console.error('Create/update memory error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getAuthenticatedUserId(request.headers)
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id: projectId } = await params
    const body = await request.json()
    const { type, key } = body

    if (!type || !key) {
      return NextResponse.json(
        { success: false, error: 'Type and key are required' },
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

    const existing = await db.projectMemory.findUnique({
      where: {
        projectId_type_key: { projectId, type, key },
      },
    })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Memory entry not found' },
        { status: 404 }
      )
    }

    await db.projectMemory.delete({
      where: {
        projectId_type_key: { projectId, type, key },
      },
    })

    return NextResponse.json(
      { success: true, data: { message: 'Memory entry deleted successfully' } },
      { status: 200 }
    )
  } catch (error) {
    console.error('Delete memory error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
