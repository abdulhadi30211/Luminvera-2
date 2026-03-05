// Reports API Route - Comprehensive Analytics & Reporting
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { format, subDays, subWeeks, subMonths, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'

// Verify admin access
async function verifyAdmin(userId: string): Promise<boolean> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true }
  })
  return user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN'
}

// Get date range based on period
function getDateRange(period: string): { start: Date; end: Date } {
  const now = new Date()
  
  switch (period) {
    case 'today':
      return { start: startOfDay(now), end: endOfDay(now) }
    case 'yesterday':
      const yesterday = subDays(now, 1)
      return { start: startOfDay(yesterday), end: endOfDay(yesterday) }
    case 'week':
      return { start: startOfWeek(now), end: endOfWeek(now) }
    case 'last_week':
      const lastWeek = subWeeks(now, 1)
      return { start: startOfWeek(lastWeek), end: endOfWeek(lastWeek) }
    case 'month':
      return { start: startOfMonth(now), end: endOfMonth(now) }
    case 'last_month':
      const lastMonth = subMonths(now, 1)
      return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) }
    case 'quarter':
      const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
      return { start: quarterStart, end: now }
    case 'year':
      return { start: new Date(now.getFullYear(), 0, 1), end: now }
    case 'all':
    default:
      return { start: new Date(2020, 0, 1), end: now }
  }
}

