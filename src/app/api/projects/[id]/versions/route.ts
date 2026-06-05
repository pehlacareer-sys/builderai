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

    const versions = await db.projectVersion.findMany({
      where: { projectId },
      orderBy: { version: 'desc' },
    })

    return NextResponse.json(
      { success: true, data: versions },
      { status: 200 }
    )
  } catch (error) {
    console.error('Get versions error:', error)
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
    const { description } = body

    const project = await db.project.findUnique({ where: { id: projectId, userId } })
    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      )
    }

    // Get current files for snapshot
    const files = await db.projectFile.findMany({
      where: { projectId },
      orderBy: { path: 'asc' },
    })

    const snapshot = JSON.stringify(
      files.map((f) => ({ path: f.path, content: f.content, language: f.language }))
    )

    // Get the latest version number
    const latestVersion = await db.projectVersion.findFirst({
      where: { projectId },
      orderBy: { version: 'desc' },
      select: { version: true },
    })

    const nextVersion = (latestVersion?.version || 0) + 1

    const version = await db.projectVersion.create({
      data: {
        projectId,
        version: nextVersion,
        description: description || `Version ${nextVersion}`,
        snapshot,
        status: 'created',
      },
    })

    return NextResponse.json(
      { success: true, data: version },
      { status: 201 }
    )
  } catch (error) {
    console.error('Create version error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
