import bcrypt from 'bcryptjs'
import crypto from 'crypto'

// ─── Configuration ──────────────────────────────────────────────────────────

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production'
const JWT_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000 // 7 days
const BCRYPT_ROUNDS = 12

// ─── Password Hashing (bcrypt) ──────────────────────────────────────────────

/**
 * Hash a plaintext password using bcrypt.
 * Returns a bcrypt hash string (e.g. "$2a$12$...").
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS)
}

/**
 * Verify a plaintext password against a stored hash.
 * Supports both bcrypt hashes and legacy Base64-encoded passwords.
 *
 * For legacy Base64 hashes: if the password matches, needsMigration is true.
 * The caller should re-hash and persist the password using hashPassword().
 *
 * For bcrypt hashes: standard comparison, needsMigration is always false.
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<{ valid: boolean; needsMigration: boolean }> {
  // bcrypt hash — modern path
  if (isBcryptHash(hash)) {
    const valid = await bcrypt.compare(password, hash)
    return { valid, needsMigration: false }
  }

  // Legacy Base64 path — passwords stored as Buffer.from(pw).toString('base64')
  const legacyHash = Buffer.from(password).toString('base64')
  if (legacyHash === hash) {
    return { valid: true, needsMigration: true }
  }

  return { valid: false, needsMigration: false }
}

/**
 * Check whether a stored hash is a legacy Base64-encoded value
 * that should be migrated to bcrypt.
 */
export function needsMigration(hash: string): boolean {
  return !isBcryptHash(hash)
}

// ─── JWT Token Generation & Verification ────────────────────────────────────

interface JwtPayload {
  sub: string   // userId
  iat: number   // issued at (epoch ms)
  exp: number   // expiration (epoch ms)
}

/**
 * Generate a JWT token signed with HMAC-SHA256.
 *
 * Token structure: header.payload.signature
 * - header:  { alg: "HS256", typ: "JWT" }
 * - payload: { sub: userId, iat: <ms>, exp: <ms> }
 * - signature: HMAC-SHA256(header.payload, secret)
 *
 * Example decoded payload:
 * {
 *   "sub": "clxyz1234567890",
 *   "iat": 1717800000000,
 *   "exp": 1718404800000
 * }
 */
export function generateToken(userId: string): string {
  const header = { alg: 'HS256', typ: 'JWT' }
  const payload: JwtPayload = {
    sub: userId,
    iat: Date.now(),
    exp: Date.now() + JWT_EXPIRY_MS,
  }

  const encodedHeader = base64UrlEncode(JSON.stringify(header))
  const encodedPayload = base64UrlEncode(JSON.stringify(payload))
  const signingInput = `${encodedHeader}.${encodedPayload}`
  const signature = createHmacSignature(signingInput)

  return `${signingInput}.${signature}`
}

/**
 * Verify a JWT token and return the userId (sub claim) if valid.
 * Returns null if:
 *   - token format is invalid (not 3 parts)
 *   - signature does not match
 *   - token is expired
 *   - sub claim is missing
 */
export function verifyToken(token: string): string | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null

    const [encodedHeader, encodedPayload, providedSignature] = parts

    // Verify signature
    const expectedSignature = createHmacSignature(`${encodedHeader}.${encodedPayload}`)
    if (!timingSafeEqual(providedSignature, expectedSignature)) return null

    // Decode payload
    const payload: JwtPayload = JSON.parse(base64UrlDecode(encodedPayload))

    // Verify expiration
    if (!payload.exp || Date.now() > payload.exp) return null

    // Verify subject exists
    if (!payload.sub) return null

    return payload.sub
  } catch {
    return null
  }
}

// ─── Header Extraction (unchanged) ──────────────────────────────────────────

/**
 * Extract a Bearer token from the Authorization header.
 * Returns null if the header is missing or malformed.
 */
export function getTokenFromHeaders(headers: Headers): string | null {
  const auth = headers.get('Authorization')
  if (!auth?.startsWith('Bearer ')) return null
  return auth.slice(7)
}

// ─── Internal Helpers ───────────────────────────────────────────────────────

/**
 * Check if a hash string is a bcrypt hash.
 * bcrypt hashes start with "$2a$", "$2b$", or "$2y$".
 */
function isBcryptHash(hash: string): boolean {
  return hash.startsWith('$2a$') || hash.startsWith('$2b$') || hash.startsWith('$2y$')
}

/**
 * Create an HMAC-SHA256 signature for a JWT signing input.
 * Returns a Base64URL-encoded string.
 */
function createHmacSignature(input: string): string {
  return crypto
    .createHmac('sha256', JWT_SECRET)
    .update(input)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

/**
 * Encode a string as Base64URL (RFC 4648 §5).
 * Removes padding, replaces + with -, / with _.
 */
function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

/**
 * Decode a Base64URL string back to UTF-8.
 * Restores padding and character substitutions.
 */
function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/')
  while (base64.length % 4) base64 += '='
  return Buffer.from(base64, 'base64').toString()
}

/**
 * Timing-safe string comparison to prevent timing attacks.
 * Compares two strings in constant time.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  const bufA = Buffer.from(a, 'utf-8')
  const bufB = Buffer.from(b, 'utf-8')
  return crypto.timingSafeEqual(bufA, bufB)
}