// Convert to CSV
function toCSV(data: any[], headers: string[]): string {
  const headerRow = headers.join(',')
  const rows = data.map(row => 
    headers.map(h => {
      const value = row[h]
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`
      }
      return value ?? ''
    }).join(',')
  )
  return [headerRow, ...rows].join('\n')
}

// GET - Generate reports
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'sales'
    const period = searchParams.get('period') || 'month'
    const format_type = searchParams.get('format') || 'json'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const sellerId = searchParams.get('sellerId')
    const categoryId = searchParams.get('categoryId')
    
    // Get date range
    const dateRange = startDate && endDate
      ? { start: new Date(startDate), end: new Date(endDate) }
      : getDateRange(period)
    
    let reportData: any = {}
    
    switch (type) {
      case 'sales':
        reportData = await generateSalesReport(dateRange, sellerId)
        break
      case 'products':
        reportData = await generateProductPerformanceReport(dateRange, sellerId, categoryId)
        break
      case 'sellers':
        reportData = await generateSellerPerformanceReport(dateRange)
        break
      case 'financial':
        reportData = await generateFinancialReport(dateRange)
        break
      case 'inventory':
        reportData = await generateInventoryReport(sellerId, categoryId)
        break
      case 'customers':
        reportData = await generateCustomerReport(dateRange)
        break
      default:
        return NextResponse.json({ error: 'Invalid report type' }, { status: 400 })
    }
    
    // Export to CSV if requested
    if (format_type === 'csv') {
      const csvData = reportData.csv || toCSV(reportData.data || [], reportData.headers || [])
      return new NextResponse(csvData, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${type}_report_${format(new Date(), 'yyyy-MM-dd')}.csv"`
        }
      })
    }
    
    // Export to Excel (as CSV with xlsx extension)
    if (format_type === 'excel') {
      const csvData = reportData.csv || toCSV(reportData.data || [], reportData.headers || [])
      return new NextResponse(csvData, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${type}_report_${format(new Date(), 'yyyy-MM-dd')}.xlsx"`
        }
      })
    }
    
    return NextResponse.json({
      success: true,
      type,
      period,
      dateRange: {
        start: dateRange.start.toISOString(),
        end: dateRange.end.toISOString()
      },
      generatedAt: new Date().toISOString(),
      ...reportData
    })
  } catch (error) {
    console.error('Reports GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Sales Report
async function generateSalesReport(dateRange: { start: Date; end: Date }, sellerId?: string | null) {
  // Base query for orders
  const whereClause: any = {
    placedAt: { gte: dateRange.start, lte: dateRange.end },
    status: { notIn: ['CANCELLED'] }
  }
  
  if (sellerId) {
    whereClause.sellerId = sellerId
  }
  
  // Get orders
  const orders = await db.order.findMany({
    where: whereClause,
    include: {
      items: true,
      user: { select: { id: true, firstName: true, lastName: true, email: true } },
      seller: { select: { id: true, storeName: true } }
    },
    orderBy: { placedAt: 'asc' }
  })
  
  // Calculate metrics
  const totalOrders = orders.length
  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0)
  const totalSubtotal = orders.reduce((sum, o) => sum + o.subtotal, 0)
  const totalDiscount = orders.reduce((sum, o) => sum + o.discount + o.couponDiscount, 0)
  const totalDeliveryFee = orders.reduce((sum, o) => sum + o.deliveryFee, 0)
  const totalItems = orders.reduce((sum, o) => sum + o.items.length, 0)
  const totalQuantity = orders.reduce((sum, o) => sum + o.items.reduce((s, i) => s + i.quantity, 0), 0)
  
  // Average order value
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0
  
  // Group by day
  const dailySales: Record<string, { orders: number; revenue: number }> = {}
  orders.forEach(order => {
    const day = format(order.placedAt, 'yyyy-MM-dd')
    if (!dailySales[day]) {
      dailySales[day] = { orders: 0, revenue: 0 }
    }
    dailySales[day].orders++
    dailySales[day].revenue += order.total
  })
  
  // Order status distribution
  const statusDistribution = await db.order.groupBy({
    by: ['status'],
    where: whereClause,
    _count: { id: true }
  })
  
  // Payment method distribution
  const paymentDistribution = await db.order.groupBy({
    by: ['paymentMethod'],
    where: whereClause,
    _count: { id: true },
    _sum: { total: true }
  })
  
  // Top selling products
  const orderItems = await db.orderItem.findMany({
    where: {
      order: whereClause
    },
    include: {
      product: { select: { id: true, name: true, sku: true } }
    }
  })
  
  const productSales: Record<string, { productId: string; productName: string; sku: string; quantity: number; revenue: number }> = {}
  orderItems.forEach(item => {
    if (!productSales[item.productId]) {
      productSales[item.productId] = {
        productId: item.productId,
        productName: item.productName,
        sku: item.productSku,
        quantity: 0,
        revenue: 0
      }
    }
    productSales[item.productId].quantity += item.quantity
    productSales[item.productId].revenue += item.totalPrice
  })
  
  const topProducts = Object.values(productSales)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10)
  
  // Format data for CSV export
  const csvData = orders.map(o => ({
    OrderNumber: o.orderNumber,
    Date: format(o.placedAt, 'yyyy-MM-dd HH:mm'),
    Customer: `${o.user?.firstName || ''} ${o.user?.lastName || ''}`.trim(),
    Email: o.user?.email || '',
    Status: o.status,
    PaymentMethod: o.paymentMethod,
    PaymentStatus: o.paymentStatus,
    Subtotal: o.subtotal,
    Discount: o.discount + o.couponDiscount,
    DeliveryFee: o.deliveryFee,
    Tax: o.tax,
    Total: o.total,
    Items: o.items.length
  }))
  
  return {
    summary: {
      totalOrders,
      totalRevenue,
      totalSubtotal,
      totalDiscount,
      totalDeliveryFee,
      totalItems,
      totalQuantity,
      avgOrderValue
    },
    dailySales: Object.entries(dailySales).map(([date, data]) => ({
      date,
      ...data
    })),
    statusDistribution: statusDistribution.map(s => ({
      status: s.status,
      count: s._count.id
    })),
    paymentDistribution: paymentDistribution.map(p => ({
      method: p.paymentMethod,
      count: p._count.id,
      total: p._sum.total || 0
    })),
    topProducts,
    orders: orders.slice(0, 50),
    data: csvData,
    headers: ['OrderNumber', 'Date', 'Customer', 'Email', 'Status', 'PaymentMethod', 'PaymentStatus', 'Subtotal', 'Discount', 'DeliveryFee', 'Tax', 'Total', 'Items']
  }
}

