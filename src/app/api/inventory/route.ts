import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// ============================================
// INVENTORY API
// Stock management, history tracking, alerts
// ============================================

// Helper to verify session and get user
async function verifySession(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value
  if (!token) {
    return null
  }

  // Hash the token to compare with stored hash
  const encoder = new TextEncoder()
  const data = encoder.encode(token)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const tokenHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

  // Find active session with user
  const session = await db.session.findFirst({
    where: {
      tokenHash,
      isActive: true,
      expiresAt: { gt: new Date() }
    },
    include: {
      user: true
    }
  })

  return session?.user ?? null
}

// Helper to get seller profile for a user
async function getSellerProfile(userId: string) {
  return db.seller.findUnique({
    where: { userId }
  })
}

// GET /api/inventory - Get inventory status for seller/admin
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sellerId = searchParams.get('sellerId')
    const productId = searchParams.get('productId')
    const lowStockOnly = searchParams.get('lowStock') === 'true'
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')

    // Authenticate user
    const user = await verifySession(request)
    if (!user || (user.role !== 'SELLER' && user.role !== 'ADMIN')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Get seller profile if not admin
    let targetSellerId = sellerId
    if (user.role === 'SELLER') {
      const seller = await getSellerProfile(user.id)
      if (!seller) {
        return NextResponse.json({ success: false, error: 'Seller profile not found' }, { status: 404 })
      }
      targetSellerId = seller.id
    }

    // Build where clause
    const where: {
      sellerId?: string
      id?: string
    } = {}
    
    if (targetSellerId) {
      where.sellerId = targetSellerId
    }
    
    if (productId) {
      where.id = productId
    }

    // Get total count
    const totalCount = await db.product.count({ where })

    // Get products with inventory data
    const products = await db.product.findMany({
      where,
      include: {
        seller: {
          select: { storeName: true }
        },
        variants: {
          where: { isActive: true }
        }
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { updatedAt: 'desc' }
    })

    // Process inventory data
    let inventoryItems = products.map((p) => {
      const stockQuantity = p.stockQuantity
      const stockReserved = p.stockReserved
      const trackInventory = p.trackInventory
      const lowStockThreshold = p.lowStockThreshold
      const availableStock = stockQuantity - stockReserved
      const isLowStock = trackInventory && availableStock <= lowStockThreshold && availableStock > 0
      const isOutOfStock = trackInventory && availableStock <= 0

      // Process variants
      const variants = p.variants.map((v) => {
        const variantStock = v.stockQuantity
        const variantReserved = v.stockReserved
        const variantAvailable = variantStock - variantReserved
        const variantIsLowStock = trackInventory && variantAvailable <= lowStockThreshold && variantAvailable > 0
        const variantIsOutOfStock = trackInventory && variantAvailable <= 0

        return {
          id: v.id,
          sku: v.sku,
          attributes: v.attributes ? JSON.parse(v.attributes) : {},
          stockQuantity: variantStock,
          stockReserved: variantReserved,
          availableStock: variantAvailable,
          priceAdjustment: v.priceAdjustment,
          isActive: v.isActive,
          isLowStock: variantIsLowStock,
          isOutOfStock: variantIsOutOfStock,
        }
      })

      return {
        id: p.id,
        sku: p.sku,
        name: p.name,
        status: p.status,
        stockQuantity,
        stockReserved,
        stockSold: p.stockSold,
        availableStock,
        lowStockThreshold,
        trackInventory,
        allowBackorder: p.allowBackorder,
        basePrice: p.basePrice,
        primaryImageUrl: p.primaryImageUrl,
        hasVariants: p.hasVariants,
        sellerId: p.sellerId,
        sellerName: p.seller?.storeName,
        variants,
        isLowStock,
        isOutOfStock,
        stockStatus: isOutOfStock ? 'OUT_OF_STOCK' : isLowStock ? 'LOW_STOCK' : 'IN_STOCK',
      }
    })

    // Filter for low stock if requested
    if (lowStockOnly) {
      inventoryItems = inventoryItems.filter((item) => item.isLowStock || item.isOutOfStock)
    }

    // Get low stock alerts count
    const lowStockCount = inventoryItems.filter((item) => item.isLowStock && !item.isOutOfStock).length
    const outOfStockCount = inventoryItems.filter((item) => item.isOutOfStock).length

    return NextResponse.json({
      success: true,
      inventory: inventoryItems,
      data: inventoryItems,
      stockHistory: [], // Note: StockHistory model not in schema
      summary: {
        total: totalCount,
        lowStock: lowStockCount,
        outOfStock: outOfStockCount,
        inStock: totalCount - lowStockCount - outOfStockCount,
      },
      pagination: {
        total: totalCount,
        page,
        pageSize,
        totalPages: Math.ceil(totalCount / pageSize),
      }
    })
  } catch (error) {
    console.error('Inventory fetch error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch inventory' }, { status: 500 })
  }
}

