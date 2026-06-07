import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyPassword, generateToken, hashPassword } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      )
    }

    const user = await db.user.findUnique({ where: { email } })
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    const { valid, needsMigration } = await verifyPassword(password, user.password)
    if (!valid) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Migrate legacy Base64 password to bcrypt on successful login
    if (needsMigration) {
      try {
        const bcryptHash = await hashPassword(password)
        await db.user.update({
          where: { id: user.id },
          data: { password: bcryptHash },
        })
      } catch (migrationError) {
        // Log but don't block login if migration fails
        console.error(`Password migration failed for user ${user.id}:`, migrationError)
      }
    }

    const token = generateToken(user.id)

    const { password: _, ...userWithoutPassword } = user

    return NextResponse.json(
      { success: true, data: { user: userWithoutPassword, token } },
      { status: 200 }
    )
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
