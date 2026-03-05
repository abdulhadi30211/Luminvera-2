// Support Tickets API Route - Comprehensive Ticket Management
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { NotificationType } from '@prisma/client'

// Ticket categories
const TICKET_CATEGORIES = [
  'order_issue',
  'payment_issue',
  'product_question',
  'shipping_inquiry',
  'return_refund',
  'account_issue',
  'seller_dispute',
  'technical_support',
  'feedback',
  'other'
] as const

// Priority levels with response time SLAs
const PRIORITY_LEVELS = {
  low: { slaHours: 72, color: '#6B7280' },
  normal: { slaHours: 48, color: '#3B82F6' },
  high: { slaHours: 24, color: '#F59E0B' },
  urgent: { slaHours: 4, color: '#EF4444' }
} as const

// Generate unique ticket number
async function generateTicketNumber(): Promise<string> {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `TKT-${timestamp}-${random}`
}

// GET - Fetch tickets
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const userRole = searchParams.get('userRole')
    const ticketId = searchParams.get('ticketId')
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const category = searchParams.get('category')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Get single ticket by ID
    if (ticketId) {
      const ticket = await db.supportTicket.findUnique({
        where: { id: ticketId },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' }
          }
        }
      })

      if (!ticket) {
        return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
      }

      // Check access permission
      if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN' && ticket.userId !== userId) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }

      // Get user info for ticket
      const ticketUser = await db.user.findUnique({
        where: { id: ticket.userId },
        select: { id: true, email: true, firstName: true, lastName: true, avatarUrl: true }
      })

      return NextResponse.json({
        success: true,
        ticket: {
          ...ticket,
          user: ticketUser,
          messages: ticket.messages.map(m => ({
            id: m.id,
            senderId: m.senderId,
            senderRole: m.senderRole,
            message: m.message,
            attachments: m.attachments ? JSON.parse(m.attachments) : null,
            createdAt: m.createdAt
          }))
        }
      })
    }

    // List tickets
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Build query - Admin sees all, users see their own
    const where: any = {}

    // Role-based filtering
    if (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') {
      // Admin can see all tickets
      if (status) {
        where.status = status
      }
    } else {
      // Regular users only see their own tickets
      where.userId = userId
    }

    // Apply filters
    if (priority) {
      where.priority = priority
    }

    if (category) {
      where.category = category
    }

    // Get tickets with count
    const [tickets, count] = await Promise.all([
      db.supportTicket.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit
      }),
      db.supportTicket.count({ where })
    ])

    // Get user info for each ticket
    const userIds = [...new Set(tickets.map(t => t.userId))]
    const users = await db.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, email: true, firstName: true, lastName: true, avatarUrl: true }
    })

    const userMap = new Map(users.map(u => [u.id, u]))

    // Get counts by status
    const statusWhere = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN' 
      ? {} 
      : { userId }
    
    const allTickets = await db.supportTicket.findMany({
      where: statusWhere,
      select: { status: true }
    })

    const countsByStatus: Record<string, number> = {}
    allTickets.forEach(t => {
      countsByStatus[t.status] = (countsByStatus[t.status] || 0) + 1
    })

    return NextResponse.json({
      success: true,
      tickets: tickets.map(t => ({
        id: t.id,
        ticketNumber: t.ticketNumber,
        userId: t.userId,
        user: userMap.get(t.userId),
        subject: t.subject,
        category: t.category,
        priority: t.priority,
        status: t.status,
        assignedTo: t.assignedTo,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
        resolvedAt: t.resolvedAt
      })),
      countsByStatus,
      pagination: {
        total: count,
        limit,
        offset,
        hasMore: offset + limit < count
      }
    })
  } catch (error) {
    console.error('Support tickets GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create new ticket
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, subject, category, priority, message, attachments, orderId, productId } = body

    if (!userId || !subject || !message) {
      return NextResponse.json({ 
        error: 'User ID, subject, and message are required' 
      }, { status: 400 })
    }

    // Validate category
    if (category && !TICKET_CATEGORIES.includes(category)) {
      return NextResponse.json({ 
        error: 'Invalid category. Valid categories: ' + TICKET_CATEGORIES.join(', ') 
      }, { status: 400 })
    }

    // Validate priority
    const ticketPriority = priority || 'normal'
    if (!Object.keys(PRIORITY_LEVELS).includes(ticketPriority)) {
      return NextResponse.json({ 
        error: 'Invalid priority. Valid priorities: low, normal, high, urgent' 
      }, { status: 400 })
    }

    // Generate ticket number
    const ticketNumber = await generateTicketNumber()

    // Create ticket
    const ticket = await db.supportTicket.create({
      data: {
        ticketNumber,
        userId,
        subject,
        category: category || 'other',
        priority: ticketPriority,
        status: 'open'
      }
    })

    // Create initial message
    await db.supportTicketMessage.create({
      data: {
        ticketId: ticket.id,
        senderId: userId,
        senderRole: 'user',
        message,
        attachments: attachments ? JSON.stringify(attachments) : null
      }
    })

    // Create notification for admins
    const admins = await db.user.findMany({
      where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } },
      select: { id: true }
    })

    if (admins.length > 0) {
      await db.notification.createMany({
        data: admins.map(admin => ({
          userId: admin.id,
          type: NotificationType.SYSTEM,
          title: 'New Support Ticket',
          message: `New ${ticketPriority} priority ticket: ${subject}`,
          data: JSON.stringify({ 
            ticketId: ticket.id, 
            ticketNumber,
            priority: ticketPriority 
          }),
          read: false
        }))
      })
    }

    return NextResponse.json({
      success: true,
      ticket: {
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        subject: ticket.subject,
        category: ticket.category,
        priority: ticket.priority,
        status: ticket.status,
        createdAt: ticket.createdAt
      }
    })
  } catch (error) {
    console.error('Support tickets POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - Update ticket status, add response, assign
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      ticketId, 
      userId, 
      userRole,
      status, 
      priority,
      assignedTo,
      message,
      attachments,
      resolution,
      adminNotes
    } = body

    if (!ticketId) {
      return NextResponse.json({ error: 'Ticket ID is required' }, { status: 400 })
    }

    // Get current ticket
    const currentTicket = await db.supportTicket.findUnique({
      where: { id: ticketId }
    })

    if (!currentTicket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    // Check permissions
    const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN'
    const isOwner = currentTicket.userId === userId

    // Build update payload
    const updatePayload: any = {}

    // Status update (admin only)
    if (status && isAdmin) {
      const validStatuses = ['open', 'in_progress', 'waiting_response', 'resolved', 'closed']
      if (!validStatuses.includes(status)) {
        return NextResponse.json({ 
          error: 'Invalid status. Valid statuses: ' + validStatuses.join(', ') 
        }, { status: 400 })
      }
      updatePayload.status = status

      // Set resolved_at if status is resolved or closed
      if (status === 'resolved' || status === 'closed') {
        updatePayload.resolvedAt = new Date()
      }
    }

    // Priority update (admin only)
    if (priority && isAdmin) {
      if (!Object.keys(PRIORITY_LEVELS).includes(priority)) {
        return NextResponse.json({ 
          error: 'Invalid priority. Valid priorities: low, normal, high, urgent' 
        }, { status: 400 })
      }
      updatePayload.priority = priority
    }

    // Assign ticket (admin only)
    if (assignedTo !== undefined && isAdmin) {
      updatePayload.assignedTo = assignedTo
    }

    // Update ticket
    if (Object.keys(updatePayload).length > 0) {
      await db.supportTicket.update({
        where: { id: ticketId },
        data: updatePayload
      })
    }

    // Add message/response
    if (message) {
      if (!isOwner && !isAdmin) {
        return NextResponse.json({ error: 'Not authorized to add message' }, { status: 403 })
      }

      await db.supportTicketMessage.create({
        data: {
          ticketId,
          senderId: userId,
          senderRole: isAdmin ? 'admin' : 'user',
          message,
          attachments: attachments ? JSON.stringify(attachments) : null
        }
      })

      // If user responds, set status back to open if was waiting_response
      if (!isAdmin && currentTicket.status === 'waiting_response') {
        await db.supportTicket.update({
          where: { id: ticketId },
          data: { status: 'open' }
        })
      }

      // Notify relevant party
      if (isAdmin) {
        // Notify user of admin response
        await db.notification.create({
          data: {
            userId: currentTicket.userId,
            type: NotificationType.SYSTEM,
            title: 'Support Ticket Updated',
            message: `Your ticket "${currentTicket.subject}" has a new response`,
            data: JSON.stringify({ ticketId, ticketNumber: currentTicket.ticketNumber }),
            read: false
          }
        })
      } else {
        // Notify assigned admin or all admins
        let targetAdmins: string[] = []
        
        if (currentTicket.assignedTo) {
          targetAdmins = [currentTicket.assignedTo]
        } else {
          const admins = await db.user.findMany({
            where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } },
            select: { id: true }
          })
          targetAdmins = admins.map(a => a.id)
        }

        if (targetAdmins.length > 0) {
          await db.notification.createMany({
            data: targetAdmins.map(adminId => ({
              userId: adminId,
              type: NotificationType.SYSTEM,
              title: 'Support Ticket Response',
              message: `User responded to ticket "${currentTicket.subject}"`,
              data: JSON.stringify({ ticketId, ticketNumber: currentTicket.ticketNumber }),
              read: false
            }))
          })
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Ticket updated successfully'
    })
  } catch (error) {
    console.error('Support tickets PUT error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete ticket (admin only or soft delete)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const ticketId = searchParams.get('ticketId')
    const userId = searchParams.get('userId')
    const userRole = searchParams.get('userRole')

    if (!ticketId) {
      return NextResponse.json({ error: 'Ticket ID is required' }, { status: 400 })
    }

    // Only admins can delete tickets
    if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Only admins can delete tickets' }, { status: 403 })
    }

    // Delete ticket messages first
    await db.supportTicketMessage.deleteMany({
      where: { ticketId }
    })

    // Delete ticket
    await db.supportTicket.delete({
      where: { id: ticketId }
    })

    return NextResponse.json({
      success: true,
      message: 'Ticket deleted successfully'
    })
  } catch (error) {
    console.error('Support tickets DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
