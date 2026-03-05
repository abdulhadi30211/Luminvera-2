// Admin Export API Route - Export data as CSV or JSON
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

// Convert data to CSV format
function convertToCSV(data: Record<string, unknown>[], headers: string[]): string {
  const headerRow = headers.join(',')
  
  const rows = data.map(item => {
    return headers.map(header => {
      const value = item[header]
      if (value === null || value === undefined) return ''
      if (typeof value === 'object') return `"${JSON.stringify(value).replace(/"/g, '""')}"`
      if (typeof value === 'string') {
        // Escape quotes and wrap in quotes if contains comma or newline
        if (value.includes(',') || value.includes('\n') || value.includes('"')) {
          return `"${value.replace(/"/g, '""')}"`
        }
        return value
      }
      return String(value)
    }).join(',')
  })
  
  return [headerRow, ...rows].join('\n')
}

// GET - Export data as CSV or JSON
export async function GET(request: NextRequest) {
  try {
    const user = await getAdminUser(request)
    
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'users' // users, orders, products, sellers, reviews
    const format = searchParams.get('format') || 'json' // csv, json
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '1000')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Validate format
    if (!['csv', 'json'].includes(format)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid format. Use "csv" or "json"' 
      }, { status: 400 })
    }

    // Build date filter
    const dateFilter: { createdAt?: { gte?: Date; lte?: Date } } = {}
    if (startDate || endDate) {
      dateFilter.createdAt = {}
      if (startDate) dateFilter.createdAt.gte = new Date(startDate)
      if (endDate) dateFilter.createdAt.lte = new Date(endDate)
    }

    let data: Record<string, unknown>[] = []
    let headers: string[] = []
    let filename = ''

    // ==========================================
    // EXPORT USERS
    // ==========================================
    if (type === 'users') {
      const where: Record<string, unknown> = { ...dateFilter }
      if (status) where.accountStatus = status

      const users = await db.user.findMany({
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
          phoneVerified: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
          sellerProfile: {
            select: {
              storeName: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      })

      data = users.map(u => ({
        id: u.id,
        email: u.email,
        firstName: u.firstName || '',
        lastName: u.lastName || '',
        phone: u.phone || '',
        role: u.role,
        accountStatus: u.accountStatus,
        emailVerified: u.emailVerified,
        phoneVerified: u.phoneVerified,
        lastLoginAt: u.lastLoginAt?.toISOString() || '',
        createdAt: u.createdAt.toISOString(),
        updatedAt: u.updatedAt.toISOString(),
        storeName: u.sellerProfile?.storeName || '',
        sellerStatus: u.sellerProfile?.status || '',
      }))

      headers = [
        'id', 'email', 'firstName', 'lastName', 'phone', 'role', 
        'accountStatus', 'emailVerified', 'phoneVerified', 
        'lastLoginAt', 'createdAt', 'updatedAt', 'storeName', 'sellerStatus'
      ]
      filename = `users_export_${new Date().toISOString().split('T')[0]}`
    }

    // ==========================================
    // EXPORT ORDERS
    // ==========================================
    else if (type === 'orders') {
      const where: Record<string, unknown> = { ...dateFilter }
      if (status) where.status = status

      const orders = await db.order.findMany({
        where,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          paymentMethod: true,
          paymentStatus: true,
          subtotal: true,
          discount: true,
          couponDiscount: true,
          deliveryFee: true,
          total: true,
          shippingRecipientName: true,
          shippingPhone: true,
          shippingProvince: true,
          shippingCity: true,
          shippingStreetAddress: true,
          courierName: true,
          courierTrackingNumber: true,
          placedAt: true,
          confirmedAt: true,
          shippedAt: true,
          deliveredAt: true,
          cancelledAt: true,
          createdAt: true,
          user: {
            select: {
              email: true,
              firstName: true,
              lastName: true,
              phone: true,
            },
          },
          seller: {
            select: {
              storeName: true,
            },
          },
          items: {
            select: {
              productName: true,
              quantity: true,
              unitPrice: true,
              totalPrice: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      })

      data = orders.map(o => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        paymentMethod: o.paymentMethod,
        paymentStatus: o.paymentStatus,
        subtotal: o.subtotal,
        discount: o.discount,
        couponDiscount: o.couponDiscount,
        deliveryFee: o.deliveryFee,
        total: o.total,
        customerEmail: o.user.email,
        customerName: `${o.user.firstName || ''} ${o.user.lastName || ''}`.trim(),
        customerPhone: o.user.phone || '',
        recipientName: o.shippingRecipientName,
        recipientPhone: o.shippingPhone,
        province: o.shippingProvince,
        city: o.shippingCity,
        address: o.shippingStreetAddress,
        sellerStore: o.seller?.storeName || '',
        courier: o.courierName || '',
        trackingNumber: o.courierTrackingNumber || '',
        placedAt: o.placedAt.toISOString(),
        confirmedAt: o.confirmedAt?.toISOString() || '',
        shippedAt: o.shippedAt?.toISOString() || '',
        deliveredAt: o.deliveredAt?.toISOString() || '',
        cancelledAt: o.cancelledAt?.toISOString() || '',
        createdAt: o.createdAt.toISOString(),
        itemCount: o.items.length,
        itemNames: o.items.map(i => i.productName).join('; '),
      }))

      headers = [
        'id', 'orderNumber', 'status', 'paymentMethod', 'paymentStatus',
        'subtotal', 'discount', 'couponDiscount', 'deliveryFee', 'total',
        'customerEmail', 'customerName', 'customerPhone',
        'recipientName', 'recipientPhone', 'province', 'city', 'address',
        'sellerStore', 'courier', 'trackingNumber',
        'placedAt', 'confirmedAt', 'shippedAt', 'deliveredAt', 'cancelledAt',
        'createdAt', 'itemCount', 'itemNames'
      ]
      filename = `orders_export_${new Date().toISOString().split('T')[0]}`
    }

    // ==========================================
    // EXPORT PRODUCTS
    // ==========================================
    else if (type === 'products') {
      const where: Record<string, unknown> = { ...dateFilter }
      if (status) where.status = status

      const products = await db.product.findMany({
        where,
        select: {
          id: true,
          sku: true,
          name: true,
          slug: true,
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
          wishlistCount: true,
          averageRating: true,
          totalReviews: true,
          isFeatured: true,
          isNewArrival: true,
          isBestSeller: true,
          freeShipping: true,
          warrantyPeriod: true,
          createdAt: true,
          updatedAt: true,
          category: {
            select: {
              name: true,
            },
          },
          seller: {
            select: {
              storeName: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      })

      data = products.map(p => ({
        id: p.id,
        sku: p.sku,
        name: p.name,
        slug: p.slug,
        description: p.shortDescription || '',
        status: p.status,
        imageUrl: p.primaryImageUrl || '',
        basePrice: p.basePrice,
        compareAtPrice: p.compareAtPrice || '',
        discountPercentage: p.discountPercentage,
        stockQuantity: p.stockQuantity,
        stockSold: p.stockSold,
        viewCount: p.viewCount,
        purchaseCount: p.purchaseCount,
        wishlistCount: p.wishlistCount,
        averageRating: p.averageRating,
        totalReviews: p.totalReviews,
        isFeatured: p.isFeatured,
        isNewArrival: p.isNewArrival,
        isBestSeller: p.isBestSeller,
        freeShipping: p.freeShipping,
        warrantyPeriod: p.warrantyPeriod || '',
        category: p.category?.name || '',
        sellerStore: p.seller.storeName,
        sellerStatus: p.seller.status,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      }))

      headers = [
        'id', 'sku', 'name', 'slug', 'description', 'status', 'imageUrl',
        'basePrice', 'compareAtPrice', 'discountPercentage',
        'stockQuantity', 'stockSold', 'viewCount', 'purchaseCount', 'wishlistCount',
        'averageRating', 'totalReviews', 'isFeatured', 'isNewArrival', 'isBestSeller',
        'freeShipping', 'warrantyPeriod', 'category', 'sellerStore', 'sellerStatus',
        'createdAt', 'updatedAt'
      ]
      filename = `products_export_${new Date().toISOString().split('T')[0]}`
    }

    // ==========================================
    // EXPORT SELLERS
    // ==========================================
    else if (type === 'sellers') {
      const where: Record<string, unknown> = { ...dateFilter }
      if (status) where.status = status

      const sellers = await db.seller.findMany({
        where,
        select: {
          id: true,
          storeName: true,
          storeSlug: true,
          storeDescription: true,
          storeLogoUrl: true,
          status: true,
          businessName: true,
          businessType: true,
          businessPhone: true,
          businessEmail: true,
          bankName: true,
          bankAccountTitle: true,
          totalSales: true,
          totalOrders: true,
          totalProducts: true,
          averageRating: true,
          totalReviews: true,
          totalEarnings: true,
          availableBalance: true,
          pendingBalance: true,
          commissionRate: true,
          onTimeShippingRate: true,
          cancellationRate: true,
          returnRate: true,
          isFeatured: true,
          isTopSeller: true,
          verifiedAt: true,
          createdAt: true,
          user: {
            select: {
              email: true,
              firstName: true,
              lastName: true,
              phone: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      })

      data = sellers.map(s => ({
        id: s.id,
        storeName: s.storeName,
        storeSlug: s.storeSlug,
        description: s.storeDescription || '',
        logoUrl: s.storeLogoUrl || '',
        status: s.status,
        businessName: s.businessName || '',
        businessType: s.businessType || '',
        businessPhone: s.businessPhone || '',
        businessEmail: s.businessEmail || '',
        bankName: s.bankName || '',
        bankAccountTitle: s.bankAccountTitle || '',
        userEmail: s.user.email,
        userName: `${s.user.firstName || ''} ${s.user.lastName || ''}`.trim(),
        userPhone: s.user.phone || '',
        totalSales: s.totalSales,
        totalOrders: s.totalOrders,
        totalProducts: s.totalProducts,
        averageRating: s.averageRating,
        totalReviews: s.totalReviews,
        totalEarnings: s.totalEarnings,
        availableBalance: s.availableBalance,
        pendingBalance: s.pendingBalance,
        commissionRate: s.commissionRate,
        onTimeShippingRate: s.onTimeShippingRate,
        cancellationRate: s.cancellationRate,
        returnRate: s.returnRate,
        isFeatured: s.isFeatured,
        isTopSeller: s.isTopSeller,
        verifiedAt: s.verifiedAt?.toISOString() || '',
        createdAt: s.createdAt.toISOString(),
      }))

      headers = [
        'id', 'storeName', 'storeSlug', 'description', 'logoUrl', 'status',
        'businessName', 'businessType', 'businessPhone', 'businessEmail',
        'bankName', 'bankAccountTitle',
        'userEmail', 'userName', 'userPhone',
        'totalSales', 'totalOrders', 'totalProducts',
        'averageRating', 'totalReviews',
        'totalEarnings', 'availableBalance', 'pendingBalance', 'commissionRate',
        'onTimeShippingRate', 'cancellationRate', 'returnRate',
        'isFeatured', 'isTopSeller', 'verifiedAt', 'createdAt'
      ]
      filename = `sellers_export_${new Date().toISOString().split('T')[0]}`
    }

    // ==========================================
    // EXPORT REVIEWS
    // ==========================================
    else if (type === 'reviews') {
      const reviews = await db.review.findMany({
        where: dateFilter,
        select: {
          id: true,
          rating: true,
          title: true,
          comment: true,
          isVerifiedPurchase: true,
          isApproved: true,
          helpfulCount: true,
          sellerResponse: true,
          sellerRespondedAt: true,
          createdAt: true,
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
            },
          },
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      })

      data = reviews.map(r => ({
        id: r.id,
        rating: r.rating,
        title: r.title || '',
        comment: r.comment || '',
        isVerifiedPurchase: r.isVerifiedPurchase,
        isApproved: r.isApproved,
        helpfulCount: r.helpfulCount,
        hasSellerResponse: !!r.sellerResponse,
        sellerRespondedAt: r.sellerRespondedAt?.toISOString() || '',
        productId: r.product.id,
        productName: r.product.name,
        productSku: r.product.sku,
        userId: r.user.id,
        userEmail: r.user.email,
        userName: `${r.user.firstName || ''} ${r.user.lastName || ''}`.trim(),
        createdAt: r.createdAt.toISOString(),
      }))

      headers = [
        'id', 'rating', 'title', 'comment',
        'isVerifiedPurchase', 'isApproved', 'helpfulCount',
        'hasSellerResponse', 'sellerRespondedAt',
        'productId', 'productName', 'productSku',
        'userId', 'userEmail', 'userName', 'createdAt'
      ]
      filename = `reviews_export_${new Date().toISOString().split('T')[0]}`
    }

    // ==========================================
    // EXPORT DISPUTES
    // ==========================================
    else if (type === 'disputes') {
      const disputes = await db.dispute.findMany({
        where: dateFilter,
        select: {
          id: true,
          disputeNumber: true,
          type: true,
          reason: true,
          description: true,
          status: true,
          resolutionType: true,
          resolutionAmount: true,
          resolutionNotes: true,
          resolvedAt: true,
          createdAt: true,
          order: {
            select: {
              orderNumber: true,
            },
          },
          buyer: {
            select: {
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          seller: {
            select: {
              storeName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      })

      data = disputes.map(d => ({
        id: d.id,
        disputeNumber: d.disputeNumber,
        orderNumber: d.order.orderNumber,
        type: d.type,
        reason: d.reason,
        description: d.description || '',
        status: d.status,
        resolutionType: d.resolutionType || '',
        resolutionAmount: d.resolutionAmount || '',
        resolutionNotes: d.resolutionNotes || '',
        resolvedAt: d.resolvedAt?.toISOString() || '',
        buyerEmail: d.buyer.email,
        buyerName: `${d.buyer.firstName || ''} ${d.buyer.lastName || ''}`.trim(),
        sellerStore: d.seller.storeName,
        createdAt: d.createdAt.toISOString(),
      }))

      headers = [
        'id', 'disputeNumber', 'orderNumber', 'type', 'reason', 'description',
        'status', 'resolutionType', 'resolutionAmount', 'resolutionNotes', 'resolvedAt',
        'buyerEmail', 'buyerName', 'sellerStore', 'createdAt'
      ]
      filename = `disputes_export_${new Date().toISOString().split('T')[0]}`
    }

    // ==========================================
    // EXPORT PAYOUTS
    // ==========================================
    else if (type === 'payouts') {
      const payouts = await db.sellerPayout.findMany({
        where: dateFilter,
        select: {
          id: true,
          amount: true,
          status: true,
          periodStart: true,
          periodEnd: true,
          bankName: true,
          bankAccountNumber: true,
          processedAt: true,
          transactionReference: true,
          createdAt: true,
          seller: {
            select: {
              storeName: true,
              storeSlug: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      })

      data = payouts.map(p => ({
        id: p.id,
        amount: p.amount,
        status: p.status,
        periodStart: p.periodStart.toISOString(),
        periodEnd: p.periodEnd.toISOString(),
        bankName: p.bankName || '',
        bankAccountNumber: p.bankAccountNumber || '',
        processedAt: p.processedAt?.toISOString() || '',
        transactionReference: p.transactionReference || '',
        sellerStore: p.seller.storeName,
        sellerSlug: p.seller.storeSlug,
        createdAt: p.createdAt.toISOString(),
      }))

      headers = [
        'id', 'amount', 'status', 'periodStart', 'periodEnd',
        'bankName', 'bankAccountNumber',
        'processedAt', 'transactionReference',
        'sellerStore', 'sellerSlug', 'createdAt'
      ]
      filename = `payouts_export_${new Date().toISOString().split('T')[0]}`
    }

    // ==========================================
    // INVALID TYPE
    // ==========================================
    else {
      return NextResponse.json({ 
        success: false, 
        error: `Invalid export type: ${type}. Valid types: users, orders, products, sellers, reviews, disputes, payouts` 
      }, { status: 400 })
    }

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: user.id,
        userRole: user.role,
        action: 'EXPORT_DATA',
        entityType: type,
        newValue: JSON.stringify({
          type,
          format,
          recordCount: data.length,
          filters: { startDate, endDate, status },
        }),
      },
    })

    // Return data in requested format
    if (format === 'csv') {
      const csvContent = convertToCSV(data, headers)
      
      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}.csv"`,
        },
      })
    } else {
      return NextResponse.json({
        success: true,
        data: {
          records: data,
          metadata: {
            type,
            format,
            count: data.length,
            exportedAt: new Date().toISOString(),
            filters: { startDate, endDate, status },
          },
        },
      })
    }
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
