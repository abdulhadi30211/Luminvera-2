// Admin Products API Route - Full CRUD for products by admin
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashToken } from '@/lib/auth'
import { ProductStatus } from '@prisma/client'

// Helper to get authenticated admin user
async function getAdminUser(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value
  if (!token) return null

  const tokenHash = hashToken(token)
  const session = await db.session.findFirst({
    where: {
      tokenHash,
      isActive: true,
      expiresAt: { gt: new Date() }
    },
    include: { user: true }
  })

  const user = session?.user
  if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
    return null
  }

  return user
}

// GET /api/admin/products - Fetch products with filters
export async function GET(request: NextRequest) {
  try {
    const adminUser = await getAdminUser(request)
    if (!adminUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const sellerId = searchParams.get('sellerId')
    const categoryId = searchParams.get('categoryId')
    const search = searchParams.get('search') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '50')
    const skip = (page - 1) * pageSize

    // Build where clause
    const where: Record<string, unknown> = {}

    if (status && status !== 'all') {
      where.status = status as ProductStatus
    }

    if (sellerId) {
      where.sellerId = sellerId
    }

    if (categoryId) {
      where.categoryId = categoryId
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ]
    }

    // Get products
    const [products, total] = await Promise.all([
      db.product.findMany({
        where,
        include: {
          seller: {
            select: {
              id: true,
              storeName: true,
              storeLogoUrl: true,
              status: true
            }
          },
          category: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          },
          _count: {
            select: {
              reviews: true,
              wishlistItems: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize
      }),
      db.product.count({ where })
    ])

    // Get stats
    const stats = await Promise.all([
      db.product.count(),
      db.product.count({ where: { status: 'LIVE' } }),
      db.product.count({ where: { status: 'PENDING_REVIEW' } }),
      db.product.count({ where: { status: 'DRAFT' } }),
      db.product.count({ where: { status: 'SUSPENDED' } }),
      db.product.count({ where: { stockQuantity: { lte: 0 } } })
    ])

    return NextResponse.json({
      success: true,
      products,
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
        hasMore: skip + pageSize < total
      },
      stats: {
        total: stats[0],
        live: stats[1],
        pending: stats[2],
        draft: stats[3],
        suspended: stats[4],
        outOfStock: stats[5]
      }
    })
  } catch (error) {
    console.error('Admin Products GET error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/admin/products - Create product
export async function POST(request: NextRequest) {
  try {
    const adminUser = await getAdminUser(request)
    if (!adminUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      sellerId,
      name,
      description,
      shortDescription,
      categoryId,
      basePrice,
      compareAtPrice,
      costPrice,
      stockQuantity,
      sku,
      primaryImageUrl,
      images,
      videos,
      weight,
      length,
      width,
      height,
      freeShipping,
      shippingFee,
      warrantyPeriod,
      warrantyType,
      status,
      discountPercentage,
      discountAmount,
      discountStartsAt,
      discountEndsAt,
      taxRate,
      taxIncluded,
      trackInventory,
      allowBackorder,
      lowStockThreshold,
      metaTitle,
      metaDescription,
      metaKeywords,
      isFeatured,
      isNewArrival,
      isBestSeller
    } = body

    // Validation
    if (!sellerId) {
      return NextResponse.json(
        { success: false, error: 'Seller ID is required' },
        { status: 400 }
      )
    }

    if (!name || !basePrice) {
      return NextResponse.json(
        { success: false, error: 'Product name and price are required' },
        { status: 400 }
      )
    }

    // Check seller exists
    const seller = await db.seller.findUnique({
      where: { id: sellerId }
    })

    if (!seller) {
      return NextResponse.json(
        { success: false, error: 'Seller not found' },
        { status: 404 }
      )
    }

    // Generate slug and SKU
    const slug = name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') + '-' + Date.now()

    const productSku = sku || `SKU-${Date.now()}`

    // Create product
    const product = await db.product.create({
      data: {
        sellerId,
        sku: productSku,
        name,
        slug,
        description,
        shortDescription,
        categoryId,
        status: (status as ProductStatus) || ProductStatus.DRAFT,
        primaryImageUrl,
        images: images ? JSON.stringify(images) : null,
        videos: videos ? JSON.stringify(videos) : null,
        basePrice: parseFloat(basePrice),
        compareAtPrice: compareAtPrice ? parseFloat(compareAtPrice) : null,
        costPrice: costPrice ? parseFloat(costPrice) : null,
        stockQuantity: parseInt(stockQuantity) || 0,
        weight: weight ? parseFloat(weight) : null,
        length: length ? parseFloat(length) : null,
        width: width ? parseFloat(width) : null,
        height: height ? parseFloat(height) : null,
        freeShipping: freeShipping || false,
        shippingFee: parseFloat(shippingFee) || 0,
        warrantyPeriod,
        warrantyType,
        discountPercentage: parseFloat(discountPercentage) || 0,
        discountAmount: parseFloat(discountAmount) || 0,
        discountStartsAt: discountStartsAt ? new Date(discountStartsAt) : null,
        discountEndsAt: discountEndsAt ? new Date(discountEndsAt) : null,
        taxRate: parseFloat(taxRate) || 0,
        taxIncluded: taxIncluded !== false,
        trackInventory: trackInventory !== false,
        allowBackorder: allowBackorder || false,
        lowStockThreshold: parseInt(lowStockThreshold) || 10,
        metaTitle,
        metaDescription,
        metaKeywords,
        isFeatured: isFeatured || false,
        isNewArrival: isNewArrival || false,
        isBestSeller: isBestSeller || false,
        approvedBy: adminUser.id,
        approvedAt: status === 'LIVE' ? new Date() : null
      }
    })

    // Update seller product count
    await db.seller.update({
      where: { id: sellerId },
      data: { totalProducts: { increment: 1 } }
    })

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: adminUser.id,
        userRole: adminUser.role,
        action: 'CREATE_PRODUCT',
        entityType: 'product',
        entityId: product.id,
        newValue: JSON.stringify({ name, slug, sku: productSku, sellerId })
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Product created successfully',
      product
    })
  } catch (error) {
    console.error('Admin Products POST error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/admin/products - Update product
export async function PUT(request: NextRequest) {
  try {
    const adminUser = await getAdminUser(request)
    if (!adminUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { productId, ...updateFields } = body

    if (!productId) {
      return NextResponse.json(
        { success: false, error: 'Product ID is required' },
        { status: 400 }
      )
    }

    // Check if product exists
    const existingProduct = await db.product.findUnique({
      where: { id: productId }
    })

    if (!existingProduct) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      )
    }

    // Build update data
    const updateData: Record<string, unknown> = {}

    // Handle all possible fields
    const fieldMappings: Record<string, (value: unknown) => { key: string; value: unknown }> = {
      name: (v) => {
        const slug = (v as string).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
        return { key: 'name', value: v }
      },
      description: (v) => ({ key: 'description', value: v }),
      shortDescription: (v) => ({ key: 'shortDescription', value: v }),
      categoryId: (v) => ({ key: 'categoryId', value: v || null }),
      basePrice: (v) => ({ key: 'basePrice', value: parseFloat(v as string) }),
      compareAtPrice: (v) => ({ key: 'compareAtPrice', value: v ? parseFloat(v as string) : null }),
      costPrice: (v) => ({ key: 'costPrice', value: v ? parseFloat(v as string) : null }),
      stockQuantity: (v) => ({ key: 'stockQuantity', value: parseInt(v as string) }),
      sku: (v) => ({ key: 'sku', value: v }),
      primaryImageUrl: (v) => ({ key: 'primaryImageUrl', value: v }),
      images: (v) => ({ key: 'images', value: v ? JSON.stringify(v) : null }),
      videos: (v) => ({ key: 'videos', value: v ? JSON.stringify(v) : null }),
      weight: (v) => ({ key: 'weight', value: v ? parseFloat(v as string) : null }),
      length: (v) => ({ key: 'length', value: v ? parseFloat(v as string) : null }),
      width: (v) => ({ key: 'width', value: v ? parseFloat(v as string) : null }),
      height: (v) => ({ key: 'height', value: v ? parseFloat(v as string) : null }),
      freeShipping: (v) => ({ key: 'freeShipping', value: v }),
      shippingFee: (v) => ({ key: 'shippingFee', value: parseFloat(v as string) || 0 }),
      warrantyPeriod: (v) => ({ key: 'warrantyPeriod', value: v }),
      warrantyType: (v) => ({ key: 'warrantyType', value: v }),
      status: (v) => ({ key: 'status', value: v }),
      discountPercentage: (v) => ({ key: 'discountPercentage', value: parseFloat(v as string) || 0 }),
      discountAmount: (v) => ({ key: 'discountAmount', value: parseFloat(v as string) || 0 }),
      discountStartsAt: (v) => ({ key: 'discountStartsAt', value: v ? new Date(v as string) : null }),
      discountEndsAt: (v) => ({ key: 'discountEndsAt', value: v ? new Date(v as string) : null }),
      taxRate: (v) => ({ key: 'taxRate', value: parseFloat(v as string) || 0 }),
      taxIncluded: (v) => ({ key: 'taxIncluded', value: v }),
      trackInventory: (v) => ({ key: 'trackInventory', value: v }),
      allowBackorder: (v) => ({ key: 'allowBackorder', value: v }),
      lowStockThreshold: (v) => ({ key: 'lowStockThreshold', value: parseInt(v as string) }),
      metaTitle: (v) => ({ key: 'metaTitle', value: v }),
      metaDescription: (v) => ({ key: 'metaDescription', value: v }),
      metaKeywords: (v) => ({ key: 'metaKeywords', value: v }),
      isFeatured: (v) => ({ key: 'isFeatured', value: v }),
      isNewArrival: (v) => ({ key: 'isNewArrival', value: v }),
      isBestSeller: (v) => ({ key: 'isBestSeller', value: v }),
      approvalNotes: (v) => ({ key: 'approvalNotes', value: v })
    }

    for (const [field, value] of Object.entries(updateFields)) {
      if (fieldMappings[field] && value !== undefined) {
        const { key, value: processedValue } = fieldMappings[field](value)
        updateData[key] = processedValue
      }
    }

    // If status is being set to LIVE, set approvedBy and approvedAt
    if (updateFields.status === 'LIVE') {
      updateData.approvedBy = adminUser.id
      updateData.approvedAt = new Date()
    }

    // Update product
    const product = await db.product.update({
      where: { id: productId },
      data: updateData
    })

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: adminUser.id,
        userRole: adminUser.role,
        action: 'UPDATE_PRODUCT',
        entityType: 'product',
        entityId: productId,
        oldValue: JSON.stringify({ name: existingProduct.name, status: existingProduct.status }),
        newValue: JSON.stringify(updateData)
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Product updated successfully',
      product
    })
  } catch (error) {
    console.error('Admin Products PUT error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/products - Delete product
export async function DELETE(request: NextRequest) {
  try {
    const adminUser = await getAdminUser(request)
    if (!adminUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId')
    const hardDelete = searchParams.get('hard') === 'true'

    if (!productId) {
      return NextResponse.json(
        { success: false, error: 'Product ID is required' },
        { status: 400 }
      )
    }

    // Check if product exists
    const existingProduct = await db.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        name: true,
        sellerId: true,
        status: true,
        _count: {
          select: { orderItems: true, reviews: true }
        }
      }
    })

    if (!existingProduct) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      )
    }

    // Check if product has orders
    if (existingProduct._count.orderItems > 0 && !hardDelete) {
      // Soft delete - archive the product
      await db.product.update({
        where: { id: productId },
        data: {
          status: ProductStatus.ARCHIVED,
          name: `[ARCHIVED] ${existingProduct.name}`
        }
      })

      return NextResponse.json({
        success: true,
        message: 'Product archived successfully (has orders)'
      })
    }

    // Hard delete
    // Delete related records first
    await db.review.deleteMany({ where: { productId } })
    await db.wishlistItem.deleteMany({ where: { productId } })
    await db.recentlyViewed.deleteMany({ where: { productId } })
    await db.priceAlert.deleteMany({ where: { productId } })
    await db.stockAlert.deleteMany({ where: { productId } })
    await db.productAttribute.deleteMany({ where: { productId } })
    await db.productPriceHistory.deleteMany({ where: { productId } })
    await db.productVariant.deleteMany({ where: { productId } })

    // Delete product
    await db.product.delete({
      where: { id: productId }
    })

    // Update seller product count
    await db.seller.update({
      where: { id: existingProduct.sellerId },
      data: { totalProducts: { decrement: 1 } }
    })

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: adminUser.id,
        userRole: adminUser.role,
        action: 'DELETE_PRODUCT',
        entityType: 'product',
        entityId: productId,
        oldValue: JSON.stringify(existingProduct)
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Product deleted successfully'
    })
  } catch (error) {
    console.error('Admin Products DELETE error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
