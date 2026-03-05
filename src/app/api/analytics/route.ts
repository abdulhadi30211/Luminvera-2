// Analytics API Route - Comprehensive Platform Analytics
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Helper function to get date ranges
function getDateRanges() {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
  const weekStart = new Date(today.getTime() - today.getDay() * 24 * 60 * 60 * 1000)
  const lastWeekStart = new Date(weekStart.getTime() - 7 * 24 * 60 * 60 * 1000)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)

  return {
    today: { start: today.toISOString(), end: now.toISOString() },
    yesterday: { start: yesterday.toISOString(), end: today.toISOString() },
    thisWeek: { start: weekStart.toISOString(), end: now.toISOString() },
    lastWeek: { start: lastWeekStart.toISOString(), end: weekStart.toISOString() },
    thisMonth: { start: monthStart.toISOString(), end: now.toISOString() },
    lastMonth: { start: lastMonthStart.toISOString(), end: lastMonthEnd.toISOString() }
  }
}

// GET - Get analytics data
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'platform' // platform, seller, product, admin
    const sellerId = searchParams.get('sellerId')
    const productId = searchParams.get('productId')
    const period = searchParams.get('period') || '7d' // 7d, 30d, 90d, 1y, today, yesterday, this_week, last_week, this_month, last_month
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')

    const dateRanges = getDateRanges()
    const now = new Date()
    
    // Calculate date range based on period
    let startDate: Date
    let endDate: Date = new Date()
    
    if (startDateParam && endDateParam) {
      startDate = new Date(startDateParam)
      endDate = new Date(endDateParam)
    } else {
      switch (period) {
        case 'today':
          startDate = new Date(dateRanges.today.start)
          break
        case 'yesterday':
          startDate = new Date(dateRanges.yesterday.start)
          endDate = new Date(dateRanges.yesterday.end)
          break
        case 'this_week':
          startDate = new Date(dateRanges.thisWeek.start)
          break
        case 'last_week':
          startDate = new Date(dateRanges.lastWeek.start)
          endDate = new Date(dateRanges.lastWeek.end)
          break
        case 'this_month':
          startDate = new Date(dateRanges.thisMonth.start)
          break
        case 'last_month':
          startDate = new Date(dateRanges.lastMonth.start)
          endDate = new Date(dateRanges.lastMonth.end)
          break
        case '30d':
          startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          break
        case '90d':
          startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
          break
        case '1y':
          startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
          break
        default:
          startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      }
    }

    const startISO = startDate.toISOString()
    const endISO = endDate.toISOString()

    // ==========================================
    // PLATFORM-WIDE ANALYTICS (Admin)
    // ==========================================
    if (type === 'platform' || type === 'admin') {
      // Get overall counts
      const totalUsers = await db.user.count()

      const totalSellers = await db.seller.count({
        where: { status: 'VERIFIED' }
      })

      const pendingSellers = await db.seller.count({
        where: { status: 'PENDING' }
      })

      const totalProducts = await db.product.count({
        where: { status: 'LIVE' }
      })

      const pendingProducts = await db.product.count({
        where: { status: 'PENDING_REVIEW' }
      })

      const totalOrders = await db.order.count()

      // Get revenue data
      const orders = await db.order.findMany({
        select: {
          total: true,
          createdAt: true,
          status: true,
          paymentMethod: true,
          paymentStatus: true
        },
        where: {
          createdAt: {
            gte: startISO,
            lte: endISO
          }
        }
      })

      const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0)
      const completedOrders = orders.filter(o => o.status === 'DELIVERED' || o.status === 'COMPLETED').length

      // Period comparison data
      const newUsersToday = await db.user.count({
        where: { createdAt: { gte: dateRanges.today.start } }
      })

      const newUsersYesterday = await db.user.count({
        where: {
          createdAt: {
            gte: dateRanges.yesterday.start,
            lt: dateRanges.yesterday.end
          }
        }
      })

      const newUsersThisWeek = await db.user.count({
        where: { createdAt: { gte: dateRanges.thisWeek.start } }
      })

      const newUsersLastWeek = await db.user.count({
        where: {
          createdAt: {
            gte: dateRanges.lastWeek.start,
            lt: dateRanges.lastWeek.end
          }
        }
      })

      const newUsersThisMonth = await db.user.count({
        where: { createdAt: { gte: dateRanges.thisMonth.start } }
      })

      const newUsersLastMonth = await db.user.count({
        where: {
          createdAt: {
            gte: dateRanges.lastMonth.start,
            lt: dateRanges.lastMonth.end
          }
        }
      })

      // Orders by period
      const todayOrders = await db.order.findMany({
        select: { total: true },
        where: { createdAt: { gte: dateRanges.today.start } }
      })

      const yesterdayOrders = await db.order.findMany({
        select: { total: true },
        where: {
          createdAt: {
            gte: dateRanges.yesterday.start,
            lt: dateRanges.yesterday.end
          }
        }
      })

      const thisWeekOrders = await db.order.findMany({
        select: { total: true },
        where: { createdAt: { gte: dateRanges.thisWeek.start } }
      })

      const lastWeekOrders = await db.order.findMany({
        select: { total: true },
        where: {
          createdAt: {
            gte: dateRanges.lastWeek.start,
            lt: dateRanges.lastWeek.end
          }
        }
      })

      const thisMonthOrders = await db.order.findMany({
        select: { total: true },
        where: { createdAt: { gte: dateRanges.thisMonth.start } }
      })

      const lastMonthOrders = await db.order.findMany({
        select: { total: true },
        where: {
          createdAt: {
            gte: dateRanges.lastMonth.start,
            lt: dateRanges.lastMonth.end
          }
        }
      })

      // Order status breakdown
      const allOrders = await db.order.findMany({
        select: { status: true }
      })

      const statusBreakdown: Record<string, number> = {}
      allOrders.forEach(o => {
        statusBreakdown[o.status] = (statusBreakdown[o.status] || 0) + 1
      })

      // Payment method breakdown
      const paymentMethodBreakdown: Record<string, { count: number; amount: number }> = {}
      orders.forEach(o => {
        if (!paymentMethodBreakdown[o.paymentMethod]) {
          paymentMethodBreakdown[o.paymentMethod] = { count: 0, amount: 0 }
        }
        paymentMethodBreakdown[o.paymentMethod].count++
        paymentMethodBreakdown[o.paymentMethod].amount += o.total || 0
      })

      // Daily revenue for chart
      const dailyRevenue: Record<string, { revenue: number; orders: number }> = {}
      orders.forEach(o => {
        const date = o.createdAt.toISOString().split('T')[0]
        if (!dailyRevenue[date]) {
          dailyRevenue[date] = { revenue: 0, orders: 0 }
        }
        dailyRevenue[date].revenue += o.total || 0
        dailyRevenue[date].orders++
      })

      // Top selling products
      const topProducts = await db.product.findMany({
        select: {
          id: true,
          name: true,
          purchaseCount: true,
          basePrice: true,
          averageRating: true,
          totalReviews: true,
          seller: { select: { storeName: true } }
        },
        where: { status: 'LIVE' },
        orderBy: { purchaseCount: 'desc' },
        take: 10
      })

      // Top sellers
      const topSellers = await db.seller.findMany({
        select: {
          id: true,
          storeName: true,
          storeLogoUrl: true,
          totalSales: true,
          totalOrders: true,
          averageRating: true,
          totalEarnings: true
        },
        where: { status: 'VERIFIED' },
        orderBy: { totalEarnings: 'desc' },
        take: 10
      })

      // Category performance
      const categories = await db.category.findMany({
        select: { id: true, name: true, slug: true }
      })

      const categoryPerformance: any[] = []
      for (const cat of categories) {
        const catProducts = await db.product.findMany({
          select: { purchaseCount: true, basePrice: true },
          where: {
            categoryId: cat.id,
            status: 'LIVE'
          }
        })

        const totalSales = catProducts.reduce((sum, p) => sum + (p.purchaseCount || 0), 0)
        const totalRevenue = catProducts.reduce((sum, p) => sum + (p.purchaseCount || 0) * (p.basePrice || 0), 0)
        
        if (totalSales > 0) {
          categoryPerformance.push({
            id: cat.id,
            name: cat.name,
            slug: cat.slug,
            totalSales,
            totalRevenue,
            productCount: catProducts.length
          })
        }
      }
      categoryPerformance.sort((a, b) => b.totalRevenue - a.totalRevenue)

      // User growth data (last 12 months)
      const userGrowth: { month: string; users: number }[] = []
      for (let i = 11; i >= 0; i--) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
        const monthUsers = await db.user.count({
          where: { createdAt: { lt: monthEnd.toISOString() } }
        })
        
        const monthName = monthStart.toLocaleString('default', { month: 'short' })
        userGrowth.push({ month: monthName, users: monthUsers || 0 })
      }

      // Revenue growth data (last 12 months)
      const revenueGrowth: { month: string; revenue: number; orders: number }[] = []
      for (let i = 11; i >= 0; i--) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
        const monthOrders = await db.order.findMany({
          select: { total: true },
          where: {
            createdAt: {
              gte: monthStart.toISOString(),
              lte: monthEnd.toISOString()
            }
          }
        })
        
        const monthRevenue = monthOrders.reduce((sum, o) => sum + (o.total || 0), 0)
        const monthName = monthStart.toLocaleString('default', { month: 'short' })
        revenueGrowth.push({ month: monthName, revenue: monthRevenue, orders: monthOrders.length })
      }

      return NextResponse.json({
        overview: {
          totalUsers,
          totalSellers,
          pendingSellers,
          totalProducts,
          pendingProducts,
          totalOrders,
          totalRevenue,
          completedOrders
        },
        periodComparison: {
          today: {
            users: newUsersToday,
            orders: todayOrders.length,
            revenue: todayOrders.reduce((sum, o) => sum + (o.total || 0), 0)
          },
          yesterday: {
            users: newUsersYesterday,
            orders: yesterdayOrders.length,
            revenue: yesterdayOrders.reduce((sum, o) => sum + (o.total || 0), 0)
          },
          thisWeek: {
            users: newUsersThisWeek,
            orders: thisWeekOrders.length,
            revenue: thisWeekOrders.reduce((sum, o) => sum + (o.total || 0), 0)
          },
          lastWeek: {
            users: newUsersLastWeek,
            orders: lastWeekOrders.length,
            revenue: lastWeekOrders.reduce((sum, o) => sum + (o.total || 0), 0)
          },
          thisMonth: {
            users: newUsersThisMonth,
            orders: thisMonthOrders.length,
            revenue: thisMonthOrders.reduce((sum, o) => sum + (o.total || 0), 0)
          },
          lastMonth: {
            users: newUsersLastMonth,
            orders: lastMonthOrders.length,
            revenue: lastMonthOrders.reduce((sum, o) => sum + (o.total || 0), 0)
          }
        },
        statusBreakdown,
        paymentMethodBreakdown,
        dailyRevenue,
        topProducts: topProducts.map(p => ({
          ...p,
          sellers: p.seller ? { store_name: p.seller.storeName } : null
        })),
        topSellers,
        categoryPerformance: categoryPerformance.slice(0, 10),
        userGrowth,
        revenueGrowth,
        periodLabel: period,
        dateRange: { start: startISO, end: endISO }
      })
    }

    // ==========================================
    // SELLER ANALYTICS
    // ==========================================
    if (type === 'seller' && sellerId) {
      // Get seller stats
      const seller = await db.seller.findUnique({
        select: {
          totalSales: true,
          totalOrders: true,
          totalProducts: true,
          averageRating: true,
          totalReviews: true,
          totalEarnings: true,
          availableBalance: true,
          pendingBalance: true
        },
        where: { id: sellerId }
      })

      // Get orders in period
      const orders = await db.order.findMany({
        select: {
          total: true,
          status: true,
          createdAt: true,
          paymentMethod: true
        },
        where: {
          sellerId: sellerId,
          createdAt: {
            gte: startISO,
            lte: endISO
          }
        }
      })

      const periodRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0)
      const periodOrders = orders.length
      const deliveredOrders = orders.filter(o => o.status === 'DELIVERED' || o.status === 'COMPLETED').length

      // Order status breakdown
      const orderStatusBreakdown: Record<string, number> = {}
      orders.forEach(o => {
        orderStatusBreakdown[o.status] = (orderStatusBreakdown[o.status] || 0) + 1
      })

      // Get top products
      const topProducts = await db.product.findMany({
        select: {
          id: true,
          name: true,
          sku: true,
          purchaseCount: true,
          averageRating: true,
          totalReviews: true,
          basePrice: true,
          stockQuantity: true,
          viewCount: true
        },
        where: {
          sellerId: sellerId,
          status: 'LIVE'
        },
        orderBy: { purchaseCount: 'desc' },
        take: 10
      })

      // Get all products for inventory stats
      const allProducts = await db.product.findMany({
        select: { stockQuantity: true, status: true },
        where: { sellerId: sellerId }
      })

      const lowStockProducts = allProducts.filter(p => p.stockQuantity < 10 && p.status === 'LIVE').length
      const outOfStockProducts = allProducts.filter(p => p.stockQuantity === 0 && p.status === 'LIVE').length

      // Get recent reviews - need to get product IDs first, then reviews
      const sellerProductIds = await db.product.findMany({
        select: { id: true },
        where: { sellerId: sellerId }
      })
      
      const productIds = sellerProductIds.map(p => p.id)
      
      const recentReviews = await db.review.findMany({
        select: {
          rating: true,
          comment: true,
          createdAt: true,
          productId: true,
          product: { select: { name: true } }
        },
        where: {
          productId: { in: productIds }
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      })

      // Daily orders for chart
      const dailyOrders: Record<string, { orders: number; revenue: number }> = {}
      orders.forEach(o => {
        const date = o.createdAt.toISOString().split('T')[0]
        if (!dailyOrders[date]) {
          dailyOrders[date] = { orders: 0, revenue: 0 }
        }
        dailyOrders[date].orders++
        dailyOrders[date].revenue += o.total || 0
      })

      // Revenue chart data (last 30 days)
      const revenueChart: { date: string; revenue: number; orders: number }[] = []
      for (let i = 29; i >= 0; i--) {
        const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
        const dateStr = date.toISOString().split('T')[0]
        const dayData = dailyOrders[dateStr] || { orders: 0, revenue: 0 }
        revenueChart.push({
          date: dateStr,
          revenue: dayData.revenue,
          orders: dayData.orders
        })
      }

      // Traffic sources (mock for now - would need analytics table)
      const trafficSources = [
        { source: 'Direct', percentage: 35, sessions: Math.floor(periodOrders * 0.35) },
        { source: 'Search', percentage: 28, sessions: Math.floor(periodOrders * 0.28) },
        { source: 'Category', percentage: 22, sessions: Math.floor(periodOrders * 0.22) },
        { source: 'Social', percentage: 10, sessions: Math.floor(periodOrders * 0.10) },
        { source: 'Referral', percentage: 5, sessions: Math.floor(periodOrders * 0.05) }
      ]

      // Conversion metrics
      const productViews = await db.product.findMany({
        select: { viewCount: true, purchaseCount: true },
        where: {
          sellerId: sellerId,
          status: 'LIVE'
        }
      })

      const totalViews = productViews.reduce((sum, p) => sum + (p.viewCount || 0), 0)
      const totalPurchases = productViews.reduce((sum, p) => sum + (p.purchaseCount || 0), 0)
      const conversionRate = totalViews > 0 ? ((totalPurchases / totalViews) * 100).toFixed(2) : '0'

      return NextResponse.json({
        seller,
        period: {
          revenue: periodRevenue,
          orders: periodOrders,
          deliveredOrders,
          startDate: startISO,
          endDate: endISO
        },
        orderStatusBreakdown,
        topProducts,
        recentReviews: recentReviews.map(r => ({
          ...r,
          products: r.product ? { name: r.product.name } : null
        })),
        revenueChart,
        trafficSources,
        inventory: {
          lowStock: lowStockProducts,
          outOfStock: outOfStockProducts,
          totalProducts: allProducts.filter(p => p.status === 'LIVE').length
        },
        metrics: {
          totalViews,
          totalPurchases,
          conversionRate,
          averageOrderValue: periodOrders > 0 ? Math.round(periodRevenue / periodOrders) : 0
        },
        dailyOrders,
        periodLabel: period
      })
    }

    // ==========================================
    // PRODUCT ANALYTICS
    // ==========================================
    if (type === 'product' && productId) {
      const product = await db.product.findUnique({
        select: {
          id: true,
          name: true,
          sku: true,
          viewCount: true,
          purchaseCount: true,
          wishlistCount: true,
          averageRating: true,
          totalReviews: true,
          stockQuantity: true,
          stockSold: true,
          basePrice: true,
          compareAtPrice: true,
          createdAt: true,
          seller: {
            select: {
              id: true,
              storeName: true,
              storeLogoUrl: true
            }
          },
          category: {
            select: {
              id: true,
              name: true
            }
          }
        },
        where: { id: productId }
      })

      // Get reviews
      const reviews = await db.review.findMany({
        select: {
          rating: true,
          createdAt: true,
          comment: true,
          title: true
        },
        where: {
          productId: productId,
          createdAt: {
            gte: startISO,
            lte: endISO
          }
        }
      })

      // Rating distribution
      const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      const allReviews = await db.review.findMany({
        select: { rating: true },
        where: { productId: productId }
      })
      
      allReviews.forEach(r => {
        ratingDistribution[r.rating] = (ratingDistribution[r.rating] || 0) + 1
      })

      // Sales trend (last 30 days) - Note: order_items may need to be adjusted based on actual schema
      // Assuming OrderItem model exists
      const orderItems = await db.orderItem.findMany({
        select: {
          quantity: true,
          totalPrice: true,
          createdAt: true
        },
        where: {
          productId: productId,
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
          }
        }
      })

      const salesTrend: Record<string, { quantity: number; revenue: number }> = {}
      orderItems.forEach(item => {
        const date = item.createdAt.toISOString().split('T')[0]
        if (!salesTrend[date]) {
          salesTrend[date] = { quantity: 0, revenue: 0 }
        }
        salesTrend[date].quantity += item.quantity
        salesTrend[date].revenue += item.totalPrice
      })

      // Conversion rate
      const conversionRate = product?.viewCount && product.viewCount > 0 
        ? ((product.purchaseCount / product.viewCount) * 100).toFixed(2) 
        : '0'

      return NextResponse.json({
        product: product ? {
          ...product,
          sellers: product.seller ? {
            id: product.seller.id,
            store_name: product.seller.storeName,
            store_logo_url: product.seller.storeLogoUrl
          } : null,
          categories: product.category ? {
            id: product.category.id,
            name: product.category.name
          } : null
        } : null,
        ratingDistribution,
        periodReviews: reviews.length,
        recentReviews: reviews.slice(0, 5),
        salesTrend,
        metrics: {
          views: product?.viewCount || 0,
          purchases: product?.purchaseCount || 0,
          wishlistCount: product?.wishlistCount || 0,
          conversionRate,
          averageRating: product?.averageRating || 0,
          totalReviews: product?.totalReviews || 0,
          revenue: (product?.purchaseCount || 0) * (product?.basePrice || 0)
        },
        periodLabel: period
      })
    }

    return NextResponse.json({ error: 'Invalid analytics request' }, { status: 400 })
  } catch (error) {
    console.error('Analytics GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
