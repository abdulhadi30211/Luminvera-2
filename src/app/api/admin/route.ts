import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Helper to get auth user and check admin role
async function getAdminUser(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value
  if (!token) return null
  
  const session = await db.session.findFirst({
    where: { isActive: true, expiresAt: { gt: new Date() } },
    include: { user: true }
  })
  
  const user = session?.user
  if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
    return null
  }
  
  return user
}

// GET /api/admin/stats - Get dashboard statistics
export async function GET(request: NextRequest) {
  try {
    const user = await getAdminUser(request)
    
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    if (action === 'stats') {
      const [
        totalUsers,
        totalSellers,
        totalProducts,
        totalOrders,
        totalRevenue,
        pendingApprovals,
        activeDisputes,
        recentOrders,
        topSellers,
      ] = await Promise.all([
        db.user.count({ where: { accountStatus: 'ACTIVE' } }),
        db.seller.count({ where: { status: 'VERIFIED' } }),
        db.product.count({ where: { status: 'LIVE' } }),
        db.order.count(),
        db.order.aggregate({
          where: { paymentStatus: 'COMPLETED' },
          _sum: { total: true },
        }),
        db.seller.count({ where: { status: 'PENDING' } }),
        db.dispute.count({ where: { status: 'OPEN' } }),
        db.order.findMany({
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            items: { take: 1 },
          },
        }),
        db.seller.findMany({
          take: 5,
          orderBy: { totalSales: 'desc' },
        }),
      ])

      return NextResponse.json({
        success: true,
        data: {
          totalUsers,
          totalSellers,
          totalProducts,
          totalOrders,
          totalRevenue: totalRevenue._sum.total || 0,
          pendingApprovals,
          activeDisputes,
          recentOrders,
          topSellers,
        }
      })
    }

    if (action === 'users') {
      const page = parseInt(searchParams.get('page') || '1')
      const pageSize = parseInt(searchParams.get('pageSize') || '20')
      const role = searchParams.get('role')
      const status = searchParams.get('status')
      const skip = (page - 1) * pageSize

      const where: Record<string, unknown> = {}
      if (role) where.role = role
      if (status) where.accountStatus = status

      const [users, total] = await Promise.all([
        db.user.findMany({
          where,
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            role: true,
            accountStatus: true,
            emailVerified: true,
            createdAt: true,
            lastLoginAt: true,
            sellerProfile: {
              select: {
                id: true,
                storeName: true,
                status: true,
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: pageSize,
        }),
        db.user.count({ where }),
      ])

      return NextResponse.json({
        success: true,
        data: users,
        pagination: {
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize),
        }
      })
    }

    if (action === 'sellers') {
      const page = parseInt(searchParams.get('page') || '1')
      const pageSize = parseInt(searchParams.get('pageSize') || '20')
      const status = searchParams.get('status')
      const skip = (page - 1) * pageSize

      const where: Record<string, unknown> = {}
      if (status) where.status = status

      const [sellers, total] = await Promise.all([
        db.seller.findMany({
          where,
          include: {
            user: {
              select: {
                email: true,
                firstName: true,
                lastName: true,
                phone: true,
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: pageSize,
        }),
        db.seller.count({ where }),
      ])

      return NextResponse.json({
        success: true,
        data: sellers,
        pagination: {
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize),
        }
      })
    }

    if (action === 'products') {
      const page = parseInt(searchParams.get('page') || '1')
      const pageSize = parseInt(searchParams.get('pageSize') || '20')
      const status = searchParams.get('status')
      const skip = (page - 1) * pageSize

      const where: Record<string, unknown> = {}
      if (status) where.status = status

      const [products, total] = await Promise.all([
        db.product.findMany({
          where,
          include: {
            seller: {
              select: {
                id: true,
                storeName: true,
              }
            },
            category: {
              select: {
                id: true,
                name: true,
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: pageSize,
        }),
        db.product.count({ where }),
      ])

      return NextResponse.json({
        success: true,
        data: products,
        pagination: {
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize),
        }
      })
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Admin API error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/admin - Admin actions
export async function POST(request: NextRequest) {
  try {
    const user = await getAdminUser(request)
    
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, targetId, data } = body

    // Approve seller
    if (action === 'approve-seller') {
      const seller = await db.seller.update({
        where: { id: targetId },
        data: {
          status: 'VERIFIED',
          verifiedAt: new Date(),
          verifiedBy: user.id,
        }
      })

      // Create notification for seller
      await db.notification.create({
        data: {
          userId: seller.userId,
          type: 'APPROVAL',
          title: 'Seller Account Approved',
          message: 'Congratulations! Your seller account has been approved. You can now start selling.',
        }
      })

      return NextResponse.json({ success: true, data: seller })
    }

    // Suspend seller
    if (action === 'suspend-seller') {
      const seller = await db.seller.update({
        where: { id: targetId },
        data: { status: 'SUSPENDED' }
      })

      await db.notification.create({
        data: {
          userId: seller.userId,
          type: 'SUSPENSION',
          title: 'Seller Account Suspended',
          message: 'Your seller account has been suspended. Please contact support for more information.',
        }
      })

      return NextResponse.json({ success: true, data: seller })
    }

    // Approve product
    if (action === 'approve-product') {
      const product = await db.product.update({
        where: { id: targetId },
        data: {
          status: 'LIVE',
          approvedAt: new Date(),
          approvedBy: user.id,
        }
      })

      await db.productApproval.create({
        data: {
          productId: targetId,
          sellerId: product.sellerId,
          action: 'approved',
          reviewedBy: user.id,
          reviewedAt: new Date(),
        }
      })

      return NextResponse.json({ success: true, data: product })
    }

    // Reject product
    if (action === 'reject-product') {
      const { reason } = data
      const product = await db.product.update({
        where: { id: targetId },
        data: {
          status: 'REJECTED',
          approvalNotes: reason,
        }
      })

      await db.productApproval.create({
        data: {
          productId: targetId,
          sellerId: product.sellerId,
          action: 'rejected',
          notes: reason,
          reviewedBy: user.id,
          reviewedAt: new Date(),
        }
      })

      return NextResponse.json({ success: true, data: product })
    }

    // Ban user
    if (action === 'ban-user') {
      const { reason } = data
      const targetUser = await db.user.update({
        where: { id: targetId },
        data: {
          accountStatus: 'BANNED',
        }
      })

      // Invalidate all sessions
      await db.session.updateMany({
        where: { userId: targetId, isActive: true },
        data: { isActive: false }
      })

      // Create audit log
      await db.auditLog.create({
        data: {
          userId: user.id,
          userRole: user.role,
          action: 'BAN_USER',
          entityType: 'user',
          entityId: targetId,
          newValue: JSON.stringify({ reason }),
        }
      })

      return NextResponse.json({ success: true, data: targetUser })
    }

    // Update platform config
    if (action === 'update-config') {
      const { key, value } = data
      const config = await db.platformConfig.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      })

      return NextResponse.json({ success: true, data: config })
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Admin action error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
