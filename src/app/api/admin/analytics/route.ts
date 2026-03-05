// Admin Comprehensive Analytics API Route
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

// Helper function to get date ranges
function getDateRange(period: string): { start: Date; end: Date } {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  
  switch (period) {
    case 'today':
      return { start: today, end: now }
    case 'week': {
      const weekStart = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
      return { start: weekStart, end: now }
    }
    case 'month': {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      return { start: monthStart, end: now }
    }
    case 'year': {
      const yearStart = new Date(now.getFullYear(), 0, 1)
      return { start: yearStart, end: now }
    }
    default:
      return { start: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000), end: now }
  }
}

// GET - Fetch comprehensive analytics
export async function GET(request: NextRequest) {
  try {
    const user = await getAdminUser(request)
    
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'week'
    const { start, end } = getDateRange(period)

    // ==========================================
    // REVENUE STATS
    // ==========================================
    const revenueStats = await db.order.aggregate({
      where: {
        createdAt: { gte: start, lte: end },
        paymentStatus: { in: ['COMPLETED', 'PARTIALLY_REFUNDED'] },
      },
      _sum: {
        total: true,
        subtotal: true,
        deliveryFee: true,
        discount: true,
        couponDiscount: true,
      },
      _count: { id: true },
      _avg: { total: true },
    })

    // Total platform revenue (all time)
    const totalRevenueAllTime = await db.order.aggregate({
      where: { paymentStatus: 'COMPLETED' },
      _sum: { total: true },
    })

    // Revenue by payment method
    const revenueByPaymentMethod = await db.order.groupBy({
      by: ['paymentMethod'],
      where: {
        createdAt: { gte: start, lte: end },
        paymentStatus: 'COMPLETED',
      },
      _sum: { total: true },
      _count: { id: true },
    })

    // ==========================================
    // ORDER STATS
    // ==========================================
    const orderStats = await db.order.groupBy({
      by: ['status'],
      where: { createdAt: { gte: start, lte: end } },
      _count: { id: true },
      _sum: { total: true },
    })

    const totalOrdersCount = await db.order.count({
      where: { createdAt: { gte: start, lte: end } },
    })

    // Orders by day (for chart)
    const ordersByDay = await db.$queryRaw<Array<{ date: string; count: number; revenue: number }>>`
      SELECT 
        DATE(createdAt) as date,
        COUNT(*) as count,
        SUM(total) as revenue
      FROM \`Order\`
      WHERE createdAt >= ${start} AND createdAt <= ${end}
      GROUP BY DATE(createdAt)
      ORDER BY date ASC
    `

    // ==========================================
    // USER GROWTH STATS
    // ==========================================
    const newUserCount = await db.user.count({
      where: {
        createdAt: { gte: start, lte: end },
        accountStatus: 'ACTIVE',
      },
    })

    const totalUsersCount = await db.user.count({
      where: { accountStatus: 'ACTIVE' },
    })

    // Users by role
    const usersByRole = await db.user.groupBy({
      by: ['role'],
      _count: { id: true },
    })

    // Users by day
    const usersByDay = await db.$queryRaw<Array<{ date: string; count: number }>>`
      SELECT 
        DATE(createdAt) as date,
        COUNT(*) as count
      FROM User
      WHERE createdAt >= ${start} AND createdAt <= ${end}
      GROUP BY DATE(createdAt)
      ORDER BY date ASC
    `

    // ==========================================
    // SELLER STATS
    // ==========================================
    const sellerStats = await db.seller.groupBy({
      by: ['status'],
      _count: { id: true },
    })

    const totalSellersCount = await db.seller.count()
    const verifiedSellersCount = await db.seller.count({ where: { status: 'VERIFIED' } })
    const pendingSellersCount = await db.seller.count({ where: { status: 'PENDING' } })

    // Top sellers by revenue
    const topSellers = await db.seller.findMany({
      where: { status: 'VERIFIED' },
      select: {
        id: true,
        storeName: true,
        storeLogoUrl: true,
        totalSales: true,
        totalOrders: true,
        averageRating: true,
        totalEarnings: true,
        totalProducts: true,
      },
      orderBy: { totalEarnings: 'desc' },
      take: 10,
    })

    // ==========================================
    // PRODUCT STATS
    // ==========================================
    const productStats = await db.product.groupBy({
      by: ['status'],
      _count: { id: true },
    })

    const totalProductsCount = await db.product.count()
    const liveProductsCount = await db.product.count({ where: { status: 'LIVE' } })
    const pendingProductsCount = await db.product.count({ where: { status: 'PENDING_REVIEW' } })
    const lowStockProductsCount = await db.product.count({
      where: {
        status: 'LIVE',
        stockQuantity: { lte: 10 },
      },
    })
    const outOfStockProductsCount = await db.product.count({
      where: {
        status: 'LIVE',
        stockQuantity: 0,
      },
    })

    // Top selling products
    const topProducts = await db.product.findMany({
      where: { status: 'LIVE' },
      select: {
        id: true,
        name: true,
        sku: true,
        primaryImageUrl: true,
        basePrice: true,
        purchaseCount: true,
        averageRating: true,
        totalReviews: true,
        stockQuantity: true,
        seller: {
          select: {
            id: true,
            storeName: true,
          },
        },
      },
      orderBy: { purchaseCount: 'desc' },
      take: 10,
    })

    // Products by category
    const productsByCategory = await db.product.groupBy({
      by: ['categoryId'],
      where: { status: 'LIVE' },
      _count: { id: true },
    })

    const categoriesWithProducts = await Promise.all(
      productsByCategory.map(async (p) => {
        const category = p.categoryId
          ? await db.category.findUnique({
              where: { id: p.categoryId },
              select: { id: true, name: true, slug: true },
            })
          : null
        return {
          category,
          productCount: p._count.id,
        }
      })
    )

    // ==========================================
    // DISPUTE STATS
    // ==========================================
    const disputeStats = await db.dispute.groupBy({
      by: ['status'],
      _count: { id: true },
    })

    const totalDisputesCount = await db.dispute.count({
      where: { createdAt: { gte: start, lte: end } },
    })

    const openDisputesCount = await db.dispute.count({ where: { status: 'OPEN' } })

    // ==========================================
    // PAYMENT STATS
    // ==========================================
    const paymentStats = await db.payment.groupBy({
      by: ['status'],
      _count: { id: true },
      _sum: { amount: true },
    })

    // ==========================================
    // COMMISSION STATS
    // ==========================================
    const commissionStats = await db.orderItem.aggregate({
      where: {
        order: {
          createdAt: { gte: start, lte: end },
          paymentStatus: 'COMPLETED',
        },
      },
      _sum: {
        commissionAmount: true,
        sellerEarnings: true,
      },
    })

    // ==========================================
    // PAYOUT STATS
    // ==========================================
    const pendingPayouts = await db.sellerPayout.aggregate({
      where: { status: 'PENDING' },
      _sum: { amount: true },
      _count: { id: true },
    })

    const completedPayouts = await db.sellerPayout.aggregate({
      where: {
        status: 'COMPLETED',
        createdAt: { gte: start, lte: end },
      },
      _sum: { amount: true },
      _count: { id: true },
    })

    // ==========================================
    // PLATFORM METRICS
    // ==========================================
    const platformMetrics = {
      totalRevenue: totalRevenueAllTime._sum.total || 0,
      periodRevenue: revenueStats._sum.total || 0,
      totalOrders: totalOrdersCount,
      totalUsers: totalUsersCount,
      totalSellers: totalSellersCount,
      totalProducts: totalProductsCount,
      averageOrderValue: revenueStats._avg.total || 0,
      totalCommission: commissionStats._sum.commissionAmount || 0,
      totalSellerEarnings: commissionStats._sum.sellerEarnings || 0,
    }

    // ==========================================
    // GROWTH METRICS (compare with previous period)
    // ==========================================
    const previousPeriodStart = new Date(start.getTime() - (end.getTime() - start.getTime()))
    const previousPeriodEnd = start

    const previousPeriodOrders = await db.order.count({
      where: {
        createdAt: { gte: previousPeriodStart, lte: previousPeriodEnd },
      },
    })

    const previousPeriodRevenue = await db.order.aggregate({
      where: {
        createdAt: { gte: previousPeriodStart, lte: previousPeriodEnd },
        paymentStatus: 'COMPLETED',
      },
      _sum: { total: true },
    })

    const previousPeriodUsers = await db.user.count({
      where: {
        createdAt: { gte: previousPeriodStart, lte: previousPeriodEnd },
      },
    })

    const orderGrowth = previousPeriodOrders > 0
      ? ((totalOrdersCount - previousPeriodOrders) / previousPeriodOrders) * 100
      : 0

    const revenueGrowth = (previousPeriodRevenue._sum.total || 0) > 0
      ? (((revenueStats._sum.total || 0) - (previousPeriodRevenue._sum.total || 0)) / (previousPeriodRevenue._sum.total || 1)) * 100
      : 0

    const userGrowth = previousPeriodUsers > 0
      ? ((newUserCount - previousPeriodUsers) / previousPeriodUsers) * 100
      : 0

    return NextResponse.json({
      success: true,
      data: {
        period: {
          label: period,
          start: start.toISOString(),
          end: end.toISOString(),
        },
        revenue: {
          total: revenueStats._sum.total || 0,
          subtotal: revenueStats._sum.subtotal || 0,
          deliveryFees: revenueStats._sum.deliveryFee || 0,
          discounts: revenueStats._sum.discount || 0,
          couponDiscounts: revenueStats._sum.couponDiscount || 0,
          orderCount: revenueStats._count.id,
          averageOrderValue: revenueStats._avg.total || 0,
          byPaymentMethod: revenueByPaymentMethod.map(r => ({
            method: r.paymentMethod,
            total: r._sum.total || 0,
            count: r._count.id,
          })),
        },
        orders: {
          total: totalOrdersCount,
          byStatus: orderStats.map(o => ({
            status: o.status,
            count: o._count.id,
            revenue: o._sum.total || 0,
          })),
          byDay: ordersByDay,
        },
        users: {
          newUsers: newUserCount,
          total: totalUsersCount,
          byRole: usersByRole.map(r => ({
            role: r.role,
            count: r._count.id,
          })),
          byDay: usersByDay,
        },
        sellers: {
          total: totalSellersCount,
          verified: verifiedSellersCount,
          pending: pendingSellersCount,
          byStatus: sellerStats.map(s => ({
            status: s.status,
            count: s._count.id,
          })),
          topSellers,
        },
        products: {
          total: totalProductsCount,
          live: liveProductsCount,
          pending: pendingProductsCount,
          lowStock: lowStockProductsCount,
          outOfStock: outOfStockProductsCount,
          byStatus: productStats.map(p => ({
            status: p.status,
            count: p._count.id,
          })),
          byCategory: categoriesWithProducts.filter(c => c.category !== null),
          topProducts,
        },
        disputes: {
          total: totalDisputesCount,
          open: openDisputesCount,
          byStatus: disputeStats.map(d => ({
            status: d.status,
            count: d._count.id,
          })),
        },
        payments: {
          byStatus: paymentStats.map(p => ({
            status: p.status,
            count: p._count.id,
            amount: p._sum.amount || 0,
          })),
        },
        commissions: {
          total: commissionStats._sum.commissionAmount || 0,
          sellerEarnings: commissionStats._sum.sellerEarnings || 0,
        },
        payouts: {
          pending: {
            count: pendingPayouts._count.id,
            amount: pendingPayouts._sum.amount || 0,
          },
          completed: {
            count: completedPayouts._count.id,
            amount: completedPayouts._sum.amount || 0,
          },
        },
        platform: platformMetrics,
        growth: {
          orders: orderGrowth,
          revenue: revenueGrowth,
          users: userGrowth,
        },
      },
    })
  } catch (error) {
    console.error('Admin analytics error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