// Product Performance Report
async function generateProductPerformanceReport(dateRange: { start: Date; end: Date }, sellerId?: string | null, categoryId?: string | null) {
  // Build product filter
  const productWhere: any = {}
  if (sellerId) productWhere.sellerId = sellerId
  if (categoryId) productWhere.categoryId = categoryId
  
  // Get all products
  const products = await db.product.findMany({
    where: productWhere,
    include: {
      seller: { select: { id: true, storeName: true } },
      category: { select: { id: true, name: true } },
      orderItems: {
        where: {
          order: {
            placedAt: { gte: dateRange.start, lte: dateRange.end },
            status: { notIn: ['CANCELLED'] }
          }
        }
      },
      reviews: { select: { rating: true } }
    }
  })
  
  // Calculate performance for each product
  const productPerformance = products.map(product => {
    const totalSold = product.orderItems.reduce((sum, item) => sum + item.quantity, 0)
    const totalRevenue = product.orderItems.reduce((sum, item) => sum + item.totalPrice, 0)
    const avgRating = product.reviews.length > 0
      ? product.reviews.reduce((sum, r) => sum + r.rating, 0) / product.reviews.length
      : 0
    
    return {
      id: product.id,
      name: product.name,
      sku: product.sku,
      status: product.status,
      basePrice: product.basePrice,
      compareAtPrice: product.compareAtPrice,
      stockQuantity: product.stockQuantity,
      totalSold,
      totalRevenue,
      totalOrders: product.orderItems.length,
      avgRating,
      totalReviews: product.reviews.length,
      viewCount: product.viewCount,
      wishlistCount: product.wishlistCount,
      seller: product.seller,
      category: product.category,
      conversionRate: product.viewCount > 0 ? (totalSold / product.viewCount) * 100 : 0
    }
  })
  
  // Sort by revenue
  productPerformance.sort((a, b) => b.totalRevenue - a.totalRevenue)
  
  // Summary statistics
  const totalProducts = products.length
  const activeProducts = products.filter(p => p.status === 'LIVE').length
  const totalSold = productPerformance.reduce((sum, p) => sum + p.totalSold, 0)
  const totalRevenue = productPerformance.reduce((sum, p) => sum + p.totalRevenue, 0)
  
  // Low stock products
  const lowStockProducts = products
    .filter(p => p.stockQuantity <= p.lowStockThreshold && p.stockQuantity > 0)
    .map(p => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      stockQuantity: p.stockQuantity,
      lowStockThreshold: p.lowStockThreshold
    }))
  
  // Out of stock products
  const outOfStockProducts = products
    .filter(p => p.stockQuantity === 0)
    .map(p => ({
      id: p.id,
      name: p.name,
      sku: p.sku
    }))
  
  // CSV data
  const csvData = productPerformance.map(p => ({
    SKU: p.sku,
    Name: p.name,
    Status: p.status,
    Price: p.basePrice,
    Stock: p.stockQuantity,
    Sold: p.totalSold,
    Revenue: p.totalRevenue,
    Orders: p.totalOrders,
    AvgRating: p.avgRating.toFixed(2),
    Reviews: p.totalReviews,
    Views: p.viewCount,
    Wishlist: p.wishlistCount,
    ConversionRate: `${p.conversionRate.toFixed(2)}%`,
    Seller: p.seller?.storeName || '',
    Category: p.category?.name || ''
  }))
  
  return {
    summary: {
      totalProducts,
      activeProducts,
      totalSold,
      totalRevenue,
      lowStockCount: lowStockProducts.length,
      outOfStockCount: outOfStockProducts.length
    },
    products: productPerformance.slice(0, 100),
    lowStock: lowStockProducts,
    outOfStock: outOfStockProducts,
    data: csvData,
    headers: ['SKU', 'Name', 'Status', 'Price', 'Stock', 'Sold', 'Revenue', 'Orders', 'AvgRating', 'Reviews', 'Views', 'Wishlist', 'ConversionRate', 'Seller', 'Category']
  }
}

