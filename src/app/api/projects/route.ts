import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyToken, getTokenFromHeaders } from '@/lib/auth'
import { getDefaultTemplateFiles } from '@/lib/templates'

async function getAuthenticatedUserId(headers: Headers): Promise<string | null> {
  const token = getTokenFromHeaders(headers)
  if (!token) return null
  return verifyToken(token)
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request.headers)
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const projects = await db.project.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    })

    return NextResponse.json(
      { success: true, data: projects },
      { status: 200 }
    )
  } catch (error) {
    console.error('Get projects error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request.headers)
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { name, description, framework, template } = body

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Project name is required' },
        { status: 400 }
      )
    }

    const project = await db.project.create({
      data: {
        name,
        description: description || null,
        framework: framework || 'nextjs',
        template: template || null,
        status: 'draft',
        userId,
      },
    })

    // Create default template files
    const templateFiles = getDefaultTemplateFiles()
    await db.projectFile.createMany({
      data: templateFiles.map((file) => ({
        projectId: project.id,
        path: file.path,
        content: file.content,
        language: file.language,
      })),
    })

    // Fetch project with files
    const projectWithFiles = await db.project.findUnique({
      where: { id: project.id },
      include: { files: true },
    })

    return NextResponse.json(
      { success: true, data: projectWithFiles },
      { status: 201 }
    )
  } catch (error) {
    console.error('Create project error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
