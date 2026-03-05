// Sellers API Route
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { SellerStatus, ProductStatus, UserRole } from '@prisma/client'

// GET - List all sellers (public) or specific seller
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sellerId = searchParams.get('id')
    const slug = searchParams.get('slug')
    const status = searchParams.get('status')
    const featured = searchParams.get('featured')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Get specific seller by ID or slug
    if (sellerId || slug) {
      const where = slug ? { storeSlug: slug } : { id: sellerId }

      const seller = await db.seller.findUnique({
        where,
        include: {
          user: {
            select: {
              email: true,
              firstName: true,
              lastName: true,
              phone: true,
              avatarUrl: true
            }
          }
        }
      })

      if (!seller) {
        return NextResponse.json({ error: 'Seller not found' }, { status: 404 })
      }

      // Get seller's products count and featured products
      const productsCount = await db.product.count({
        where: {
          sellerId: seller.id,
          status: 'LIVE' as ProductStatus
        }
      })

      const featuredProducts = await db.product.findMany({
        where: {
          sellerId: seller.id,
          status: 'LIVE' as ProductStatus,
          isFeatured: true
        },
        select: {
          id: true,
          name: true,
          slug: true,
          basePrice: true,
          primaryImageUrl: true,
          averageRating: true,
          totalReviews: true
        },
        take: 6
      })

      return NextResponse.json({
        seller: {
          ...seller,
          productsCount,
          featuredProducts
        }
      })
    }

    // List sellers with filters
    const where: any = {}

    // Apply filters
    if (status) {
      where.status = status.toUpperCase() as SellerStatus
    }
    if (featured === 'true') {
      where.isFeatured = true
    }

    // Get sellers with count
    const [sellers, count] = await Promise.all([
      db.seller.findMany({
        where,
        select: {
          id: true,
          storeName: true,
          storeSlug: true,
          storeDescription: true,
          storeLogoUrl: true,
          storeBannerUrl: true,
          status: true,
          totalSales: true,
          totalOrders: true,
          totalProducts: true,
          averageRating: true,
          totalReviews: true,
          isFeatured: true,
          isTopSeller: true,
          createdAt: true
        },
        orderBy: [
          { isFeatured: 'desc' },
          { averageRating: 'desc' }
        ],
        skip: offset,
        take: limit
      }),
      db.seller.count({ where })
    ])

    return NextResponse.json({
      sellers,
      pagination: {
        total: count,
        limit,
        offset,
        hasMore: offset + limit < count
      }
    })
  } catch (error) {
    console.error('Sellers GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create seller profile (authenticated user)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, storeName, storeDescription, businessName, cnicNumber, ntnNumber } = body

    if (!userId || !storeName) {
      return NextResponse.json({ error: 'User ID and store name are required' }, { status: 400 })
    }

    // Generate store slug
    const storeSlug = storeName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') + '-' + Math.random().toString(36).substring(2, 8)

    // Check if user exists and doesn't already have a seller profile
    const existingSeller = await db.seller.findUnique({
      where: { userId }
    })

    if (existingSeller) {
      return NextResponse.json({ error: 'User already has a seller profile' }, { status: 400 })
    }

    // Create seller profile
    const seller = await db.seller.create({
      data: {
        userId,
        storeName,
        storeSlug,
        storeDescription,
        businessName,
        cnicNumber,
        ntnNumber,
        status: 'PENDING' as SellerStatus,
        totalSales: 0,
        totalOrders: 0,
        totalProducts: 0,
        averageRating: 0,
        totalReviews: 0,
        commissionRate: 10,
        totalEarnings: 0,
        availableBalance: 0,
        pendingBalance: 0
      }
    })

    // Update user role to SELLER
    await db.user.update({
      where: { id: userId },
      data: { role: 'SELLER' as UserRole }
    })

    return NextResponse.json({ success: true, seller })
  } catch (error) {
    console.error('Sellers POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - Update seller profile
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { sellerId, userId, ...updates } = body

    if (!sellerId || !userId) {
      return NextResponse.json({ error: 'Seller ID and User ID are required' }, { status: 400 })
    }

    // Verify ownership
    const seller = await db.seller.findUnique({
      where: { id: sellerId },
      select: { userId: true }
    })

    if (!seller || seller.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Update allowed fields
    const allowedUpdates = [
      'storeName', 'storeDescription', 'storeLogoUrl', 'storeBannerUrl',
      'businessPhone', 'businessEmail', 'bankName', 'bankAccountTitle',
      'bankAccountNumber', 'iban', 'jazzCashNumber', 'easypaisaNumber',
      'returnPolicy', 'shippingPolicy', 'warrantyPolicy'
    ]

    const filteredUpdates: Record<string, any> = {}
    for (const key of allowedUpdates) {
      // Convert camelCase to the actual field names in the schema
      const fieldName = key === 'jazzCashNumber' ? 'jazzCashNumber' : 
                        key === 'easypaisaNumber' ? 'easypaisaNumber' : key
      
      if (updates[key] !== undefined) {
        filteredUpdates[fieldName] = updates[key]
      }
    }

    const updatedSeller = await db.seller.update({
      where: { id: sellerId },
      data: filteredUpdates
    })

    return NextResponse.json({ success: true, seller: updatedSeller })
  } catch (error) {
    console.error('Sellers PUT error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