// POST /api/inventory - Add stock
export async function POST(request: NextRequest) {
  try {
    const user = await verifySession(request)
    if (!user || (user.role !== 'SELLER' && user.role !== 'ADMIN')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { productId, variantId, quantity, reason, reference, metadata } = body

    if (!productId || !quantity || quantity <= 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Product ID and positive quantity are required' 
      }, { status: 400 })
    }

    // Verify product exists
    const product = await db.product.findUnique({
      where: { id: productId },
      select: { id: true, sku: true, name: true, stockQuantity: true, sellerId: true }
    })

    if (!product) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 })
    }

    // Verify ownership for sellers
    if (user.role === 'SELLER') {
      const seller = await getSellerProfile(user.id)
      if (!seller || product.sellerId !== seller.id) {
        return NextResponse.json({ success: false, error: 'Not authorized' }, { status: 403 })
      }
    }

    // Update stock
    let newQuantity: number
    const previousQuantity = product.stockQuantity

    if (variantId) {
      // Update variant stock
      const variant = await db.productVariant.findUnique({
        where: { id: variantId }
      })

      if (!variant || variant.productId !== productId) {
        return NextResponse.json({ success: false, error: 'Variant not found' }, { status: 404 })
      }

      newQuantity = variant.stockQuantity + quantity
      await db.productVariant.update({
        where: { id: variantId },
        data: { stockQuantity: newQuantity }
      })
    } else {
      // Update product stock
      newQuantity = previousQuantity + quantity
      await db.product.update({
        where: { id: productId },
        data: { stockQuantity: newQuantity }
      })
    }

    // Note: Stock history would be recorded here if StockHistory model existed
    // For now, we just update the stock

    return NextResponse.json({
      success: true,
      message: 'Stock added successfully',
      data: {
        productId,
        variantId,
        addedQuantity: quantity,
        newQuantity,
      }
    })
  } catch (error) {
    console.error('Stock add error:', error)
    return NextResponse.json({ success: false, error: 'Failed to add stock' }, { status: 500 })
  }
}

