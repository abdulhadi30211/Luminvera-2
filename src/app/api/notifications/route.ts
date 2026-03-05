// Notifications API Route - Comprehensive Notification Management
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { NotificationType, UserRole } from '@prisma/client'

// GET - Fetch user notifications with pagination and filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const unreadOnly = searchParams.get('unreadOnly') === 'true'
    const type = searchParams.get('type') // Filter by notification type
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')
    const cursor = searchParams.get('cursor') // For cursor-based pagination

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Build where clause
    const where: {
      userId: string
      read?: boolean
      type?: NotificationType
      createdAt?: { lt: Date }
    } = { userId }

    // Apply filters
    if (unreadOnly) {
      where.read = false
    }

    if (type && Object.values(NotificationType).includes(type as NotificationType)) {
      where.type = type as NotificationType
    }

    // Cursor-based pagination for real-time updates
    if (cursor) {
      where.createdAt = { lt: new Date(cursor) }
    }

    // Get notifications with count
    const [notifications, count] = await Promise.all([
      db.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        ...(cursor ? {} : { skip: offset, take: limit }),
        ...(cursor ? { take: limit } : {}),
      }),
      db.notification.count({ where }),
    ])

    // Get unread count
    const unreadCount = await db.notification.count({
      where: { userId, read: false },
    })

    // Get notification type counts for badge display
    const unreadNotifications = await db.notification.findMany({
      where: { userId, read: false },
      select: { type: true },
    })

    const countsByType: Record<string, number> = {}
    unreadNotifications.forEach((n) => {
      countsByType[n.type] = (countsByType[n.type] || 0) + 1
    })

    // Get next cursor for pagination
    const lastNotification = notifications[notifications.length - 1]
    const nextCursor = lastNotification?.createdAt?.toISOString() || null

    return NextResponse.json({
      success: true,
      notifications: notifications.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        data: n.data ? JSON.parse(n.data) : null,
        read: n.read,
        readAt: n.readAt,
        createdAt: n.createdAt,
      })),
      unreadCount,
      countsByType,
      pagination: {
        total: count,
        limit,
        offset: cursor ? 0 : offset,
        hasMore: notifications.length === limit,
        nextCursor,
      },
    })
  } catch (error) {
    console.error('Notifications GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create notification (system/admin use)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, type, title, message, data, sendToAll, userRoles } = body

    // Validate required fields
    if (!type || !title || !message) {
      return NextResponse.json(
        { error: 'Type, title, and message are required' },
        { status: 400 }
      )
    }

    // Validate notification type
    if (!Object.values(NotificationType).includes(type)) {
      return NextResponse.json({ error: 'Invalid notification type' }, { status: 400 })
    }

    // Handle bulk notifications (admin only)
    if (sendToAll || userRoles) {
      // Get users based on roles
      const whereClause: { role?: { in: UserRole[] } } = {}
      
      if (userRoles && Array.isArray(userRoles) && userRoles.length > 0) {
        whereClause.role = { in: userRoles as UserRole[] }
      }

      const users = await db.user.findMany({
        where: whereClause,
        select: { id: true },
      })

      // Create notifications for all users
      const notificationsData = users.map((u) => ({
        userId: u.id,
        type: type as NotificationType,
        title,
        message,
        data: data ? JSON.stringify(data) : null,
        read: false,
      }))

      await db.notification.createMany({
        data: notificationsData,
      })

      return NextResponse.json({
        success: true,
        message: `Notification sent to ${users.length} users`,
        count: users.length,
      })
    }

    // Single user notification
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    const notification = await db.notification.create({
      data: {
        userId,
        type: type as NotificationType,
        title,
        message,
        data: data ? JSON.stringify(data) : null,
        read: false,
      },
    })

    return NextResponse.json({
      success: true,
      notification: {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data ? JSON.parse(notification.data) : null,
        read: notification.read,
        createdAt: notification.createdAt,
      },
    })
  } catch (error) {
    console.error('Notifications POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - Mark as read, mark all as read, or update notification
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { notificationId, userId, markAllRead, markAsUnread, updateData } = body

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Mark all notifications as read
    if (markAllRead) {
      const result = await db.notification.updateMany({
        where: {
          userId,
          read: false,
        },
        data: {
          read: true,
          readAt: new Date(),
        },
      })

      return NextResponse.json({
        success: true,
        message: 'All notifications marked as read',
        count: result.count,
      })
    }

    // Mark single notification
    if (!notificationId) {
      return NextResponse.json({ error: 'Notification ID is required' }, { status: 400 })
    }

    // Toggle read status or update data
    const updatePayload: {
      read?: boolean
      readAt?: Date | null
      data?: string
    } = {}

    if (markAsUnread !== undefined) {
      updatePayload.read = !markAsUnread
      updatePayload.readAt = markAsUnread ? null : new Date()
    } else {
      // Default: mark as read
      updatePayload.read = true
      updatePayload.readAt = new Date()
    }

    if (updateData) {
      updatePayload.data = JSON.stringify(updateData)
    }

    const notification = await db.notification.update({
      where: {
        id: notificationId,
        userId,
      },
      data: updatePayload,
    })

    return NextResponse.json({
      success: true,
      notification: {
        id: notification.id,
        read: notification.read,
        readAt: notification.readAt,
      },
    })
  } catch (error) {
    console.error('Notifications PUT error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete notification(s)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const notificationId = searchParams.get('notificationId')
    const userId = searchParams.get('userId')
    const deleteAll = searchParams.get('deleteAll') === 'true'
    const deleteRead = searchParams.get('deleteRead') === 'true'

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Delete all notifications for user
    if (deleteAll) {
      await db.notification.deleteMany({
        where: { userId },
      })

      return NextResponse.json({
        success: true,
        message: 'All notifications deleted',
      })
    }

    // Delete all read notifications
    if (deleteRead) {
      await db.notification.deleteMany({
        where: {
          userId,
          read: true,
        },
      })

      return NextResponse.json({
        success: true,
        message: 'All read notifications deleted',
      })
    }

    // Delete single notification
    if (!notificationId) {
      return NextResponse.json({ error: 'Notification ID is required' }, { status: 400 })
    }

    await db.notification.delete({
      where: {
        id: notificationId,
        userId,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Notifications DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
