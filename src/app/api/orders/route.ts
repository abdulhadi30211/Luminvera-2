import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { OrderStatus, PaymentStatus, PaymentMethod, UserRole } from '@prisma/client'

// Helper to hash password/token
async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(token)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// Helper to get auth user from request
async function getAuthUser(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value
  if (!token) return null
  
  const tokenHash = await hashToken(token)
  
  const session = await db.session.findFirst({
    where: {
      tokenHash,
      isActive: true,
      expiresAt: { gte: new Date() }
    },
    include: {
      user: true
    }
  })
  
  if (!session) return null
  
  return session.user
}

// GET /api/orders - Get user's orders or seller orders or all orders (admin)
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const orderId = searchParams.get('id')
    const orderNumber = searchParams.get('orderNumber')
    const sellerId = searchParams.get('sellerId')
    const userId = searchParams.get('userId')
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '10')
    const skip = (page - 1) * pageSize

    // Fetch single order by ID
    if (orderId) {
      const order = await db.order.findUnique({
        where: { id: orderId },
        include: {
          items: {
            include: {
              product: {
                select: { id: true, name: true, sku: true, primaryImageUrl: true }
              }
            }
          }
        }
      })

      if (!order) {
        return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 })
      }

      // Check permission
      const isOwner = order.userId === user.id
      const isAdmin = user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN
      let isSellerOfOrder = false
      
      if (user.role === UserRole.SELLER) {
        const seller = await db.seller.findFirst({
          where: { userId: user.id }
        })
        isSellerOfOrder = seller !== null && order.sellerId === seller.id
      }

      if (!isOwner && !isAdmin && !isSellerOfOrder) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 })
      }

      return NextResponse.json({
        success: true,
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          userId: order.userId,
          sellerId: order.sellerId,
          parentOrderId: order.parentOrderId,
          status: order.status,
          subtotal: order.subtotal,
          discount: order.discount,
          couponDiscount: order.couponDiscount,
          deliveryFee: order.deliveryFee,
          tax: order.tax,
          total: order.total,
          paymentMethod: order.paymentMethod,
          paymentStatus: order.paymentStatus,
          paymentReference: order.paymentReference,
          shippingRecipientName: order.shippingRecipientName,
          shippingPhone: order.shippingPhone,
          shippingCountry: order.shippingCountry,
          shippingProvince: order.shippingProvince,
          shippingCity: order.shippingCity,
          shippingArea: order.shippingArea,
          shippingStreetAddress: order.shippingStreetAddress,
          shippingPostalCode: order.shippingPostalCode,
          placedAt: order.placedAt,
          confirmedAt: order.confirmedAt,
          packedAt: order.packedAt,
          shippedAt: order.shippedAt,
          deliveredAt: order.deliveredAt,
          completedAt: order.completedAt,
          cancelledAt: order.cancelledAt,
          cancelReason: order.cancelReason,
          estimatedDeliveryDate: order.estimatedDeliveryDate,
          actualDeliveryDate: order.actualDeliveryDate,
          courierName: order.courierName,
          courierTrackingNumber: order.courierTrackingNumber,
          customerNotes: order.customerNotes,
          sellerNotes: order.sellerNotes,
          adminNotes: order.adminNotes,
          createdAt: order.createdAt,
          items: order.items.map(item => ({
            id: item.id,
            productId: item.productId,
            productName: item.productName,
            productSku: item.productSku,
            productImageUrl: item.productImageUrl,
            variantAttributes: item.variantAttributes,
            unitPrice: item.unitPrice,
            quantity: item.quantity,
            totalPrice: item.totalPrice,
            sellerId: item.sellerId,
            commissionRate: item.commissionRate,
            commissionAmount: item.commissionAmount,
            sellerEarnings: item.sellerEarnings,
            itemStatus: item.itemStatus,
            product: item.product,
          })),
          statusHistory: order.statusHistory ? JSON.parse(order.statusHistory) : [],
        }
      })
    }

    // Build where clause based on user role
    const whereClause: Record<string, unknown> = {}

    // Role-based filtering
    if (user.role === UserRole.USER) {
      // User can only see their own orders
      whereClause.userId = userId || user.id
    } else if (user.role === UserRole.SELLER) {
      // Seller sees orders for their products
      const seller = await db.seller.findFirst({
        where: { userId: user.id }
      })
      
      if (seller) {
        if (sellerId && sellerId !== seller.id) {
          return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 })
        }
        whereClause.sellerId = seller.id
      }
    } else if (user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN) {
      // Admin can see all orders or filter by userId/sellerId
      if (userId) {
        whereClause.userId = userId
      }
      if (sellerId) {
        whereClause.sellerId = sellerId
      }
    }

    if (status) {
      whereClause.status = status as OrderStatus
    }

    if (orderNumber) {
      whereClause.orderNumber = orderNumber
    }

    // Get total count
    const totalCount = await db.order.count({ where: whereClause })

    // Get orders with pagination
    const orders = await db.order.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
      include: {
        items: true,
        user: {
          select: { id: true, firstName: true, lastName: true, email: true }
        },
        seller: {
          select: { id: true, storeName: true }
        }
      }
    })

    // Transform orders
    const transformedOrders = orders.map(order => ({
      id: order.id,
      orderNumber: order.orderNumber,
      userId: order.userId,
      sellerId: order.sellerId,
      status: order.status,
      subtotal: order.subtotal,
      discount: order.discount,
      couponDiscount: order.couponDiscount,
      deliveryFee: order.deliveryFee,
      tax: order.tax,
      total: order.total,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      shippingRecipientName: order.shippingRecipientName,
      shippingPhone: order.shippingPhone,
      shippingCity: order.shippingCity,
      shippingStreetAddress: order.shippingStreetAddress,
      placedAt: order.placedAt,
      deliveredAt: order.deliveredAt,
      estimatedDeliveryDate: order.estimatedDeliveryDate,
      createdAt: order.createdAt,
      items: order.items.map(item => ({
        id: item.id,
        productId: item.productId,
        productName: item.productName,
        productSku: item.productSku,
        productImageUrl: item.productImageUrl,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        totalPrice: item.totalPrice,
      })),
      itemCount: order.items.length,
      user: order.user,
      seller: order.seller,
    }))

    return NextResponse.json({
      success: true,
      orders: transformedOrders,
      data: transformedOrders,
      pagination: {
        total: totalCount,
        page,
        pageSize,
        totalPages: Math.ceil(totalCount / pageSize),
      }
    })
  } catch (error) {
    console.error('Orders fetch error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch orders' }, { status: 500 })
  }
}

