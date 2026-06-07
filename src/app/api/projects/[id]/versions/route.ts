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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // ── Authentication ──────────────────────────────────────────────────
    const userId = await getAuthenticatedUserId(request.headers)
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id: projectId } = await params
    const body = await request.json()
    const { versionId } = body

    if (!versionId) {
      return NextResponse.json(
        { success: false, error: 'versionId is required' },
        { status: 400 }
      )
    }

    // ── Ownership Verification ──────────────────────────────────────────
    const project = await db.project.findUnique({ where: { id: projectId, userId } })
    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found or access denied' },
        { status: 403 }
      )
    }

    // ── Find Target Version ─────────────────────────────────────────────
    const targetVersion = await db.projectVersion.findFirst({
      where: { id: versionId, projectId },
    })
    if (!targetVersion) {
      return NextResponse.json(
        { success: false, error: 'Version not found' },
        { status: 404 }
      )
    }

    // ── Automatic Backup Before Restore ─────────────────────────────────
    // Create a backup snapshot of the CURRENT state before overwriting
    const currentFiles = await db.projectFile.findMany({
      where: { projectId },
      orderBy: { path: 'asc' },
    })

    const backupSnapshot = JSON.stringify(
      currentFiles.map((f) => ({ path: f.path, content: f.content, language: f.language }))
    )

    const latestVersion = await db.projectVersion.findFirst({
      where: { projectId },
      orderBy: { version: 'desc' },
      select: { version: true },
    })

    const backupVersionNumber = (latestVersion?.version || 0) + 1

    await db.projectVersion.create({
      data: {
        projectId,
        version: backupVersionNumber,
        description: `Auto-backup before restoring v${targetVersion.version}`,
        snapshot: backupSnapshot,
        status: 'created',
      },
    })

    // ── Restore Operation ───────────────────────────────────────────────
    // Parse the target version's snapshot
    let snapshotFiles: Array<{ path: string; content: string; language?: string | null }>
    try {
      snapshotFiles = JSON.parse(targetVersion.snapshot)
    } catch {
      return NextResponse.json(
        { success: false, error: 'Version snapshot is corrupted' },
        { status: 400 }
      )
    }

    // Delete all existing files for this project
    await db.projectFile.deleteMany({
      where: { projectId },
    })

    // Recreate files from the snapshot
    for (const file of snapshotFiles) {
      await db.projectFile.create({
        data: {
          projectId,
          path: file.path,
          content: file.content,
          language: file.language || null,
        },
      })
    }

    // Mark the restored version
    await db.projectVersion.update({
      where: { id: targetVersion.id },
      data: { status: 'restored' },
    })

    return NextResponse.json(
      {
        success: true,
        data: {
          restoredVersion: targetVersion.version,
          backupVersion: backupVersionNumber,
          filesRestored: snapshotFiles.length,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Restore version error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
