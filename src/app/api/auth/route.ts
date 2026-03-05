import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  hashPassword,
  verifyPassword,
  generateToken,
  hashToken,
  createSession,
  validateSession,
  invalidateSession,
} from '@/lib/auth'

// POST /api/auth - Handle auth actions
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, email, password, firstName, lastName, role } = body

    if (action === 'register') {
      // Check if user already exists
      const existingUser = await db.user.findUnique({
        where: { email },
      })

      if (existingUser) {
        return NextResponse.json(
          { success: false, error: 'Email already registered' },
          { status: 400 }
        )
      }

      const passwordHash = await hashPassword(password)

      const user = await db.user.create({
        data: {
          email,
          passwordHash,
          firstName,
          lastName,
          role: role || 'USER',
          accountStatus: 'PENDING_VERIFICATION',
          emailVerified: false,
        },
      })

      return NextResponse.json({
        success: true,
        message: 'Registration successful. Please verify your email.',
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
      })
    }

    if (action === 'login') {
      // Find user
      const user = await db.user.findUnique({
        where: { email },
      })

      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Invalid credentials' },
          { status: 401 }
        )
      }

      // Check if account is locked
      if (user.lockedUntil && user.lockedUntil > new Date()) {
        return NextResponse.json(
          { success: false, error: 'Account is temporarily locked' },
          { status: 401 }
        )
      }

      // Verify password
      const isValid = await verifyPassword(password, user.passwordHash)
      if (!isValid) {
        // Increment failed attempts
        const newAttempts = user.failedLoginAttempts + 1
        const updateData: { failedLoginAttempts: number; lockedUntil?: Date } = {
          failedLoginAttempts: newAttempts,
        }

        if (newAttempts >= 5) {
          const lockUntil = new Date()
          lockUntil.setMinutes(lockUntil.getMinutes() + 30)
          updateData.lockedUntil = lockUntil
        }

        await db.user.update({
          where: { id: user.id },
          data: updateData,
        })

        return NextResponse.json(
          { success: false, error: 'Invalid credentials' },
          { status: 401 }
        )
      }

      // Check account status
      if (user.accountStatus === 'BANNED') {
        return NextResponse.json(
          { success: false, error: 'Account has been banned' },
          { status: 401 }
        )
      }

      if (user.accountStatus === 'SUSPENDED') {
        return NextResponse.json(
          { success: false, error: 'Account has been suspended' },
          { status: 401 }
        )
      }

      // Get device info and IP
      const userAgent = request.headers.get('user-agent') || undefined
      const ipAddress =
        request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        request.headers.get('x-real-ip') ||
        undefined

      // Create session using auth utility
      const { token, refreshToken } = await createSession(
        user.id,
        userAgent,
        ipAddress
      )

      // Update user login info
      await db.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: 0,
          lockedUntil: null,
          lastLoginAt: new Date(),
          lastLoginIp: ipAddress,
        },
      })

      // Log login history
      await db.loginHistory.create({
        data: {
          userId: user.id,
          ipAddress,
          userAgent,
          deviceInfo: userAgent,
          wasSuccessful: true,
        },
      })

      // Get seller profile if exists
      const sellerProfile = await db.seller.findUnique({
        where: { userId: user.id },
      })

      const response = NextResponse.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          avatarUrl: user.avatarUrl,
          role: user.role,
          accountStatus: user.accountStatus,
          emailVerified: user.emailVerified,
          createdAt: user.createdAt,
          sellerProfile: sellerProfile
            ? {
                id: sellerProfile.id,
                userId: sellerProfile.userId,
                storeName: sellerProfile.storeName,
                storeSlug: sellerProfile.storeSlug,
                storeDescription: sellerProfile.storeDescription,
                storeLogoUrl: sellerProfile.storeLogoUrl,
                storeBannerUrl: sellerProfile.storeBannerUrl,
                status: sellerProfile.status,
                totalSales: sellerProfile.totalSales,
                totalOrders: sellerProfile.totalOrders,
                totalProducts: sellerProfile.totalProducts,
                averageRating: sellerProfile.averageRating,
                totalReviews: sellerProfile.totalReviews,
                commissionRate: sellerProfile.commissionRate,
                totalEarnings: sellerProfile.totalEarnings,
                availableBalance: sellerProfile.availableBalance,
                isFeatured: sellerProfile.isFeatured,
                isTopSeller: sellerProfile.isTopSeller,
                createdAt: sellerProfile.createdAt,
              }
            : null,
        },
      })

      // Set cookies
      response.cookies.set('auth-token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60,
        path: '/',
      })

      response.cookies.set('refresh-token', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60,
        path: '/',
      })

      return response
    }

    if (action === 'logout') {
      const token = request.cookies.get('auth-token')?.value
      if (token) {
        await invalidateSession(token)
      }

      const response = NextResponse.json({ success: true })
      response.cookies.delete('auth-token')
      response.cookies.delete('refresh-token')
      return response
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Auth error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH /api/auth - Update user profile
export async function PATCH(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Validate session and get user
    const currentUser = await validateSession(token)

    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'Invalid session' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      firstName,
      lastName,
      phone,
      avatarUrl,
      currentPassword,
      newPassword,
      emailNotifications,
      smsNotifications,
      promotionalEmails,
      deleteAccount,
    } = body

    // Handle account deletion
    if (deleteAccount) {
      // Delete user's sessions
      await db.session.deleteMany({
        where: { userId: currentUser.id },
      })

      // Delete user's addresses
      await db.address.deleteMany({
        where: { userId: currentUser.id },
      })

      // Delete user's wishlist
      await db.wishlistItem.deleteMany({
        where: { userId: currentUser.id },
      })

      // Delete user's notifications
      await db.notification.deleteMany({
        where: { userId: currentUser.id },
      })

      // Delete user
      await db.user.delete({
        where: { id: currentUser.id },
      })

      const response = NextResponse.json({
        success: true,
        message: 'Account deleted successfully',
      })
      response.cookies.delete('auth-token')
      response.cookies.delete('refresh-token')
      return response
    }

    // Handle password change
    if (currentPassword && newPassword) {
      const isValid = await verifyPassword(currentPassword, currentUser.passwordHash)

      if (!isValid) {
        return NextResponse.json(
          { success: false, error: 'Current password is incorrect' },
          { status: 400 }
        )
      }

      const newHash = await hashPassword(newPassword)

      await db.user.update({
        where: { id: currentUser.id },
        data: { passwordHash: newHash },
      })

      return NextResponse.json({
        success: true,
        message: 'Password updated successfully',
      })
    }

    // Build update object
    const updates: {
      firstName?: string
      lastName?: string
      phone?: string
      avatarUrl?: string
    } = {}

    if (firstName !== undefined) updates.firstName = firstName
    if (lastName !== undefined) updates.lastName = lastName
    if (phone !== undefined) updates.phone = phone
    if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl

    // Update user
    const updatedUser = await db.user.update({
      where: { id: currentUser.id },
      data: updates,
    })

    // Get seller profile if exists
    const sellerProfile = await db.seller.findUnique({
      where: { userId: currentUser.id },
    })

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        phone: updatedUser.phone,
        avatarUrl: updatedUser.avatarUrl,
        role: updatedUser.role,
        accountStatus: updatedUser.accountStatus,
        emailVerified: updatedUser.emailVerified,
        createdAt: updatedUser.createdAt,
        sellerProfile: sellerProfile
          ? {
              id: sellerProfile.id,
              userId: sellerProfile.userId,
              storeName: sellerProfile.storeName,
              storeSlug: sellerProfile.storeSlug,
              status: sellerProfile.status,
            }
          : null,
      },
    })
  } catch (error) {
    console.error('Profile update error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/auth/me - Get current user
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Validate session and get user
    const user = await validateSession(token)

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid session' },
        { status: 401 }
      )
    }

    // Get seller profile if exists
    const sellerProfile = await db.seller.findUnique({
      where: { userId: user.id },
    })

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        role: user.role,
        accountStatus: user.accountStatus,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        sellerProfile: sellerProfile
          ? {
              id: sellerProfile.id,
              userId: sellerProfile.userId,
              storeName: sellerProfile.storeName,
              storeSlug: sellerProfile.storeSlug,
              status: sellerProfile.status,
            }
          : null,
      },
    })
  } catch (error) {
    console.error('Get user error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