// Seller Performance Report
async function generateSellerPerformanceReport(dateRange: { start: Date; end: Date }) {
  // Get all sellers
  const sellers = await db.seller.findMany({
    include: {
      user: { select: { id: true, email: true, firstName: true, lastName: true } },
      products: { select: { id: true, status: true } },
      orders: {
        where: {
          placedAt: { gte: dateRange.start, lte: dateRange.end }
        },
        select: {
          id: true,
          status: true,
          total: true,
          placedAt: true,
          items: { select: { commissionAmount: true, sellerEarnings: true } }
        }
      },
      sellerPayouts: {
        where: {
          createdAt: { gte: dateRange.start, lte: dateRange.end }
        }
      }
    }
  })
  
  // Calculate performance for each seller
  const sellerPerformance = sellers.map(seller => {
    const activeProducts = seller.products.filter(p => p.status === 'LIVE').length
    const totalOrders = seller.orders.length
    const completedOrders = seller.orders.filter(o => o.status === 'COMPLETED' || o.status === 'DELIVERED').length
    const cancelledOrders = seller.orders.filter(o => o.status === 'CANCELLED').length
    
    const totalRevenue = seller.orders.reduce((sum, o) => sum + o.total, 0)
    const totalCommission = seller.orders.reduce((sum, o) => 
      sum + o.items.reduce((s, i) => s + i.commissionAmount, 0), 0
    )
    const totalEarnings = seller.orders.reduce((sum, o) => 
      sum + o.items.reduce((s, i) => s + i.sellerEarnings, 0), 0
    )
    
    const totalPayouts = seller.sellerPayouts.reduce((sum, p) => sum + p.amount, 0)
    const completedPayouts = seller.sellerPayouts.filter(p => p.status === 'COMPLETED').length
    
    const cancellationRate = totalOrders > 0 ? (cancelledOrders / totalOrders) * 100 : 0
    const completionRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0
    
    return {
      id: seller.id,
      storeName: seller.storeName,
      storeSlug: seller.storeSlug,
      status: seller.status,
      email: seller.user.email,
      ownerName: `${seller.user.firstName || ''} ${seller.user.lastName || ''}`.trim(),
      totalProducts: seller.products.length,
      activeProducts,
      totalOrders,
      completedOrders,
      cancelledOrders,
      totalRevenue,
      totalCommission,
      totalEarnings,
      availableBalance: seller.availableBalance,
      pendingBalance: seller.pendingBalance,
      totalPayouts,
      completedPayouts,
      cancellationRate,
      completionRate,
      averageRating: seller.averageRating,
      totalReviews: seller.totalReviews,
      commissionRate: seller.commissionRate,
      isFeatured: seller.isFeatured,
      isTopSeller: seller.isTopSeller,
      createdAt: seller.createdAt
    }
  })
  
  // Sort by revenue
  sellerPerformance.sort((a, b) => b.totalRevenue - a.totalRevenue)
  
  // Summary
  const totalSellers = sellers.length
  const activeSellers = sellers.filter(s => s.status === 'VERIFIED').length
  const totalRevenue = sellerPerformance.reduce((sum, s) => sum + s.totalRevenue, 0)
  const totalCommission = sellerPerformance.reduce((sum, s) => sum + s.totalCommission, 0)
  const totalPayouts = sellerPerformance.reduce((sum, s) => sum + s.totalPayouts, 0)
  
  // CSV data
  const csvData = sellerPerformance.map(s => ({
    StoreName: s.storeName,
    Status: s.status,
    Email: s.email,
    Owner: s.ownerName,
    Products: s.totalProducts,
    ActiveProducts: s.activeProducts,
    Orders: s.totalOrders,
    CompletedOrders: s.completedOrders,
    CancelledOrders: s.cancelledOrders,
    Revenue: s.totalRevenue,
    Commission: s.totalCommission,
    Earnings: s.totalEarnings,
    AvailableBalance: s.availableBalance,
    PendingBalance: s.pendingBalance,
    TotalPayouts: s.totalPayouts,
    CancellationRate: `${s.cancellationRate.toFixed(2)}%`,
    CompletionRate: `${s.completionRate.toFixed(2)}%`,
    AvgRating: s.averageRating.toFixed(2),
    TotalReviews: s.totalReviews
  }))
  
  return {
    summary: {
      totalSellers,
      activeSellers,
      totalRevenue,
      totalCommission,
      totalPayouts,
      pendingBalances: sellerPerformance.reduce((sum, s) => sum + s.pendingBalance, 0),
      availableBalances: sellerPerformance.reduce((sum, s) => sum + s.availableBalance, 0)
    },
    sellers: sellerPerformance,
    data: csvData,
    headers: ['StoreName', 'Status', 'Email', 'Owner', 'Products', 'ActiveProducts', 'Orders', 'CompletedOrders', 'CancelledOrders', 'Revenue', 'Commission', 'Earnings', 'AvailableBalance', 'PendingBalance', 'TotalPayouts', 'CancellationRate', 'CompletionRate', 'AvgRating', 'TotalReviews']
  }
}

