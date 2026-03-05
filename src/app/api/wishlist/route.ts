// Wishlist API Route - Using Prisma
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - Get user's wishlist
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Get total count
    const total = await db.wishlistItem.count({
      where: { userId }
    })

    // Fetch wishlist items with product and seller info
    const wishlistItems = await db.wishlistItem.findMany({
      where: { userId },
      include: {
        product: {
          include: {
            seller: {
              select: {
                id: true,
                storeName: true,
                storeSlug: true
              }
            },
            category: {
              select: {
                id: true,
                name: true,
                slug: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit
    })

    // Filter out items with null products (deleted products)
    const validItems = wishlistItems.filter(item => item.product && item.product.status === 'LIVE')

    return NextResponse.json({
      items: validItems,
      wishlist: validItems,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    })
  } catch (error) {
    console.error('Wishlist GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Add to wishlist
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, productId } = body

    if (!userId || !productId) {
      return NextResponse.json({ error: 'User ID and Product ID are required' }, { status: 400 })
    }

    // Check if product exists
    const product = await db.product.findUnique({
      where: { id: productId }
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Check if already in wishlist
    const existing = await db.wishlistItem.findUnique({
      where: {
        userId_productId: { userId, productId }
      }
    })

    if (existing) {
      return NextResponse.json({ success: true, message: 'Already in wishlist', exists: true })
    }

    // Add to wishlist
    await db.wishlistItem.create({
      data: { userId, productId }
    })

    // Update product wishlist count
    await db.product.update({
      where: { id: productId },
      data: { wishlistCount: { increment: 1 } }
    })

    return NextResponse.json({ success: true, message: 'Added to wishlist' })
  } catch (error) {
    console.error('Wishlist POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Remove from wishlist
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const productId = searchParams.get('productId')

    if (!userId || !productId) {
      return NextResponse.json({ error: 'User ID and Product ID are required' }, { status: 400 })
    }

    // Check if exists
    const existing = await db.wishlistItem.findUnique({
      where: {
        userId_productId: { userId, productId }
      }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Item not found in wishlist' }, { status: 404 })
    }

    // Remove from wishlist
    await db.wishlistItem.delete({
      where: { id: existing.id }
    })

    // Update product wishlist count
    const product = await db.product.findUnique({
      where: { id: productId },
      select: { wishlistCount: true }
    })

    if (product && product.wishlistCount > 0) {
      await db.product.update({
        where: { id: productId },
        data: { wishlistCount: { decrement: 1 } }
      })
    }

    return NextResponse.json({ success: true, message: 'Removed from wishlist' })
  } catch (error) {
    console.error('Wishlist DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