// POST /api/orders - Create new order
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      items, 
      shippingAddress, 
      paymentMethod,
      subtotal,
      deliveryFee,
      discount,
      couponDiscount,
      couponCode,
      tax,
      total,
      customerNotes,
      walletPhone,
    } = body

    // Validate required fields
    if (!items || !items.length) {
      return NextResponse.json({ success: false, error: 'Order items are required' }, { status: 400 })
    }

    if (!shippingAddress) {
      return NextResponse.json({ success: false, error: 'Shipping address is required' }, { status: 400 })
    }

    // Validate stock availability for all items
    for (const item of items) {
      const product = await db.product.findUnique({
        where: { id: item.productId },
        select: { id: true, name: true, stockQuantity: true, trackInventory: true, status: true }
      })

      if (!product) {
        return NextResponse.json({ 
          success: false, 
          error: `Product not found: ${item.productId}` 
        }, { status: 400 })
      }

      if (product.status !== 'LIVE') {
        return NextResponse.json({ 
          success: false, 
          error: `Product "${product.name}" is not available` 
        }, { status: 400 })
      }

      if (product.trackInventory && product.stockQuantity < item.quantity) {
        return NextResponse.json({ 
          success: false, 
          error: `Insufficient stock for "${product.name}". Available: ${product.stockQuantity}` 
        }, { status: 400 })
      }
    }

    // Get the first seller_id from items (assuming single seller per order for now)
    const firstItem = items[0]
    const firstProduct = await db.product.findUnique({
      where: { id: firstItem.productId },
      select: { sellerId: true }
    })

    const sellerId = firstProduct?.sellerId

    // Generate order number
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`

    // Calculate estimated delivery date (5-7 days from now)
    const estimatedDeliveryDate = new Date()
    estimatedDeliveryDate.setDate(estimatedDeliveryDate.getDate() + 7)

    // Determine payment status based on method
    let paymentStatus: PaymentStatus = PaymentStatus.PENDING
    if (paymentMethod === 'COD') {
      paymentStatus = PaymentStatus.PENDING
    } else if (paymentMethod === 'WALLET') {
      // Check wallet balance
      const wallet = await db.wallet.findUnique({
        where: { userId: user.id }
      })
      
      if (!wallet || wallet.balance < total) {
        return NextResponse.json({ 
          success: false, 
          error: 'Insufficient wallet balance' 
        }, { status: 400 })
      }
      paymentStatus = PaymentStatus.PROCESSING
    } else if (paymentMethod === 'JAZZ_CASH' || paymentMethod === 'EASY_PAISA') {
      paymentStatus = PaymentStatus.PROCESSING
    } else if (paymentMethod === 'CARD') {
      paymentStatus = PaymentStatus.PROCESSING
    }

    // Create order and related records in a transaction
    const result = await db.$transaction(async (tx) => {
      // Create order
      const order = await tx.order.create({
        data: {
          orderNumber,
          userId: user.id,
          sellerId,
          status: OrderStatus.PLACED,
          subtotal: parseFloat(subtotal) || 0,
          discount: parseFloat(discount) || 0,
          couponDiscount: parseFloat(couponDiscount) || 0,
          deliveryFee: parseFloat(deliveryFee) || 0,
          tax: parseFloat(tax) || 0,
          total: parseFloat(total) || 0,
          paymentMethod: paymentMethod as PaymentMethod || PaymentMethod.COD,
          paymentStatus,
          shippingRecipientName: shippingAddress.recipientName,
          shippingPhone: shippingAddress.phone,
          shippingCountry: shippingAddress.country || 'Pakistan',
          shippingProvince: shippingAddress.province,
          shippingCity: shippingAddress.city,
          shippingArea: shippingAddress.area,
          shippingStreetAddress: shippingAddress.streetAddress,
          shippingPostalCode: shippingAddress.postalCode,
          placedAt: new Date(),
          estimatedDeliveryDate,
          customerNotes,
          statusHistory: JSON.stringify([{
            status: 'PLACED',
            timestamp: new Date().toISOString(),
            notes: 'Order placed by customer'
          }])
        }
      })

      // Create order items and calculate commissions
      let totalCommission = 0
      let totalSellerEarnings = 0

      for (const item of items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          include: { seller: true }
        })

        if (product && product.seller) {
          const seller = product.seller
          const commissionRate = seller.commissionRate || 10
          const itemTotalPrice = item.unitPrice * item.quantity
          const commissionAmount = itemTotalPrice * (commissionRate / 100)
          const sellerEarnings = itemTotalPrice - commissionAmount

          totalCommission += commissionAmount
          totalSellerEarnings += sellerEarnings

          await tx.orderItem.create({
            data: {
              orderId: order.id,
              productId: item.productId,
              variantId: item.variantId,
              sellerId: product.sellerId!,
              productName: product.name,
              productSku: product.sku,
              productImageUrl: product.primaryImageUrl,
              variantAttributes: item.variantAttributes ? JSON.stringify(item.variantAttributes) : null,
              unitPrice: item.unitPrice,
              quantity: item.quantity,
              totalPrice: itemTotalPrice,
              commissionRate,
              commissionAmount,
              sellerEarnings,
              itemStatus: OrderStatus.PLACED,
            }
          })

          // Update product stock
          if (product.trackInventory) {
            const newStock = Math.max(0, product.stockQuantity - item.quantity)
            const newStockSold = product.stockSold + item.quantity
            
            await tx.product.update({
              where: { id: item.productId },
              data: {
                stockQuantity: newStock,
                stockSold: newStockSold,
                status: newStock === 0 ? 'OUT_OF_STOCK' : product.status,
              }
            })
          }

          // Update seller stats
          await tx.seller.update({
            where: { id: seller.id },
            data: {
              totalOrders: { increment: 1 },
              totalSales: { increment: item.quantity },
              totalEarnings: { increment: sellerEarnings },
              pendingBalance: { increment: sellerEarnings },
            }
          })
        }
      }

      // Create payment record
      const paymentReference = `PAY-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
      
      await tx.payment.create({
        data: {
          orderId: order.id,
          paymentMethod: paymentMethod as PaymentMethod || PaymentMethod.COD,
          amount: parseFloat(total) || 0,
          status: paymentStatus,
          transactionId: paymentReference,
          gatewayResponse: walletPhone ? JSON.stringify({ wallet_phone: walletPhone }) : null,
        }
      })

      // Handle wallet payment
      if (paymentMethod === 'WALLET') {
        const wallet = await tx.wallet.findUnique({
          where: { userId: user.id }
        })

        if (wallet && wallet.balance >= total) {
          // Deduct from wallet
          const newBalance = wallet.balance - total
          await tx.wallet.update({
            where: { userId: user.id },
            data: { balance: newBalance }
          })

          // Create wallet transaction
          await tx.walletTransaction.create({
            data: {
              walletId: wallet.id,
              type: 'PURCHASE',
              amount: -total,
              balanceAfter: newBalance,
              reference: order.id,
              description: `Payment for order ${orderNumber}`,
            }
          })

          // Update payment status
          await tx.payment.updateMany({
            where: { orderId: order.id },
            data: {
              status: PaymentStatus.COMPLETED,
              completedAt: new Date(),
            }
          })

          await tx.order.update({
            where: { id: order.id },
            data: { paymentStatus: PaymentStatus.COMPLETED }
          })
        }
      }

      // Create notification for user
      await tx.notification.create({
        data: {
          userId: user.id,
          type: 'ORDER',
          title: 'Order Placed Successfully',
          message: `Your order ${orderNumber} has been placed successfully. Estimated delivery: ${estimatedDeliveryDate.toLocaleDateString()}.`,
          data: JSON.stringify({ orderId: order.id, orderNumber }),
        }
      })

      // Create notification for seller
      if (sellerId) {
        const seller = await tx.seller.findUnique({
          where: { id: sellerId },
          select: { userId: true }
        })

        if (seller) {
          await tx.notification.create({
            data: {
              userId: seller.userId,
              type: 'ORDER',
              title: 'New Order Received',
              message: `You have received a new order ${orderNumber}. Please process it.`,
              data: JSON.stringify({ orderId: order.id, orderNumber }),
            }
          })
        }
      }

      // Handle coupon usage if applied
      if (couponCode) {
        const coupon = await tx.coupon.findUnique({
          where: { code: couponCode }
        })

        if (coupon) {
          // Update coupon usage count
          await tx.coupon.update({
            where: { id: coupon.id },
            data: {
              currentUses: { increment: 1 },
            }
          })
        }
      }

      return { order, totalCommission, totalSellerEarnings, paymentReference }
    })

    return NextResponse.json({
      success: true,
      order: {
        id: result.order.id,
        orderNumber: result.order.orderNumber,
        status: result.order.status,
        total: result.order.total,
        paymentMethod: result.order.paymentMethod,
        paymentStatus: result.order.paymentStatus,
        paymentReference: result.paymentReference,
        placedAt: result.order.placedAt,
        estimatedDeliveryDate: result.order.estimatedDeliveryDate,
        itemCount: items.length,
        commission: result.totalCommission,
        sellerEarnings: result.totalSellerEarnings,
      }
    })
  } catch (error) {
    console.error('Order creation error:', error)
    return NextResponse.json({ success: false, error: 'Failed to create order' }, { status: 500 })
  }
}

