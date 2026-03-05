import { db } from '@/lib/db'
import type { User, UserRole, AccountStatus } from '@prisma/client'
import { randomBytes, createHash } from 'crypto'

// ============================================
// Password Utilities
// ============================================

export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const passwordHash = await hashPassword(password)
  return passwordHash === hash
}

// ============================================
// Token Utilities
// ============================================

export function generateToken(length: number = 32): string {
  return randomBytes(length).toString('hex')
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// ============================================
// Session Utilities
// ============================================

const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000 // 7 days
const REFRESH_DURATION = 30 * 24 * 60 * 60 * 1000 // 30 days

export async function createSession(
  userId: string,
  deviceInfo?: string,
  ipAddress?: string
): Promise<{ token: string; refreshToken: string }> {
  const token = generateToken()
  const refreshToken = generateToken()
  
  const tokenHash = hashToken(token)
  const refreshTokenHash = hashToken(refreshToken)
  
  const expiresAt = new Date(Date.now() + SESSION_DURATION)
  const refreshExpiresAt = new Date(Date.now() + REFRESH_DURATION)
  
  await db.session.create({
    data: {
      userId,
      tokenHash,
      refreshTokenHash,
      deviceInfo,
      ipAddress,
      expiresAt,
      refreshExpiresAt,
      isActive: true,
    }
  })
  
  return { token, refreshToken }
}

export async function validateSession(token: string): Promise<User | null> {
  const tokenHash = hashToken(token)
  
  const session = await db.session.findUnique({
    where: { tokenHash },
    include: { user: true }
  })
  
  if (!session || !session.isActive || session.expiresAt < new Date()) {
    return null
  }
  
  return session.user
}

export async function invalidateSession(token: string): Promise<void> {
  const tokenHash = hashToken(token)
  
  await db.session.updateMany({
    where: { tokenHash },
    data: { isActive: false }
  })
}

// ============================================
// Auth Functions
// ============================================

export async function registerUser(
  email: string,
  password: string,
  firstName?: string,
  lastName?: string,
  role: UserRole = 'USER'
): Promise<{ user: User; verificationToken: string } | { error: string }> {
  // Check if user exists
  const existingUser = await db.user.findUnique({
    where: { email }
  })
  
  if (existingUser) {
    return { error: 'Email already registered' }
  }
  
  const passwordHash = await hashPassword(password)
  
  const user = await db.user.create({
    data: {
      email,
      passwordHash,
      firstName,
      lastName,
      role,
      emailVerified: false,
      accountStatus: 'PENDING_VERIFICATION',
    }
  })
  
  // Create verification token
  const verificationToken = generateVerificationCode()
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
  
  await db.verificationToken.create({
    data: {
      email,
      token: verificationToken,
      type: 'email_verification',
      expiresAt,
    }
  })
  
  return { user, verificationToken }
}

export async function loginUser(
  email: string,
  password: string,
  deviceInfo?: string,
  ipAddress?: string
): Promise<{ user: User; token: string; refreshToken: string } | { error: string }> {
  const user = await db.user.findUnique({
    where: { email }
  })
  
  if (!user) {
    return { error: 'Invalid credentials' }
  }
  
  // Check if account is locked
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    return { error: 'Account is temporarily locked. Please try again later.' }
  }
  
  // Verify password
  const isValid = await verifyPassword(password, user.passwordHash)
  
  if (!isValid) {
    // Increment failed attempts
    const failedAttempts = user.failedLoginAttempts + 1
    
    if (failedAttempts >= 5) {
      // Lock account for 30 minutes
      await db.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: failedAttempts,
          lockedUntil: new Date(Date.now() + 30 * 60 * 1000)
        }
      })
      return { error: 'Too many failed attempts. Account locked for 30 minutes.' }
    }
    
    await db.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: failedAttempts }
    })
    
    return { error: 'Invalid credentials' }
  }
  
  // Check account status
  if (user.accountStatus === 'BANNED') {
    return { error: 'Your account has been banned. Please contact support.' }
  }
  
  if (user.accountStatus === 'SUSPENDED') {
    return { error: 'Your account has been suspended. Please contact support.' }
  }
  
  // Create session
  const { token, refreshToken } = await createSession(userId = user.id, deviceInfo, ipAddress)
  
  // Update user login info
  await db.user.update({
    where: { id: user.id },
    data: {
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
      lastLoginIp: ipAddress,
    }
  })
  
  // Log login history
  await db.loginHistory.create({
    data: {
      userId: user.id,
      ipAddress,
      deviceInfo,
      wasSuccessful: true,
    }
  })
  
  return { user, token, refreshToken }
}

// ============================================
// Role Checking
// ============================================

export function hasRole(user: User | null, roles: UserRole | UserRole[]): boolean {
  if (!user) return false
  const roleArray = Array.isArray(roles) ? roles : [roles]
  return roleArray.includes(user.role)
}

export function isAdmin(user: User | null): boolean {
  return hasRole(user, ['ADMIN', 'SUPER_ADMIN'])
}

export function isSeller(user: User | null): boolean {
  return hasRole(user, ['SELLER', 'ADMIN', 'SUPER_ADMIN'])
}

// ============================================
// Verification
// ============================================

export async function verifyEmail(token: string): Promise<{ success: boolean; error?: string }> {
  const verificationToken = await db.verificationToken.findUnique({
    where: { token }
  })
  
  if (!verificationToken) {
    return { success: false, error: 'Invalid verification token' }
  }
  
  if (verificationToken.type !== 'email_verification') {
    return { success: false, error: 'Invalid token type' }
  }
  
  if (verificationToken.expiresAt < new Date()) {
    return { success: false, error: 'Token has expired' }
  }
  
  if (verificationToken.used) {
    return { success: false, error: 'Token already used' }
  }
  
  // Update user
  await db.user.update({
    where: { email: verificationToken.email },
    data: {
      emailVerified: true,
      emailVerifiedAt: new Date(),
      accountStatus: 'ACTIVE',
    }
  })
  
  // Mark token as used
  await db.verificationToken.update({
    where: { id: verificationToken.id },
    data: { used: true }
  })
  
  return { success: true }
}
