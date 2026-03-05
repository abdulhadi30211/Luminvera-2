// Admin Database Management API Route
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

// GET - Fetch database stats (tables, row counts, size)
export async function GET(request: NextRequest) {
  try {
    const user = await getAdminUser(request)
    
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Get counts for all major tables
    const [
      usersCount,
      sellersCount,
      productsCount,
      ordersCount,
      orderItemsCount,
      categoriesCount,
      reviewsCount,
      disputesCount,
      notificationsCount,
      couponsCount,
      sessionsCount,
      cartsCount,
      cartItemsCount,
      paymentsCount,
      refundsCount,
      payoutsCount,
      walletsCount,
      walletTransactionsCount,
      addressesCount,
      wishlistCount,
      bannersCount,
      flashSalesCount,
      auditLogsCount,
      supportTicketsCount,
    ] = await Promise.all([
      db.user.count(),
      db.seller.count(),
      db.product.count(),
      db.order.count(),
      db.orderItem.count(),
      db.category.count(),
      db.review.count(),
      db.dispute.count(),
      db.notification.count(),
      db.coupon.count(),
      db.session.count(),
      db.cart.count(),
      db.cartItem.count(),
      db.payment.count(),
      db.refund.count(),
      db.sellerPayout.count(),
      db.wallet.count(),
      db.walletTransaction.count(),
      db.address.count(),
      db.wishlistItem.count(),
      db.banner.count(),
      db.flashSale.count(),
      db.auditLog.count(),
      db.supportTicket.count(),
    ])

    // Get status breakdowns
    const [
      usersByStatus,
      usersByRole,
      sellersByStatus,
      productsByStatus,
      ordersByStatus,
    ] = await Promise.all([
      db.user.groupBy({
        by: ['accountStatus'],
        _count: { id: true },
      }),
      db.user.groupBy({
        by: ['role'],
        _count: { id: true },
      }),
      db.seller.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      db.product.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      db.order.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
    ])

    const tables = [
      { name: 'Users', count: usersCount, icon: 'users' },
      { name: 'Sellers', count: sellersCount, icon: 'store' },
      { name: 'Products', count: productsCount, icon: 'package' },
      { name: 'Orders', count: ordersCount, icon: 'shopping-cart' },
      { name: 'Order Items', count: orderItemsCount, icon: 'list' },
      { name: 'Categories', count: categoriesCount, icon: 'folder' },
      { name: 'Reviews', count: reviewsCount, icon: 'star' },
      { name: 'Disputes', count: disputesCount, icon: 'alert-triangle' },
      { name: 'Notifications', count: notificationsCount, icon: 'bell' },
      { name: 'Coupons', count: couponsCount, icon: 'tag' },
      { name: 'Sessions', count: sessionsCount, icon: 'key' },
      { name: 'Carts', count: cartsCount, icon: 'shopping-bag' },
      { name: 'Cart Items', count: cartItemsCount, icon: 'list' },
      { name: 'Payments', count: paymentsCount, icon: 'credit-card' },
      { name: 'Refunds', count: refundsCount, icon: 'refresh-cw' },
      { name: 'Payouts', count: payoutsCount, icon: 'dollar-sign' },
      { name: 'Wallets', count: walletsCount, icon: 'wallet' },
      { name: 'Wallet Transactions', count: walletTransactionsCount, icon: 'activity' },
      { name: 'Addresses', count: addressesCount, icon: 'map-pin' },
      { name: 'Wishlist Items', count: wishlistCount, icon: 'heart' },
      { name: 'Banners', count: bannersCount, icon: 'image' },
      { name: 'Flash Sales', count: flashSalesCount, icon: 'zap' },
      { name: 'Audit Logs', count: auditLogsCount, icon: 'file-text' },
      { name: 'Support Tickets', count: supportTicketsCount, icon: 'help-circle' },
    ]

    const totalRecords = tables.reduce((sum, t) => sum + t.count, 0)

    return NextResponse.json({
      success: true,
      data: {
        tables,
        totalRecords,
        breakdowns: {
          usersByStatus: usersByStatus.map(s => ({ status: s.accountStatus, count: s._count.id })),
          usersByRole: usersByRole.map(r => ({ role: r.role, count: r._count.id })),
          sellersByStatus: sellersByStatus.map(s => ({ status: s.status, count: s._count.id })),
          productsByStatus: productsByStatus.map(s => ({ status: s.status, count: s._count.id })),
          ordersByStatus: ordersByStatus.map(s => ({ status: s.status, count: s._count.id })),
        },
      },
    })
  } catch (error) {
    console.error('Database stats error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Execute backup (export data as JSON)
export async function POST(request: NextRequest) {
  try {
    const user = await getAdminUser(request)
    
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { tables } = body as { tables?: string[] }

    // Default tables to backup
    const tablesToBackup = tables || [
      'users', 'sellers', 'products', 'categories', 'orders', 'orderItems',
      'reviews', 'coupons', 'banners', 'flashSales', 'disputes', 'notifications'
    ]

    const backup: Record<string, unknown[]> = {}
    const timestamp = new Date().toISOString()

    // Fetch data for each table
    if (tablesToBackup.includes('users')) {
      backup.users = await db.user.findMany({
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
          updatedAt: true,
        },
      })
    }

    if (tablesToBackup.includes('sellers')) {
      backup.sellers = await db.seller.findMany({
        select: {
          id: true,
          userId: true,
          storeName: true,
          storeSlug: true,
          storeDescription: true,
          storeLogoUrl: true,
          status: true,
          businessName: true,
          businessPhone: true,
          businessEmail: true,
          totalSales: true,
          totalOrders: true,
          totalProducts: true,
          averageRating: true,
          totalEarnings: true,
          commissionRate: true,
          createdAt: true,
        },
      })
    }

    if (tablesToBackup.includes('products')) {
      backup.products = await db.product.findMany({
        select: {
          id: true,
          sellerId: true,
          categoryId: true,
          sku: true,
          name: true,
          slug: true,
          description: true,
          shortDescription: true,
          status: true,
          primaryImageUrl: true,
          basePrice: true,
          compareAtPrice: true,
          discountPercentage: true,
          stockQuantity: true,
          stockSold: true,
          viewCount: true,
          purchaseCount: true,
          averageRating: true,
          totalReviews: true,
          isFeatured: true,
          isNewArrival: true,
          isBestSeller: true,
          createdAt: true,
          updatedAt: true,
        },
      })
    }

    if (tablesToBackup.includes('categories')) {
      backup.categories = await db.category.findMany({
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          imageUrl: true,
          parentId: true,
          sortOrder: true,
          isActive: true,
          isFeatured: true,
          createdAt: true,
        },
      })
    }

    if (tablesToBackup.includes('orders')) {
      backup.orders = await db.order.findMany({
        select: {
          id: true,
          orderNumber: true,
          userId: true,
          sellerId: true,
          status: true,
          subtotal: true,
          discount: true,
          couponDiscount: true,
          deliveryFee: true,
          total: true,
          paymentMethod: true,
          paymentStatus: true,
          shippingRecipientName: true,
          shippingCity: true,
          shippingProvince: true,
          placedAt: true,
          confirmedAt: true,
          shippedAt: true,
          deliveredAt: true,
          createdAt: true,
        },
      })
    }

    if (tablesToBackup.includes('orderItems')) {
      backup.orderItems = await db.orderItem.findMany({
        select: {
          id: true,
          orderId: true,
          productId: true,
          sellerId: true,
          productName: true,
          productSku: true,
          unitPrice: true,
          quantity: true,
          totalPrice: true,
          commissionRate: true,
          commissionAmount: true,
          sellerEarnings: true,
          createdAt: true,
        },
      })
    }

    if (tablesToBackup.includes('reviews')) {
      backup.reviews = await db.review.findMany({
        select: {
          id: true,
          productId: true,
          userId: true,
          rating: true,
          title: true,
          comment: true,
          isVerifiedPurchase: true,
          helpfulCount: true,
          createdAt: true,
        },
      })
    }

    if (tablesToBackup.includes('coupons')) {
      backup.coupons = await db.coupon.findMany({
        select: {
          id: true,
          code: true,
          name: true,
          type: true,
          discountValue: true,
          maxDiscountAmount: true,
          minOrderValue: true,
          maxUses: true,
          currentUses: true,
          validFrom: true,
          validUntil: true,
          isActive: true,
          createdAt: true,
        },
      })
    }

    if (tablesToBackup.includes('banners')) {
      backup.banners = await db.banner.findMany()
    }

    if (tablesToBackup.includes('flashSales')) {
      backup.flashSales = await db.flashSale.findMany()
    }

    if (tablesToBackup.includes('disputes')) {
      backup.disputes = await db.dispute.findMany({
        select: {
          id: true,
          disputeNumber: true,
          orderId: true,
          buyerId: true,
          sellerId: true,
          type: true,
          reason: true,
          description: true,
          status: true,
          resolutionType: true,
          resolutionAmount: true,
          createdAt: true,
        },
      })
    }

    if (tablesToBackup.includes('notifications')) {
      backup.notifications = await db.notification.findMany({
        select: {
          id: true,
          userId: true,
          type: true,
          title: true,
          message: true,
          read: true,
          createdAt: true,
        },
      })
    }

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: user.id,
        userRole: user.role,
        action: 'DATABASE_BACKUP',
        entityType: 'database',
        newValue: JSON.stringify({ tables: tablesToBackup, timestamp }),
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        backup,
        metadata: {
          timestamp,
          tables: Object.keys(backup),
          recordCounts: Object.fromEntries(
            Object.entries(backup).map(([key, value]) => [key, value.length])
          ),
        },
      },
    })
  } catch (error) {
    console.error('Database backup error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Clear specific table data (with confirmation)
export async function DELETE(request: NextRequest) {
  try {
    const user = await getAdminUser(request)
    
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Only SUPER_ADMIN can clear tables
    if (user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ 
        success: false, 
        error: 'Only SUPER_ADMIN can clear table data' 
      }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const table = searchParams.get('table')
    const confirmation = searchParams.get('confirmation')

    // Safety check - require confirmation phrase
    if (confirmation !== 'CONFIRM_CLEAR_DATA') {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid confirmation. Use "CONFIRM_CLEAR_DATA" as confirmation parameter.' 
      }, { status: 400 })
    }

    // Allowed tables to clear (non-critical tables only)
    const allowedTables = [
      'notifications',
      'sessions',
      'auditLogs',
      'cartItems',
      'carts',
      'wishlistItems',
      'searchHistory',
      'recentlyViewed',
      'priceAlerts',
      'stockAlerts',
    ]

    if (!table || !allowedTables.includes(table)) {
      return NextResponse.json({ 
        success: false, 
        error: `Invalid table. Allowed tables: ${allowedTables.join(', ')}` 
      }, { status: 400 })
    }

    let deletedCount = 0

    switch (table) {
      case 'notifications':
        deletedCount = (await db.notification.deleteMany({})).count
        break
      case 'sessions':
        deletedCount = (await db.session.deleteMany({})).count
        break
      case 'auditLogs':
        deletedCount = (await db.auditLog.deleteMany({})).count
        break
      case 'cartItems':
        deletedCount = (await db.cartItem.deleteMany({})).count
        break
      case 'carts':
        deletedCount = (await db.cart.deleteMany({})).count
        break
      case 'wishlistItems':
        deletedCount = (await db.wishlistItem.deleteMany({})).count
        break
      case 'searchHistory':
        deletedCount = (await db.searchHistory.deleteMany({})).count
        break
      case 'recentlyViewed':
        deletedCount = (await db.recentlyViewed.deleteMany({})).count
        break
      case 'priceAlerts':
        deletedCount = (await db.priceAlert.deleteMany({})).count
        break
      case 'stockAlerts':
        deletedCount = (await db.stockAlert.deleteMany({})).count
        break
    }

    // Create audit log for this action
    await db.auditLog.create({
      data: {
        userId: user.id,
        userRole: user.role,
        action: 'CLEAR_TABLE',
        entityType: 'database',
        newValue: JSON.stringify({ table, deletedCount, timestamp: new Date().toISOString() }),
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        table,
        deletedCount,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error('Clear table error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
