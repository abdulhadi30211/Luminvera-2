// Admin Activities/Audit Log API Route
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

// GET - Fetch recent admin activities/audit log with pagination
export async function GET(request: NextRequest) {
  try {
    const user = await getAdminUser(request)
    
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')
    const action = searchParams.get('action')
    const entityType = searchParams.get('entityType')
    const userId = searchParams.get('userId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const skip = (page - 1) * pageSize

    // Build filter conditions
    const where: {
      action?: string
      entityType?: string
      userId?: string
      createdAt?: { gte?: Date; lte?: Date }
    } = {}

    if (action) {
      where.action = action
    }
    if (entityType) {
      where.entityType = entityType
    }
    if (userId) {
      where.userId = userId
    }
    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) {
        where.createdAt.gte = new Date(startDate)
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate)
      }
    }

    // Fetch activities with pagination
    const [activities, total] = await Promise.all([
      db.auditLog.findMany({
        where,
        include: {
          // We don't have a direct relation, but we can fetch user details separately
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      db.auditLog.count({ where }),
    ])

    // Get user details for activities that have userId
    const userIds = activities
      .filter(a => a.userId)
      .map(a => a.userId as string)
      .filter((v, i, a) => a.indexOf(v) === i) // unique

    const users = await db.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        avatarUrl: true,
      },
    })

    const userMap = new Map(users.map(u => [u.id, u]))

    // Enrich activities with user details and parsed values
    const enrichedActivities = activities.map(activity => {
      let oldValue = null
      let newValue = null
      
      try {
        oldValue = activity.oldValue ? JSON.parse(activity.oldValue) : null
      } catch {
        oldValue = activity.oldValue
      }
      
      try {
        newValue = activity.newValue ? JSON.parse(activity.newValue) : null
      } catch {
        newValue = activity.newValue
      }

      return {
        id: activity.id,
        action: activity.action,
        entityType: activity.entityType,
        entityId: activity.entityId,
        oldValue,
        newValue,
        ipAddress: activity.ipAddress,
        userAgent: activity.userAgent,
        createdAt: activity.createdAt,
        user: activity.userId ? userMap.get(activity.userId) : null,
        userRole: activity.userRole,
      }
    })

    // Get distinct actions for filtering
    const distinctActions = await db.auditLog.findMany({
      where: {},
      select: { action: true },
      distinct: ['action'],
    })

    // Get distinct entity types for filtering
    const distinctEntityTypes = await db.auditLog.findMany({
      where: {},
      select: { entityType: true },
      distinct: ['entityType'],
    })

    // Activity statistics
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const [
      todayCount,
      weekCount,
      monthCount,
      actionsBreakdown,
    ] = await Promise.all([
      db.auditLog.count({ where: { createdAt: { gte: today } } }),
      db.auditLog.count({ 
        where: { 
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } 
        } 
      }),
      db.auditLog.count({ 
        where: { 
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } 
        } 
      }),
      db.auditLog.groupBy({
        by: ['action'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),
    ])

    return NextResponse.json({
      success: true,
      data: enrichedActivities,
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
      filters: {
        actions: distinctActions.map(a => a.action),
        entityTypes: distinctEntityTypes.map(e => e.entityType),
      },
      stats: {
        today: todayCount,
        thisWeek: weekCount,
        thisMonth: monthCount,
        actionsBreakdown: actionsBreakdown.map(a => ({
          action: a.action,
          count: a._count.id,
        })),
      },
    })
  } catch (error) {
    console.error('Activities fetch error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create a new activity log entry (for custom admin actions)
export async function POST(request: NextRequest) {
  try {
    const user = await getAdminUser(request)
    
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, entityType, entityId, oldValue, newValue, ipAddress, userAgent } = body

    if (!action || !entityType) {
      return NextResponse.json({ 
        success: false, 
        error: 'Action and entityType are required' 
      }, { status: 400 })
    }

    const activity = await db.auditLog.create({
      data: {
        userId: user.id,
        userRole: user.role,
        action,
        entityType,
        entityId,
        oldValue: oldValue ? JSON.stringify(oldValue) : null,
        newValue: newValue ? JSON.stringify(newValue) : null,
        ipAddress,
        userAgent,
      },
    })

    return NextResponse.json({
      success: true,
      data: activity,
    })
  } catch (error) {
    console.error('Create activity error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete old activities (SUPER_ADMIN only)
export async function DELETE(request: NextRequest) {
  try {
    const user = await getAdminUser(request)
    
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ 
        success: false, 
        error: 'Only SUPER_ADMIN can delete activity logs' 
      }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const olderThan = searchParams.get('olderThan') // days
    const confirmation = searchParams.get('confirmation')

    if (confirmation !== 'CONFIRM_DELETE_LOGS') {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid confirmation. Use "CONFIRM_DELETE_LOGS" as confirmation parameter.' 
      }, { status: 400 })
    }

    if (!olderThan) {
      return NextResponse.json({ 
        success: false, 
        error: 'olderThan parameter (in days) is required' 
      }, { status: 400 })
    }

    const cutoffDate = new Date(Date.now() - parseInt(olderThan) * 24 * 60 * 60 * 1000)

    const result = await db.auditLog.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
      },
    })

    // Log this action
    await db.auditLog.create({
      data: {
        userId: user.id,
        userRole: user.role,
        action: 'DELETE_OLD_LOGS',
        entityType: 'audit_log',
        newValue: JSON.stringify({
          olderThanDays: olderThan,
          deletedCount: result.count,
          cutoffDate: cutoffDate.toISOString(),
        }),
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        deletedCount: result.count,
        cutoffDate: cutoffDate.toISOString(),
      },
    })
  } catch (error) {
    console.error('Delete activities error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