// PUT /api/orders - Update order status
export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { orderId, status, trackingNumber, courierName, notes, cancelReason, itemIds, itemStatus } = body

    if (!orderId) {
      return NextResponse.json({ success: false, error: 'Order ID is required' }, { status: 400 })
    }

    // Get the order first to check permissions
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: { items: true }
    })

    if (!order) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 })
    }

    // Check permissions
    const isOwner = order.userId === user.id
    const isAdmin = user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN
    
    // For seller, check if they own the order
    let isSeller = false
    if (user.role === UserRole.SELLER) {
      const seller = await db.seller.findFirst({
        where: { userId: user.id }
      })
      isSeller = seller !== null && order.sellerId === seller.id
    }

    if (!isOwner && !isAdmin && !isSeller) {
      return NextResponse.json({ success: false, error: 'Not authorized to update this order' }, { status: 403 })
    }

    // Validate status transitions
    const validTransitions: Record<string, string[]> = {
      'PLACED': ['CONFIRMED', 'CANCELLED'],
      'CONFIRMED': ['PACKED', 'CANCELLED'],
      'PACKED': ['SHIPPED', 'CANCELLED'],
      'SHIPPED': ['DELIVERED', 'RETURNED'],
      'DELIVERED': ['COMPLETED', 'RETURNED', 'DISPUTED'],
      'COMPLETED': ['RETURNED', 'DISPUTED'],
      'CANCELLED': [],
      'RETURNED': ['REFUNDED'],
      'REFUNDED': [],
      'DISPUTED': ['COMPLETED', 'RETURNED', 'REFUNDED'],
    }

    const currentStatus = order.status as string
    if (status && !validTransitions[currentStatus]?.includes(status)) {
      // Allow admin to override
      if (!isAdmin) {
        return NextResponse.json({ 
          success: false, 
          error: `Cannot transition from ${currentStatus} to ${status}` 
        }, { status: 400 })
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = {}

    if (status) {
      updateData.status = status as OrderStatus

      // Update timestamps based on status
      if (status === 'CONFIRMED') {
        updateData.confirmedAt = new Date()
      } else if (status === 'PACKED') {
        updateData.packedAt = new Date()
      } else if (status === 'SHIPPED') {
        updateData.shippedAt = new Date()
      } else if (status === 'DELIVERED') {
        updateData.deliveredAt = new Date()
        updateData.actualDeliveryDate = new Date()
        // Update payment status for COD orders
        if (order.paymentMethod === PaymentMethod.COD) {
          updateData.paymentStatus = PaymentStatus.COMPLETED
          updateData.codCollected = true
          updateData.codCollectedAt = new Date()
        }
      } else if (status === 'CANCELLED') {
        updateData.cancelledAt = new Date()
        if (cancelReason) {
          updateData.cancelReason = cancelReason
        }
      } else if (status === 'COMPLETED') {
        updateData.completedAt = new Date()
      }
    }

    if (trackingNumber) {
      updateData.courierTrackingNumber = trackingNumber
    }

    if (courierName) {
      updateData.courierName = courierName
    }

    if (notes) {
      if (isAdmin) {
        updateData.adminNotes = notes
      } else if (isSeller) {
        updateData.sellerNotes = notes
      } else {
        updateData.customerNotes = notes
      }
    }

    // Update status history
    if (status) {
      const currentHistory = order.statusHistory ? JSON.parse(order.statusHistory as string) : []
      currentHistory.push({
        status,
        previousStatus: order.status,
        timestamp: new Date().toISOString(),
        notes: notes || `Status changed from ${order.status} to ${status}`,
        changedBy: user.id
      })
      updateData.statusHistory = JSON.stringify(currentHistory)
    }

    // Execute updates in transaction
    await db.$transaction(async (tx) => {
      // Update order
      await tx.order.update({
        where: { id: orderId },
        data: updateData
      })

      // Update order items status
      if (status || itemStatus) {
        const itemUpdateStatus = itemStatus || status
        
        if (itemIds && itemIds.length > 0) {
          // Update specific items
          await tx.orderItem.updateMany({
            where: { 
              id: { in: itemIds },
              orderId 
            },
            data: { itemStatus: itemUpdateStatus as OrderStatus }
          })
        } else if (status) {
          // Update all items
          await tx.orderItem.updateMany({
            where: { orderId },
            data: { itemStatus: status as OrderStatus }
          })
        }
      }

      // Handle cancellation - restore stock
      if (status === 'CANCELLED') {
        for (const item of order.items) {
          const product = await tx.product.findUnique({
            where: { id: item.productId },
            select: { stockQuantity: true, stockSold: true, status: true }
          })

          if (product) {
            const newStock = product.stockQuantity + item.quantity
            await tx.product.update({
              where: { id: item.productId },
              data: {
                stockQuantity: newStock,
                stockSold: Math.max(0, product.stockSold - item.quantity),
                status: product.status === 'OUT_OF_STOCK' ? 'LIVE' : product.status,
              }
            })
          }

          // Update seller stats
          if (item.sellerId) {
            const seller = await tx.seller.findUnique({
              where: { id: item.sellerId },
              select: { totalOrders: true, totalSales: true, pendingBalance: true }
            })

            if (seller) {
              await tx.seller.update({
                where: { id: item.sellerId },
                data: {
                  totalOrders: Math.max(0, seller.totalOrders - 1),
                  totalSales: Math.max(0, seller.totalSales - item.quantity),
                  pendingBalance: Math.max(0, seller.pendingBalance - item.sellerEarnings),
                }
              })
            }
          }
        }

        // Handle refund for paid orders
        if (order.paymentStatus === PaymentStatus.COMPLETED) {
          // Create refund record
          await tx.refund.create({
            data: {
              orderId,
              amount: order.total,
              reason: cancelReason || 'Order cancelled',
              status: PaymentStatus.PROCESSING,
            }
          })
        }
      }

      // Handle delivery - transfer seller earnings
      if (status === 'DELIVERED' || status === 'COMPLETED') {
        // Group by seller
        const sellerEarnings = new Map<string, number>()
        order.items.forEach(item => {
          if (item.sellerId) {
            const current = sellerEarnings.get(item.sellerId) || 0
            sellerEarnings.set(item.sellerId, current + item.sellerEarnings)
          }
        })

        // Transfer from pending to available balance
        for (const [sellerId, earnings] of sellerEarnings) {
          const seller = await tx.seller.findUnique({
            where: { id: sellerId },
            select: { pendingBalance: true, availableBalance: true }
          })

          if (seller) {
            await tx.seller.update({
              where: { id: sellerId },
              data: {
                pendingBalance: Math.max(0, seller.pendingBalance - earnings),
                availableBalance: seller.availableBalance + earnings,
              }
            })
          }
        }
      }

      // Create notification for user if status changed
      if (status && !isOwner) {
        const statusMessages: Record<string, string> = {
          'CONFIRMED': 'Your order has been confirmed and is being prepared',
          'PACKED': 'Your order has been packed and is ready for shipment',
          'SHIPPED': `Your order has been shipped${trackingNumber ? ` (Tracking: ${trackingNumber})` : ''}`,
          'DELIVERED': 'Your order has been delivered. Thank you for shopping!',
          'CANCELLED': `Your order has been cancelled${cancelReason ? `: ${cancelReason}` : ''}`,
          'COMPLETED': 'Your order has been completed. Please consider leaving a review!',
          'RETURNED': 'Your return request has been processed',
          'REFUNDED': 'Your refund has been processed',
        }

        await tx.notification.create({
          data: {
            userId: order.userId,
            type: 'ORDER',
            title: 'Order Status Updated',
            message: statusMessages[status] || `Your order status is now ${status}`,
            data: JSON.stringify({ orderId, status, orderNumber: order.orderNumber }),
          }
        })
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Order updated successfully',
      order: {
        id: orderId,
        status: status || order.status,
        trackingNumber: trackingNumber || order.courierTrackingNumber,
      }
    })
  } catch (error) {
    console.error('Order update error:', error)
    return NextResponse.json({ success: false, error: 'Failed to update order' }, { status: 500 })
  }
}

// DELETE /api/orders - Cancel order
export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const orderId = searchParams.get('id')
    const reason = searchParams.get('reason')

    if (!orderId) {
      return NextResponse.json({ success: false, error: 'Order ID is required' }, { status: 400 })
    }

    // Get the order
    const order = await db.order.findUnique({
      where: { id: orderId }
    })

    if (!order) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 })
    }

    // Check if order can be cancelled
    const cancellableStatuses = ['PLACED', 'CONFIRMED', 'PACKED']
    if (!cancellableStatuses.includes(order.status)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Order cannot be cancelled at this stage' 
      }, { status: 400 })
    }

    // Check permissions
    const isOwner = order.userId === user.id
    const isAdmin = user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ success: false, error: 'Not authorized to cancel this order' }, { status: 403 })
    }

    // Cancel the order using PUT logic
    const cancelResponse = await PUT(new NextRequest(request.url, {
      method: 'PUT',
      headers: request.headers,
      body: JSON.stringify({
        orderId,
        status: 'CANCELLED',
        cancelReason: reason || 'Cancelled by user',
      }),
    }))

    return cancelResponse
  } catch (error) {
    console.error('Order cancellation error:', error)
    return NextResponse.json({ success: false, error: 'Failed to cancel order' }, { status: 500 })
  }
}
