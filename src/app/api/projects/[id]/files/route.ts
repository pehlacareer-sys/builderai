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

    const files = await db.projectFile.findMany({
      where: { projectId },
      orderBy: { path: 'asc' },
    })

    return NextResponse.json(
      { success: true, data: files },
      { status: 200 }
    )
  } catch (error) {
    console.error('Get files error:', error)
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
    const { path, content, language } = body

    if (!path || content === undefined) {
      return NextResponse.json(
        { success: false, error: 'Path and content are required' },
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

    // Determine language from file extension if not provided
    const resolvedLanguage = language || getLanguageFromPath(path)

    const file = await db.projectFile.upsert({
      where: {
        projectId_path: { projectId, path },
      },
      create: {
        projectId,
        path,
        content,
        language: resolvedLanguage,
      },
      update: {
        content,
        language: resolvedLanguage,
      },
    })

    return NextResponse.json(
      { success: true, data: file },
      { status: 200 }
    )
  } catch (error) {
    console.error('Create/update file error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function getLanguageFromPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() || ''
  const languageMap: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    json: 'json',
    css: 'css',
    scss: 'scss',
    html: 'html',
    md: 'markdown',
    mjs: 'javascript',
  }
  return languageMap[ext] || 'text'
}
