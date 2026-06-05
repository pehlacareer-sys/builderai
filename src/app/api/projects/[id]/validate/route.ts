import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyToken, getTokenFromHeaders } from '@/lib/auth'

async function getAuthenticatedUserId(headers: Headers): Promise<string | null> {
  const token = getTokenFromHeaders(headers)
  if (!token) return null
  return verifyToken(token)
}

interface ValidationResult {
  status: 'pass' | 'fail' | 'warn'
  message: string
  details?: string
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

    const project = await db.project.findUnique({ where: { id: projectId, userId } })
    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      )
    }

    const files = await db.projectFile.findMany({
      where: { projectId },
    })

    const results: ValidationResult[] = []
    const filePaths = new Set(files.map((f) => f.path))
    const fileMap = new Map(files.map((f) => [f.path, f]))

    // Check for required files
    const requiredFiles = [
      { path: 'package.json', name: 'Package configuration' },
      { path: 'src/app/layout.tsx', name: 'Root layout' },
      { path: 'src/app/page.tsx', name: 'Home page' },
    ]

    for (const required of requiredFiles) {
      if (filePaths.has(required.path)) {
        results.push({
          status: 'pass',
          message: `${required.name} (${required.path}) exists`,
        })
      } else {
        results.push({
          status: 'fail',
          message: `${required.name} (${required.path}) is missing`,
          details: `Every Next.js project requires a ${required.path} file.`,
        })
      }
    }

    // Check for recommended files
    const recommendedFiles = [
      { path: 'tsconfig.json', name: 'TypeScript configuration' },
      { path: 'next.config.ts', name: 'Next.js configuration' },
      { path: 'src/app/globals.css', name: 'Global styles' },
    ]

    for (const recommended of recommendedFiles) {
      if (filePaths.has(recommended.path)) {
        results.push({
          status: 'pass',
          message: `${recommended.name} (${recommended.path}) exists`,
        })
      } else {
        results.push({
          status: 'warn',
          message: `${recommended.name} (${recommended.path}) is missing`,
          details: `It's recommended to have a ${recommended.path} file for a complete project.`,
        })
      }
    }

    // Validate package.json
    const packageJsonFile = fileMap.get('package.json')
    if (packageJsonFile) {
      try {
        const pkg = JSON.parse(packageJsonFile.content)

        if (pkg.name) {
          results.push({ status: 'pass', message: 'package.json has a name field' })
        } else {
          results.push({ status: 'warn', message: 'package.json is missing a name field' })
        }

        const requiredDeps = ['next', 'react', 'react-dom']
        const deps = { ...pkg.dependencies, ...pkg.devDependencies }
        for (const dep of requiredDeps) {
          if (deps[dep]) {
            results.push({
              status: 'pass',
              message: `Dependency "${dep}" is declared`,
            })
          } else {
            results.push({
              status: 'fail',
              message: `Dependency "${dep}" is missing from package.json`,
              details: `"${dep}" is a core Next.js dependency.`,
            })
          }
        }

        if (pkg.scripts?.build) {
          results.push({ status: 'pass', message: 'Build script is defined' })
        } else {
          results.push({
            status: 'warn',
            message: 'Build script is missing in package.json',
          })
        }
      } catch {
        results.push({
          status: 'fail',
          message: 'package.json is not valid JSON',
          details: 'The package.json file could not be parsed.',
        })
      }
    }

    // Validate tsconfig.json
    const tsconfigFile = fileMap.get('tsconfig.json')
    if (tsconfigFile) {
      try {
        const tsconfig = JSON.parse(tsconfigFile.content)
        if (tsconfig.compilerOptions?.strict) {
          results.push({
            status: 'pass',
            message: 'TypeScript strict mode is enabled',
          })
        } else {
          results.push({
            status: 'warn',
            message: 'TypeScript strict mode is not enabled',
            details: 'Enabling strict mode helps catch more type errors.',
          })
        }

        if (tsconfig.compilerOptions?.paths?.['@/*']) {
          results.push({
            status: 'pass',
            message: 'Path alias "@/*" is configured',
          })
        } else {
          results.push({
            status: 'warn',
            message: 'Path alias "@/*" is not configured',
            details: 'The "@/*" path alias is commonly used in Next.js projects.',
          })
        }
      } catch {
        results.push({
          status: 'fail',
          message: 'tsconfig.json is not valid JSON',
        })
      }
    }

    // Basic TypeScript/JSX validation on key files
    const codeFiles = files.filter(
      (f) => f.language === 'typescript' || f.language === 'javascript'
    )
    for (const file of codeFiles) {
      const content = file.content

      // Check for basic syntax issues
      const openBraces = (content.match(/\{/g) || []).length
      const closeBraces = (content.match(/\}/g) || []).length
      if (Math.abs(openBraces - closeBraces) > 1) {
        results.push({
          status: 'warn',
          message: `Possible unbalanced braces in ${file.path}`,
          details: `Found ${openBraces} opening and ${closeBraces} closing braces.`,
        })
      }

      const openParens = (content.match(/\(/g) || []).length
      const closeParens = (content.match(/\)/g) || []).length
      if (Math.abs(openParens - closeParens) > 1) {
        results.push({
          status: 'warn',
          message: `Possible unbalanced parentheses in ${file.path}`,
          details: `Found ${openParens} opening and ${closeParens} closing parentheses.`,
        })
      }

      // Check for common issues in component files
      if (file.path.includes('page.tsx') || file.path.includes('layout.tsx')) {
        if (!content.includes('export')) {
          results.push({
            status: 'fail',
            message: `No export found in ${file.path}`,
            details: 'Page and layout files must have a default export.',
          })
        }
      }
    }

    // Check for empty files
    const emptyFiles = files.filter((f) => f.content.trim().length === 0)
    for (const file of emptyFiles) {
      results.push({
        status: 'warn',
        message: `File ${file.path} is empty`,
        details: 'Empty files may indicate incomplete implementation.',
      })
    }

    // Summary
    const passCount = results.filter((r) => r.status === 'pass').length
    const failCount = results.filter((r) => r.status === 'fail').length
    const warnCount = results.filter((r) => r.status === 'warn').length

    return NextResponse.json(
      {
        success: true,
        data: {
          summary: {
            total: results.length,
            passed: passCount,
            failed: failCount,
            warnings: warnCount,
          },
          results,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Validate project error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