// Financial Report
async function generateFinancialReport(dateRange: { start: Date; end: Date }) {
  // Get all completed orders
  const orders = await db.order.findMany({
    where: {
      placedAt: { gte: dateRange.start, lte: dateRange.end },
      status: { notIn: ['CANCELLED'] }
    },
    include: {
      items: true,
      payments: true
    }
  })
  
  // Calculate revenue breakdown
  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0)
  const productRevenue = orders.reduce((sum, o) => sum + o.subtotal, 0)
  const shippingRevenue = orders.reduce((sum, o) => sum + o.deliveryFee, 0)
  const discountGiven = orders.reduce((sum, o) => sum + o.discount + o.couponDiscount, 0)
  const taxCollected = orders.reduce((sum, o) => sum + o.tax, 0)
  
  // Calculate commissions
  const orderItems = await db.orderItem.findMany({
    where: {
      order: {
        placedAt: { gte: dateRange.start, lte: dateRange.end },
        status: { notIn: ['CANCELLED'] }
      }
    }
  })
  
  const totalCommission = orderItems.reduce((sum, i) => sum + i.commissionAmount, 0)
  const sellerEarnings = orderItems.reduce((sum, i) => sum + i.sellerEarnings, 0)
  
  // Get payouts
  const payouts = await db.sellerPayout.findMany({
    where: {
      createdAt: { gte: dateRange.start, lte: dateRange.end }
    }
  })
  
  const totalPayouts = payouts.filter(p => p.status === 'COMPLETED').reduce((sum, p) => sum + p.amount, 0)
  const pendingPayouts = payouts.filter(p => p.status === 'PENDING').reduce((sum, p) => sum + p.amount, 0)
  
  // Get refunds
  const refunds = await db.refund.findMany({
    where: {
      createdAt: { gte: dateRange.start, lte: dateRange.end }
    }
  })
  
  const totalRefunds = refunds.reduce((sum, r) => sum + r.amount, 0)
  
  // Payment method breakdown
  const payments = await db.payment.findMany({
    where: {
      initiatedAt: { gte: dateRange.start, lte: dateRange.end },
      status: 'COMPLETED'
    }
  })
  
  const paymentMethodTotals: Record<string, number> = {}
  payments.forEach(p => {
    const method = p.paymentMethod
    if (!paymentMethodTotals[method]) {
      paymentMethodTotals[method] = 0
    }
    paymentMethodTotals[method] += p.amount
  })
  
  // Daily financial data
  const dailyFinancials: Record<string, { revenue: number; commission: number; payouts: number; refunds: number }> = {}
  
  orders.forEach(o => {
    const day = format(o.placedAt, 'yyyy-MM-dd')
    if (!dailyFinancials[day]) {
      dailyFinancials[day] = { revenue: 0, commission: 0, payouts: 0, refunds: 0 }
    }
    dailyFinancials[day].revenue += o.total
  })
  
  payouts.forEach(p => {
    const day = format(p.createdAt, 'yyyy-MM-dd')
    if (!dailyFinancials[day]) {
      dailyFinancials[day] = { revenue: 0, commission: 0, payouts: 0, refunds: 0 }
    }
    if (p.status === 'COMPLETED') {
      dailyFinancials[day].payouts += p.amount
    }
  })
  
  refunds.forEach(r => {
    const day = format(r.createdAt, 'yyyy-MM-dd')
    if (!dailyFinancials[day]) {
      dailyFinancials[day] = { revenue: 0, commission: 0, payouts: 0, refunds: 0 }
    }
    dailyFinancials[day].refunds += r.amount
  })
  
  // Platform profit calculation
  const platformProfit = totalCommission - totalRefunds
  
  // CSV data - daily financials
  const csvData = Object.entries(dailyFinancials).map(([date, data]) => ({
    Date: date,
    Revenue: data.revenue,
    Commission: 0,
    Payouts: data.payouts,
    Refunds: data.refunds,
    NetRevenue: data.revenue - data.payouts - data.refunds
  }))
  
  return {
    summary: {
      totalRevenue,
      productRevenue,
      shippingRevenue,
      discountGiven,
      taxCollected,
      totalCommission,
      sellerEarnings,
      totalPayouts,
      pendingPayouts,
      totalRefunds,
      platformProfit,
      netRevenue: totalRevenue - totalPayouts - totalRefunds
    },
    paymentMethodTotals: Object.entries(paymentMethodTotals).map(([method, total]) => ({
      method,
      total,
      count: payments.filter(p => p.paymentMethod === method).length
    })),
    dailyFinancials: Object.entries(dailyFinancials).map(([date, data]) => ({
      date,
      ...data
    })),
    refunds: refunds.slice(0, 50),
    payouts: payouts.slice(0, 50),
    data: csvData,
    headers: ['Date', 'Revenue', 'Commission', 'Payouts', 'Refunds', 'NetRevenue']
  }
}

