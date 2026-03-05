// Admin Users API Route - Comprehensive User Management
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashToken } from '@/lib/auth'

// Helper to get authenticated admin user
async function getAdminUser(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value
  if (!token) return null

  const tokenHash = hashToken(token)
  const session = await db.session.findFirst({
    where: {
      tokenHash,
      isActive: true,
      expiresAt: { gt: new Date() }
    },
    include: { user: true }
  })

  const user = session?.user
  if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
    return null
  }

  return user
}

// GET /api/admin/users - Fetch all users with pagination, search, role filter
export async function GET(request: NextRequest) {
  try {
    const adminUser = await getAdminUser(request)
    if (!adminUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')
    const search = searchParams.get('search') || ''
    const role = searchParams.get('role') || ''
    const status = searchParams.get('status') || ''
    const userId = searchParams.get('id') || ''
    const skip = (page - 1) * pageSize

    // If specific user ID is requested
    if (userId) {
      const user = await db.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          avatarUrl: true,
          role: true,
          accountStatus: true,
          emailVerified: true,
          phoneVerified: true,
          createdAt: true,
          updatedAt: true,
          lastLoginAt: true,
          lastLoginIp: true,
          failedLoginAttempts: true,
          lockedUntil: true,
          dataDeletionRequested: true,
          dataDeletionRequestedAt: true,
          sellerProfile: {
            select: {
              id: true,
              storeName: true,
              storeSlug: true,
              status: true,
              totalSales: true,
              totalOrders: true,
              averageRating: true
            }
          },
          _count: {
            select: {
              orders: true,
              reviews: true,
              wishlistItems: true,
              notifications: true
            }
          }
        }
      })

      if (!user) {
        return NextResponse.json(
          { success: false, error: 'User not found' },
          { status: 404 }
        )
      }

      return NextResponse.json({ success: true, user })
    }

    // Build where clause
    const where: Record<string, unknown> = {}

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } }
      ]
    }

    if (role) {
      where.role = role
    }

    if (status) {
      where.accountStatus = status
    }

    // Get users with pagination
    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          avatarUrl: true,
          role: true,
          accountStatus: true,
          emailVerified: true,
          phoneVerified: true,
          createdAt: true,
          lastLoginAt: true,
          sellerProfile: {
            select: {
              id: true,
              storeName: true,
              status: true
            }
          },
          _count: {
            select: {
              orders: true,
              reviews: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize
      }),
      db.user.count({ where })
    ])

    // Get stats
    const stats = await Promise.all([
      db.user.count(),
      db.user.count({ where: { accountStatus: 'ACTIVE' } }),
      db.user.count({ where: { accountStatus: 'SUSPENDED' } }),
      db.user.count({ where: { accountStatus: 'BANNED' } }),
      db.user.count({ where: { accountStatus: 'PENDING_VERIFICATION' } }),
      db.user.count({ where: { role: 'ADMIN' } }),
      db.user.count({ where: { role: 'SELLER' } }),
      db.user.count({ where: { role: 'USER' } })
    ])

    return NextResponse.json({
      success: true,
      users,
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
        hasMore: skip + pageSize < total
      },
      stats: {
        total: stats[0],
        active: stats[1],
        suspended: stats[2],
        banned: stats[3],
        pendingVerification: stats[4],
        admins: stats[5],
        sellers: stats[6],
        customers: stats[7]
      }
    })
  } catch (error) {
    console.error('Admin Users GET error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/admin/users - Create new user (admin only)
export async function POST(request: NextRequest) {
  try {
    const adminUser = await getAdminUser(request)
    if (!adminUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      email,
      password,
      firstName,
      lastName,
      phone,
      role,
      accountStatus,
      sendVerificationEmail
    } = body

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Check if email already exists
    const existingUser = await db.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'Email already registered' },
        { status: 400 }
      )
    }

    // Hash password using SHA-256
    const encoder = new TextEncoder()
    const data = encoder.encode(password)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const passwordHash = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    // Create user
    const user = await db.user.create({
      data: {
        email,
        passwordHash,
        firstName: firstName || null,
        lastName: lastName || null,
        phone: phone || null,
        role: role || 'USER',
        accountStatus: accountStatus || 'PENDING_VERIFICATION',
        emailVerified: accountStatus === 'ACTIVE'
      }
    })

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: adminUser.id,
        userRole: adminUser.role,
        action: 'CREATE_USER',
        entityType: 'user',
        entityId: user.id,
        newValue: JSON.stringify({
          email: user.email,
          role: user.role,
          accountStatus: user.accountStatus
        })
      }
    })

    // Create wallet for user if needed
    if (role === 'USER' || role === 'SELLER') {
      await db.wallet.create({
        data: {
          userId: user.id,
          balance: 0
        }
      })
    }

    return NextResponse.json({
      success: true,
      message: 'User created successfully',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        role: user.role,
        accountStatus: user.accountStatus,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt
      }
    })
  } catch (error) {
    console.error('Admin Users POST error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/admin/users - Update user (role, status, verification)
export async function PUT(request: NextRequest) {
  try {
    const adminUser = await getAdminUser(request)
    if (!adminUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      userId,
      role,
      accountStatus,
      emailVerified,
      phoneVerified,
      firstName,
      lastName,
      phone,
      resetPassword,
      newPassword,
      reason
    } = body

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Get current user data for audit log
    const currentUser = await db.user.findUnique({
      where: { id: userId }
    })

    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Prevent admins from modifying super admins unless they are super admin
    if (currentUser.role === 'SUPER_ADMIN' && adminUser.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Cannot modify super admin account' },
        { status: 403 }
      )
    }

    // Prevent self-demotion for super admins
    if (userId === adminUser.id && role && role !== adminUser.role) {
      return NextResponse.json(
        { success: false, error: 'Cannot change your own role' },
        { status: 403 }
      )
    }

    // Build update data
    const updateData: Record<string, unknown> = {}

    if (role !== undefined) updateData.role = role
    if (accountStatus !== undefined) {
      updateData.accountStatus = accountStatus

      // If activating, set email verified
      if (accountStatus === 'ACTIVE') {
        updateData.emailVerified = true
        updateData.emailVerifiedAt = new Date()
      }
    }
    if (emailVerified !== undefined) {
      updateData.emailVerified = emailVerified
      if (emailVerified) updateData.emailVerifiedAt = new Date()
    }
    if (phoneVerified !== undefined) {
      updateData.phoneVerified = phoneVerified
      if (phoneVerified) updateData.phoneVerifiedAt = new Date()
    }
    if (firstName !== undefined) updateData.firstName = firstName
    if (lastName !== undefined) updateData.lastName = lastName
    if (phone !== undefined) updateData.phone = phone

    // Handle password reset
    if (resetPassword && newPassword) {
      const encoder = new TextEncoder()
      const data = encoder.encode(newPassword)
      const hashBuffer = await crypto.subtle.digest('SHA-256', data)
      updateData.passwordHash = Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
      updateData.failedLoginAttempts = 0
      updateData.lockedUntil = null
    }

    // Update user
    const updatedUser = await db.user.update({
      where: { id: userId },
      data: updateData
    })

    // Handle account status changes
    if (accountStatus === 'SUSPENDED' || accountStatus === 'BANNED') {
      // Invalidate all sessions
      await db.session.updateMany({
        where: { userId, isActive: true },
        data: { isActive: false }
      })

      // Create notification for user
      await db.notification.create({
        data: {
          userId,
          type: accountStatus === 'BANNED' ? 'SUSPENSION' : 'SYSTEM',
          title: accountStatus === 'BANNED' ? 'Account Banned' : 'Account Suspended',
          message: reason || `Your account has been ${accountStatus.toLowerCase()}. Please contact support for more information.`
        }
      })
    }

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: adminUser.id,
        userRole: adminUser.role,
        action: 'UPDATE_USER',
        entityType: 'user',
        entityId: userId,
        oldValue: JSON.stringify({
          role: currentUser.role,
          accountStatus: currentUser.accountStatus,
          emailVerified: currentUser.emailVerified
        }),
        newValue: JSON.stringify(updateData)
      }
    })

    return NextResponse.json({
      success: true,
      message: 'User updated successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        phone: updatedUser.phone,
        role: updatedUser.role,
        accountStatus: updatedUser.accountStatus,
        emailVerified: updatedUser.emailVerified,
        phoneVerified: updatedUser.phoneVerified
      }
    })
  } catch (error) {
    console.error('Admin Users PUT error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/users - Soft delete user
export async function DELETE(request: NextRequest) {
  try {
    const adminUser = await getAdminUser(request)
    if (!adminUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const hard = searchParams.get('hard') === 'true'

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Prevent self-deletion
    if (userId === adminUser.id) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete your own account' },
        { status: 403 }
      )
    }

    // Get user to delete
    const userToDelete = await db.user.findUnique({
      where: { id: userId }
    })

    if (!userToDelete) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Prevent deletion of super admins by non-super-admins
    if (userToDelete.role === 'SUPER_ADMIN' && adminUser.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Cannot delete super admin account' },
        { status: 403 }
      )
    }

    if (hard) {
      // Hard delete - actually remove from database
      // This will cascade delete related records based on schema

      // First invalidate sessions
      await db.session.deleteMany({
        where: { userId }
      })

      // Delete user (cascade will handle other relations)
      await db.user.delete({
        where: { id: userId }
      })

      // Create audit log
      await db.auditLog.create({
        data: {
          userId: adminUser.id,
          userRole: adminUser.role,
          action: 'DELETE_USER_HARD',
          entityType: 'user',
          entityId: userId,
          oldValue: JSON.stringify({
            email: userToDelete.email,
            role: userToDelete.role
          })
        }
      })

      return NextResponse.json({
        success: true,
        message: 'User permanently deleted'
      })
    } else {
      // Soft delete - mark as deleted
      await db.user.update({
        where: { id: userId },
        data: {
          accountStatus: 'DELETED',
          email: `deleted_${Date.now()}_${userToDelete.email}`, // Make email available for reuse
          phone: null,
          avatarUrl: null,
          dataDeletionRequested: true,
          dataDeletionRequestedAt: new Date()
        }
      })

      // Invalidate all sessions
      await db.session.updateMany({
        where: { userId, isActive: true },
        data: { isActive: false }
      })

      // Create audit log
      await db.auditLog.create({
        data: {
          userId: adminUser.id,
          userRole: adminUser.role,
          action: 'DELETE_USER_SOFT',
          entityType: 'user',
          entityId: userId,
          oldValue: JSON.stringify({
            email: userToDelete.email,
            role: userToDelete.role
          })
        }
      })

      return NextResponse.json({
        success: true,
        message: 'User soft deleted successfully'
      })
    }
  } catch (error) {
    console.error('Admin Users DELETE error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
