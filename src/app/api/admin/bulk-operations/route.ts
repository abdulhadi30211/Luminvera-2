// Admin Bulk Operations API Route
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ProductStatus, OrderStatus } from '@prisma/client'

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

// POST - Handle bulk operations
export async function POST(request: NextRequest) {
  try {
    const user = await getAdminUser(request)
    
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { operation, ids, data } = body

    if (!operation || !ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Operation and ids array are required' 
      }, { status: 400 })
    }

    // Limit bulk operations to 100 items at a time
    if (ids.length > 100) {
      return NextResponse.json({ 
        success: false, 
        error: 'Maximum 100 items allowed per bulk operation' 
      }, { status: 400 })
    }

    let result: { success: number; failed: number; errors: string[] } = {
      success: 0,
      failed: 0,
      errors: [],
    }

    // ==========================================
    // BULK UPDATE PRODUCTS
    // ==========================================
    if (operation === 'update-products') {
      const { status, categoryId, priceAdjustment } = data || {}

      // Validate status if provided
      if (status && !Object.values(ProductStatus).includes(status)) {
        return NextResponse.json({ 
          success: false, 
          error: 'Invalid product status' 
        }, { status: 400 })
      }

      // Build update data
      const updateData: Record<string, unknown> = {}
      if (status) updateData.status = status
      if (categoryId) updateData.categoryId = categoryId

      // Handle price adjustment
      if (priceAdjustment) {
        const { type, value } = priceAdjustment // type: 'increase' | 'decrease' | 'set', value: percentage or fixed
        const products = await db.product.findMany({
          where: { id: { in: ids } },
          select: { id: true, basePrice: true },
        })

        for (const product of products) {
          try {
            let newPrice = product.basePrice
            
            if (type === 'increase' && value) {
              newPrice = product.basePrice * (1 + value / 100)
            } else if (type === 'decrease' && value) {
              newPrice = product.basePrice * (1 - value / 100)
            } else if (type === 'set' && value) {
              newPrice = value
            }

            await db.product.update({
              where: { id: product.id },
              data: { 
                basePrice: Math.round(newPrice * 100) / 100,
                ...updateData,
              },
            })
            result.success++
          } catch {
            result.failed++
            result.errors.push(`Failed to update product ${product.id}`)
          }
        }
      } else {
        // Simple update without price adjustment
        try {
          const updateResult = await db.product.updateMany({
            where: { id: { in: ids } },
            data: updateData,
          })
          result.success = updateResult.count
          result.failed = ids.length - updateResult.count
        } catch (error) {
          result.failed = ids.length
          result.errors.push('Bulk update failed')
        }
      }

      // Create audit log
      await db.auditLog.create({
        data: {
          userId: user.id,
          userRole: user.role,
          action: 'BULK_UPDATE_PRODUCTS',
          entityType: 'product',
          newValue: JSON.stringify({
            productIds: ids,
            updates: data,
            successCount: result.success,
            failedCount: result.failed,
          }),
        },
      })
    }

    // ==========================================
    // BULK UPDATE ORDERS
    // ==========================================
    else if (operation === 'update-orders') {
      const { status: newStatus, trackingNumber, courierName } = data || {}

      // Validate status
      const validStatuses: OrderStatus[] = [
        'PLACED', 'CONFIRMED', 'PACKED', 'SHIPPED', 'DELIVERED', 
        'COMPLETED', 'CANCELLED', 'RETURNED', 'REFUNDED', 'DISPUTED'
      ]
      
      if (newStatus && !validStatuses.includes(newStatus)) {
        return NextResponse.json({ 
          success: false, 
          error: 'Invalid order status' 
        }, { status: 400 })
      }

      // Get orders to validate transitions
      const orders = await db.order.findMany({
        where: { id: { in: ids } },
        select: { id: true, status: true },
      })

      // Define allowed status transitions
      const allowedTransitions: Record<string, string[]> = {
        PLACED: ['CONFIRMED', 'CANCELLED'],
        CONFIRMED: ['PACKED', 'CANCELLED'],
        PACKED: ['SHIPPED', 'CANCELLED'],
        SHIPPED: ['DELIVERED', 'RETURNED'],
        DELIVERED: ['COMPLETED', 'RETURNED', 'DISPUTED'],
        COMPLETED: ['RETURNED', 'DISPUTED'],
        CANCELLED: [],
        RETURNED: ['REFUNDED'],
        REFUNDED: [],
        DISPUTED: ['RESOLVED'],
      }

      for (const order of orders) {
        try {
          // Validate status transition
          if (newStatus && !allowedTransitions[order.status]?.includes(newStatus)) {
            result.failed++
            result.errors.push(`Cannot transition order ${order.id} from ${order.status} to ${newStatus}`)
            continue
          }

          const updateData: Record<string, unknown> = {}
          if (newStatus) {
            updateData.status = newStatus
            
            // Set timestamps based on status
            if (newStatus === 'CONFIRMED') updateData.confirmedAt = new Date()
            if (newStatus === 'SHIPPED') {
              updateData.shippedAt = new Date()
              if (trackingNumber) updateData.courierTrackingNumber = trackingNumber
              if (courierName) updateData.courierName = courierName
            }
            if (newStatus === 'DELIVERED') updateData.deliveredAt = new Date()
            if (newStatus === 'COMPLETED') updateData.completedAt = new Date()
            if (newStatus === 'CANCELLED') updateData.cancelledAt = new Date()
          }

          await db.order.update({
            where: { id: order.id },
            data: updateData,
          })

          // Create notification for the order's user
          const orderWithUser = await db.order.findUnique({
            where: { id: order.id },
            select: { userId: true, orderNumber: true },
          })
          
          if (orderWithUser && newStatus) {
            await db.notification.create({
              data: {
                userId: orderWithUser.userId,
                type: 'ORDER',
                title: 'Order Status Updated',
                message: `Your order #${orderWithUser.orderNumber} status has been updated to ${newStatus}.`,
                data: JSON.stringify({ orderId: order.id, status: newStatus }),
              },
            })
          }

          result.success++
        } catch {
          result.failed++
          result.errors.push(`Failed to update order ${order.id}`)
        }
      }

      // Create audit log
      await db.auditLog.create({
        data: {
          userId: user.id,
          userRole: user.role,
          action: 'BULK_UPDATE_ORDERS',
          entityType: 'order',
          newValue: JSON.stringify({
            orderIds: ids,
            updates: data,
            successCount: result.success,
            failedCount: result.failed,
          }),
        },
      })
    }

    // ==========================================
    // BULK SEND NOTIFICATIONS
    // ==========================================
    else if (operation === 'send-notifications') {
      const { title, message, type, userIds, allUsers, allSellers, allAdmins } = data || {}

      if (!title || !message) {
        return NextResponse.json({ 
          success: false, 
          error: 'Title and message are required for notifications' 
        }, { status: 400 })
      }

      let targetUserIds: string[] = []

      // Determine target users
      if (userIds && Array.isArray(userIds)) {
        targetUserIds = userIds
      } else if (allUsers) {
        const users = await db.user.findMany({
          where: { accountStatus: 'ACTIVE' },
          select: { id: true },
        })
        targetUserIds = users.map(u => u.id)
      } else if (allSellers) {
        const sellers = await db.seller.findMany({
          where: { status: 'VERIFIED' },
          select: { userId: true },
        })
        targetUserIds = sellers.map(s => s.userId)
      } else if (allAdmins) {
        const admins = await db.user.findMany({
          where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } },
          select: { id: true },
        })
        targetUserIds = admins.map(a => a.id)
      } else {
        return NextResponse.json({ 
          success: false, 
          error: 'Specify userIds, allUsers, allSellers, or allAdmins' 
        }, { status: 400 })
      }

      // Create notifications in batches
      const batchSize = 50
      for (let i = 0; i < targetUserIds.length; i += batchSize) {
        const batch = targetUserIds.slice(i, i + batchSize)
        
        try {
          await db.notification.createMany({
            data: batch.map(userId => ({
              userId,
              type: type || 'SYSTEM',
              title,
              message,
            })),
          })
          result.success += batch.length
        } catch {
          result.failed += batch.length
          result.errors.push(`Failed to send to batch starting at index ${i}`)
        }
      }

      // Create audit log
      await db.auditLog.create({
        data: {
          userId: user.id,
          userRole: user.role,
          action: 'BULK_SEND_NOTIFICATIONS',
          entityType: 'notification',
          newValue: JSON.stringify({
            title,
            message,
            type,
            targetCount: targetUserIds.length,
            successCount: result.success,
            failedCount: result.failed,
          }),
        },
      })
    }

    // ==========================================
    // BULK APPROVE SELLERS
    // ==========================================
    else if (operation === 'approve-sellers') {
      const sellers = await db.seller.findMany({
        where: { id: { in: ids }, status: 'PENDING' },
        select: { id: true, userId: true },
      })

      for (const seller of sellers) {
        try {
          await db.seller.update({
            where: { id: seller.id },
            data: {
              status: 'VERIFIED',
              verifiedAt: new Date(),
              verifiedBy: user.id,
            },
          })

          // Notify seller
          await db.notification.create({
            data: {
              userId: seller.userId,
              type: 'APPROVAL',
              title: 'Seller Account Approved',
              message: 'Congratulations! Your seller account has been approved. You can now start selling on LUMINVERA.',
            },
          })

          result.success++
        } catch {
          result.failed++
          result.errors.push(`Failed to approve seller ${seller.id}`)
        }
      }

      // Create audit log
      await db.auditLog.create({
        data: {
          userId: user.id,
          userRole: user.role,
          action: 'BULK_APPROVE_SELLERS',
          entityType: 'seller',
          newValue: JSON.stringify({
            sellerIds: ids,
            successCount: result.success,
            failedCount: result.failed,
          }),
        },
      })
    }

    // ==========================================
    // BULK APPROVE PRODUCTS
    // ==========================================
    else if (operation === 'approve-products') {
      const products = await db.product.findMany({
        where: { id: { in: ids }, status: 'PENDING_REVIEW' },
        select: { id: true, sellerId: true },
      })

      for (const product of products) {
        try {
          await db.product.update({
            where: { id: product.id },
            data: {
              status: 'LIVE',
              approvedAt: new Date(),
              approvedBy: user.id,
            },
          })

          // Create approval record
          await db.productApproval.create({
            data: {
              productId: product.id,
              sellerId: product.sellerId,
              action: 'approved',
              reviewedBy: user.id,
              reviewedAt: new Date(),
            },
          })

          result.success++
        } catch {
          result.failed++
          result.errors.push(`Failed to approve product ${product.id}`)
        }
      }

      // Create audit log
      await db.auditLog.create({
        data: {
          userId: user.id,
          userRole: user.role,
          action: 'BULK_APPROVE_PRODUCTS',
          entityType: 'product',
          newValue: JSON.stringify({
            productIds: ids,
            successCount: result.success,
            failedCount: result.failed,
          }),
        },
      })
    }

    // ==========================================
    // BULK DELETE PRODUCTS
    // ==========================================
    else if (operation === 'delete-products') {
      // Only allow deleting DRAFT or DISABLED products
      const products = await db.product.findMany({
        where: { 
          id: { in: ids }, 
          status: { in: ['DRAFT', 'DISABLED', 'REJECTED'] } 
        },
        select: { id: true },
      })

      const productIdsToDelete = products.map(p => p.id)

      try {
        // Delete related items first
        await db.cartItem.deleteMany({
          where: { productId: { in: productIdsToDelete } },
        })
        
        await db.wishlistItem.deleteMany({
          where: { productId: { in: productIdsToDelete } },
        })

        const deleteResult = await db.product.deleteMany({
          where: { id: { in: productIdsToDelete } },
        })
        
        result.success = deleteResult.count
        result.failed = ids.length - deleteResult.count
      } catch (error) {
        result.failed = ids.length
        result.errors.push('Bulk delete failed')
      }

      // Create audit log
      await db.auditLog.create({
        data: {
          userId: user.id,
          userRole: user.role,
          action: 'BULK_DELETE_PRODUCTS',
          entityType: 'product',
          newValue: JSON.stringify({
            productIds: ids,
            successCount: result.success,
            failedCount: result.failed,
          }),
        },
      })
    }

    // ==========================================
    // BULK SUSPEND USERS
    // ==========================================
    else if (operation === 'suspend-users') {
      const { reason } = data || {}

      // Cannot suspend other admins
      const users = await db.user.findMany({
        where: { 
          id: { in: ids },
          role: { in: ['USER', 'SELLER'] },
        },
        select: { id: true },
      })

      const userIdsToSuspend = users.map(u => u.id)

      try {
        const updateResult = await db.user.updateMany({
          where: { id: { in: userIdsToSuspend } },
          data: { accountStatus: 'SUSPENDED' },
        })

        // Invalidate sessions
        await db.session.updateMany({
          where: { 
            userId: { in: userIdsToSuspend },
            isActive: true,
          },
          data: { isActive: false },
        })

        // Create notifications for suspended users
        await db.notification.createMany({
          data: userIdsToSuspend.map(userId => ({
            userId,
            type: 'SUSPENSION',
            title: 'Account Suspended',
            message: reason || 'Your account has been suspended. Please contact support for more information.',
          })),
        })

        result.success = updateResult.count
        result.failed = ids.length - updateResult.count
      } catch {
        result.failed = ids.length
        result.errors.push('Bulk suspend failed')
      }

      // Create audit log
      await db.auditLog.create({
        data: {
          userId: user.id,
          userRole: user.role,
          action: 'BULK_SUSPEND_USERS',
          entityType: 'user',
          newValue: JSON.stringify({
            userIds: ids,
            reason,
            successCount: result.success,
            failedCount: result.failed,
          }),
        },
      })
    }

    // ==========================================
    // INVALID OPERATION
    // ==========================================
    else {
      return NextResponse.json({ 
        success: false, 
        error: `Invalid operation: ${operation}. Valid operations: update-products, update-orders, send-notifications, approve-sellers, approve-products, delete-products, suspend-users` 
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error('Bulk operation error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