// Inventory Report
async function generateInventoryReport(sellerId?: string | null, categoryId?: string | null) {
  const whereClause: any = {}
  if (sellerId) whereClause.sellerId = sellerId
  if (categoryId) whereClause.categoryId = categoryId
  
  const products = await db.product.findMany({
    where: whereClause,
    include: {
      seller: { select: { id: true, storeName: true } },
      category: { select: { id: true, name: true } }
    }
  })
  
  const totalProducts = products.length
  const totalStock = products.reduce((sum, p) => sum + p.stockQuantity, 0)
  const lowStock = products.filter(p => p.stockQuantity <= p.lowStockThreshold && p.stockQuantity > 0)
  const outOfStock = products.filter(p => p.stockQuantity === 0)
  const overStocked = products.filter(p => p.stockQuantity > 100)
  
  const csvData = products.map(p => ({
    SKU: p.sku,
    Name: p.name,
    Status: p.status,
    Stock: p.stockQuantity,
    Reserved: p.stockReserved,
    Sold: p.stockSold,
    LowStockThreshold: p.lowStockThreshold,
    Seller: p.seller?.storeName || '',
    Category: p.category?.name || ''
  }))
  
  return {
    summary: {
      totalProducts,
      totalStock,
      lowStockCount: lowStock.length,
      outOfStockCount: outOfStock.length,
      overStockedCount: overStocked.length
    },
    lowStock: lowStock.map(p => ({
      id: p.id,
      sku: p.sku,
      name: p.name,
      stockQuantity: p.stockQuantity,
      lowStockThreshold: p.lowStockThreshold
    })),
    outOfStock: outOfStock.map(p => ({
      id: p.id,
      sku: p.sku,
      name: p.name
    })),
    products: products.slice(0, 100),
    data: csvData,
    headers: ['SKU', 'Name', 'Status', 'Stock', 'Reserved', 'Sold', 'LowStockThreshold', 'Seller', 'Category']
  }
}

// Customer Report
async function generateCustomerReport(dateRange: { start: Date; end: Date }) {
  // New customers
  const newCustomers = await db.user.findMany({
    where: {
      role: 'USER',
      createdAt: { gte: dateRange.start, lte: dateRange.end }
    },
    include: {
      orders: { select: { id: true, total: true } }
    }
  })
  
  // All customers with orders in period
  const customersWithOrders = await db.user.findMany({
    where: {
      role: 'USER',
      orders: {
        some: {
          placedAt: { gte: dateRange.start, lte: dateRange.end }
        }
      }
    },
    include: {
      orders: {
        where: {
          placedAt: { gte: dateRange.start, lte: dateRange.end }
        },
        select: { id: true, total: true, placedAt: true }
      }
    }
  })
  
  // Calculate metrics
  const totalCustomers = await db.user.count({ where: { role: 'USER' } })
  const newCustomerCount = newCustomers.length
  const activeCustomers = customersWithOrders.length
  
  // Top customers by spend
  const customerSpending = customersWithOrders.map(customer => ({
    id: customer.id,
    email: customer.email,
    name: `${customer.firstName || ''} ${customer.lastName || ''}`.trim(),
    orderCount: customer.orders.length,
    totalSpent: customer.orders.reduce((sum, o) => sum + o.total, 0),
    lastOrder: customer.orders.length > 0 ? customer.orders[customer.orders.length - 1].placedAt : null
  }))
  
  customerSpending.sort((a, b) => b.totalSpent - a.totalSpent)
  
  // CSV data
  const csvData = customerSpending.map(c => ({
    Email: c.email,
    Name: c.name,
    Orders: c.orderCount,
    TotalSpent: c.totalSpent,
    LastOrder: c.lastOrder ? format(c.lastOrder, 'yyyy-MM-dd') : ''
  }))
  
  return {
    summary: {
      totalCustomers,
      newCustomers: newCustomerCount,
      activeCustomers,
      averageOrderValue: activeCustomers > 0 
        ? customerSpending.reduce((sum, c) => sum + c.totalSpent, 0) / customerSpending.reduce((sum, c) => sum + c.orderCount, 0)
        : 0
    },
    topCustomers: customerSpending.slice(0, 50),
    newCustomers: newCustomers.slice(0, 50).map(c => ({
      id: c.id,
      email: c.email,
      name: `${c.firstName || ''} ${c.lastName || ''}`.trim(),
      createdAt: c.createdAt,
      hasOrdered: c.orders.length > 0
    })),
    data: csvData,
    headers: ['Email', 'Name', 'Orders', 'TotalSpent', 'LastOrder']
  }
}