// PUT /api/inventory - Update stock quantity or set low stock threshold
export async function PUT(request: NextRequest) {
  try {
    const user = await verifySession(request)
    if (!user || (user.role !== 'SELLER' && user.role !== 'ADMIN')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      productId, 
      variantId, 
      stockQuantity, 
      lowStockThreshold, 
      trackInventory, 
      allowBackorder,
      reason 
    } = body

    if (!productId) {
      return NextResponse.json({ success: false, error: 'Product ID is required' }, { status: 400 })
    }

    // Verify product exists
    const product = await db.product.findUnique({
      where: { id: productId },
      select: { id: true, sku: true, name: true, stockQuantity: true, lowStockThreshold: true, sellerId: true }
    })

    if (!product) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 })
    }

    // Verify ownership for sellers
    if (user.role === 'SELLER') {
      const seller = await getSellerProfile(user.id)
      if (!seller || product.sellerId !== seller.id) {
        return NextResponse.json({ success: false, error: 'Not authorized' }, { status: 403 })
      }
    }

    // Update variant stock
    if (variantId && stockQuantity !== undefined) {
      const variant = await db.productVariant.findUnique({
        where: { id: variantId }
      })

      if (!variant || variant.productId !== productId) {
        return NextResponse.json({ success: false, error: 'Variant not found' }, { status: 404 })
      }

      const previousQuantity = variant.stockQuantity
      await db.productVariant.update({
        where: { id: variantId },
        data: { stockQuantity }
      })

      // Note: Stock history would be recorded here if StockHistory model existed

      return NextResponse.json({
        success: true,
        message: 'Variant stock updated successfully',
        data: { productId, variantId, newQuantity: stockQuantity }
      })
    }

    // Build update data for product
    const updateData: {
      stockQuantity?: number
      lowStockThreshold?: number
      trackInventory?: boolean
      allowBackorder?: boolean
    } = {}
    
    if (stockQuantity !== undefined) {
      updateData.stockQuantity = stockQuantity
    }
    if (lowStockThreshold !== undefined) {
      updateData.lowStockThreshold = lowStockThreshold
    }
    if (trackInventory !== undefined) {
      updateData.trackInventory = trackInventory
    }
    if (allowBackorder !== undefined) {
      updateData.allowBackorder = allowBackorder
    }

    // Update product
    await db.product.update({
      where: { id: productId },
      data: updateData
    })

    // Create low stock notification if needed
    const threshold = lowStockThreshold ?? product.lowStockThreshold
    if (stockQuantity !== undefined && stockQuantity <= threshold) {
      // Get seller user id
      const seller = await db.seller.findUnique({
        where: { id: product.sellerId },
        select: { userId: true }
      })

      if (seller) {
        await db.notification.create({
          data: {
            userId: seller.userId,
            type: 'SYSTEM',
            title: 'Low Stock Alert',
            message: `Product "${product.name}" is running low on stock (${stockQuantity} remaining)`,
            data: JSON.stringify({ productId, stockQuantity, threshold }),
          }
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Inventory updated successfully',
      data: { productId, updates: updateData }
    })
  } catch (error) {
    console.error('Inventory update error:', error)
    return NextResponse.json({ success: false, error: 'Failed to update inventory' }, { status: 500 })
  }
}

// DELETE /api/inventory - Remove stock (record as stock out)
export async function DELETE(request: NextRequest) {
  try {
    const user = await verifySession(request)
    if (!user || (user.role !== 'SELLER' && user.role !== 'ADMIN')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId')
    const variantId = searchParams.get('variantId')
    const quantity = parseInt(searchParams.get('quantity') || '0')
    const reason = searchParams.get('reason') || 'stock_removed'

    if (!productId || quantity <= 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Product ID and positive quantity are required' 
      }, { status: 400 })
    }

    // Verify product exists
    const product = await db.product.findUnique({
      where: { id: productId },
      select: { id: true, sku: true, name: true, stockQuantity: true, sellerId: true }
    })

    if (!product) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 })
    }

    // Verify ownership for sellers
    if (user.role === 'SELLER') {
      const seller = await getSellerProfile(user.id)
      if (!seller || product.sellerId !== seller.id) {
        return NextResponse.json({ success: false, error: 'Not authorized' }, { status: 403 })
      }
    }

    // Update stock
    let newQuantity: number
    const previousQuantity = product.stockQuantity

    if (variantId) {
      const variant = await db.productVariant.findUnique({
        where: { id: variantId }
      })

      if (!variant || variant.productId !== productId) {
        return NextResponse.json({ success: false, error: 'Variant not found' }, { status: 404 })
      }

      const variantPreviousQty = variant.stockQuantity
      newQuantity = Math.max(0, variantPreviousQty - quantity)
      await db.productVariant.update({
        where: { id: variantId },
        data: { stockQuantity: newQuantity }
      })

      // Note: Stock history would be recorded here if StockHistory model existed
    } else {
      newQuantity = Math.max(0, previousQuantity - quantity)
      await db.product.update({
        where: { id: productId },
        data: { stockQuantity: newQuantity }
      })

      // Note: Stock history would be recorded here if StockHistory model existed
    }

    return NextResponse.json({
      success: true,
      message: 'Stock removed successfully',
      data: {
        productId,
        variantId,
        removedQuantity: quantity,
        newQuantity,
      }
    })
  } catch (error) {
    console.error('Stock removal error:', error)
    return NextResponse.json({ success: false, error: 'Failed to remove stock' }, { status: 500 })
  }
}
