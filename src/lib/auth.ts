export function hashPassword(password: string): string {
  return Buffer.from(password).toString('base64')
}

export function verifyPassword(password: string, hash: string): boolean {
  return Buffer.from(password).toString('base64') === hash
}

export function generateToken(userId: string): string {
  const payload = `${userId}:${Date.now()}`
  return Buffer.from(payload).toString('base64')
}

export function verifyToken(token: string): string | null {
  try {
    const decoded = Buffer.from(token, 'base64').toString()
    const [userId] = decoded.split(':')
    return userId
  } catch {
    return null
  }
}

export function getTokenFromHeaders(headers: Headers): string | null {
  const auth = headers.get('Authorization')
  if (!auth?.startsWith('Bearer ')) return null
  return auth.slice(7)
}
