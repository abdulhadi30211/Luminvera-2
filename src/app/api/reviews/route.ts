// Reviews API Route - Enhanced with Admin Moderation, Seller Responses, and Statistics
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { UserRole, NotificationType } from '@prisma/client'

// GET - Get reviews for a product, user, seller, or admin moderation
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId')
    const userId = searchParams.get('userId')
    const sellerId = searchParams.get('sellerId')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = parseInt(searchParams.get('offset') || '0')
    const rating = searchParams.get('rating')
    const action = searchParams.get('action')

    // Admin moderation: Get pending reviews
    if (action === 'pending') {
      const adminUserId = searchParams.get('adminUserId')
      if (!adminUserId) {
        return NextResponse.json({ error: 'Admin user ID required' }, { status: 401 })
      }

      // Verify admin role
      const user = await db.user.findUnique({
        where: { id: adminUserId },
        select: { role: true }
      })

      if (!user || (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPER_ADMIN)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }

      const [pendingReviews, totalCount] = await Promise.all([
        db.review.findMany({
          where: { isApproved: false },
          include: {
            product: {
              select: {
                name: true,
                slug: true,
                primaryImageUrl: true,
                sellerId: true,
                seller: {
                  select: { storeName: true }
                }
              }
            },
            user: {
              select: {
                firstName: true,
                lastName: true,
                avatarUrl: true,
                email: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip: offset,
          take: limit
        }),
        db.review.count({ where: { isApproved: false } })
      ])

      return NextResponse.json({
        reviews: pendingReviews.map(r => ({
          ...r,
          user: r.user ? {
            name: `${r.user.firstName || ''} ${r.user.lastName || ''}`.trim() || 'Anonymous',
            avatarUrl: r.user.avatarUrl,
            email: r.user.email
          } : null,
          product: r.product,
          seller: r.product?.seller
        })),
        pagination: {
          total: totalCount,
          limit,
          offset,
          hasMore: offset + limit < totalCount
        }
      })
    }

    // Get review statistics for a product
    if (action === 'stats' && productId) {
      return await getReviewStats(productId)
    }

    // Get reviews for specific product
    if (productId) {
      const whereClause: { productId: string; isApproved: boolean; rating?: number } = {
        productId,
        isApproved: true
      }

      // Filter by rating
      if (rating) {
        whereClause.rating = parseInt(rating)
      }

      const [reviews, totalCount] = await Promise.all([
        db.review.findMany({
          where: whereClause,
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                avatarUrl: true
              }
            }
          },
          orderBy: [
            { helpfulCount: 'desc' },
            { createdAt: 'desc' }
          ],
          skip: offset,
          take: limit
        }),
        db.review.count({ where: whereClause })
      ])

      // Get rating distribution
      const allProductReviews = await db.review.findMany({
        where: { productId, isApproved: true },
        select: { rating: true }
      })

      const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      allProductReviews.forEach(r => {
        distribution[r.rating as keyof typeof distribution]++
      })

      return NextResponse.json({
        reviews: reviews.map(r => ({
          ...r,
          user: r.user ? {
            name: `${r.user.firstName || ''} ${r.user.lastName || ''}`.trim() || 'Anonymous',
            avatarUrl: r.user.avatarUrl
          } : null
        })),
        ratingDistribution: distribution,
        pagination: {
          total: totalCount,
          limit,
          offset,
          hasMore: offset + limit < totalCount
        }
      })
    }

    // Get reviews by user
    if (userId) {
      const reviews = await db.review.findMany({
        where: { userId },
        include: {
          product: {
            select: {
              name: true,
              slug: true,
              primaryImageUrl: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      })

      return NextResponse.json({ reviews })
    }

    // Get reviews for seller's products (with seller response status)
    if (sellerId) {
      const status = searchParams.get('status') // 'pending_response', 'responded', 'all'
      
      // First get products by this seller
      const sellerProducts = await db.product.findMany({
        where: { sellerId },
        select: { id: true }
      })

      const productIds = sellerProducts.map(p => p.id)

      if (productIds.length === 0) {
        return NextResponse.json({ reviews: [] })
      }

      const whereClause: { productId: { in: string[] }; isApproved: boolean; sellerResponse?: null | { not: null } } = {
        productId: { in: productIds },
        isApproved: true
      }

      // Filter by response status
      if (status === 'pending_response') {
        whereClause.sellerResponse = null
      } else if (status === 'responded') {
        whereClause.sellerResponse = { not: null }
      }

      const reviews = await db.review.findMany({
        where: whereClause,
        include: {
          product: {
            select: {
              name: true,
              slug: true,
              primaryImageUrl: true,
              sellerId: true
            }
          },
          user: {
            select: {
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit
      })

      // Get statistics
      const allReviews = await db.review.findMany({
        where: {
          productId: { in: productIds },
          isApproved: true
        },
        select: { rating: true, sellerResponse: true }
      })

      const stats = {
        total: allReviews.length,
        averageRating: allReviews.length > 0
          ? (allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length).toFixed(1)
          : '0',
        pendingResponse: allReviews.filter(r => !r.sellerResponse).length,
        responded: allReviews.filter(r => r.sellerResponse).length,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      }

      allReviews.forEach(r => {
        stats.ratingDistribution[r.rating as keyof typeof stats.ratingDistribution]++
      })

      return NextResponse.json({ reviews, stats })
    }

    return NextResponse.json({ error: 'Missing required parameter' }, { status: 400 })
  } catch (error) {
    console.error('Reviews GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Helper function to get review statistics
async function getReviewStats(productId: string) {
  try {
    // Get all reviews for stats
    const reviews = await db.review.findMany({
      where: { productId, isApproved: true },
      select: { rating: true, helpfulCount: true, isVerifiedPurchase: true, sellerResponse: true }
    })

    const totalReviews = reviews.length
    const averageRating = totalReviews > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
      : 0

    // Rating distribution
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    reviews.forEach(r => {
      distribution[r.rating as keyof typeof distribution]++
    })

    // Calculate percentages
    const percentages: Record<number, number> = {}
    for (let i = 1; i <= 5; i++) {
      percentages[i] = totalReviews > 0 ? Math.round((distribution[i as keyof typeof distribution] / totalReviews) * 100) : 0
    }

    // Other stats
    const verifiedPurchases = reviews.filter(r => r.isVerifiedPurchase).length
    const withSellerResponse = reviews.filter(r => r.sellerResponse).length
    const totalHelpful = reviews.reduce((sum, r) => sum + (r.helpfulCount || 0), 0)

    // Rating by verified purchases
    const verifiedReviews = reviews.filter(r => r.isVerifiedPurchase)
    const verifiedAverage = verifiedReviews.length > 0
      ? verifiedReviews.reduce((sum, r) => sum + r.rating, 0) / verifiedReviews.length
      : 0

    return NextResponse.json({
      stats: {
        totalReviews,
        averageRating: Math.round(averageRating * 10) / 10,
        ratingDistribution: distribution,
        ratingPercentages: percentages,
        verifiedPurchases,
        verifiedPurchasePercent: totalReviews > 0 ? Math.round((verifiedPurchases / totalReviews) * 100) : 0,
        verifiedAverageRating: Math.round(verifiedAverage * 10) / 10,
        withSellerResponse,
        sellerResponsePercent: totalReviews > 0 ? Math.round((withSellerResponse / totalReviews) * 100) : 0,
        totalHelpfulMarks: totalHelpful,
        averageHelpfulPerReview: totalReviews > 0 ? Math.round((totalHelpful / totalReviews) * 10) / 10 : 0,
        recommendationRate: totalReviews > 0 
          ? Math.round(((distribution[4] + distribution[5]) / totalReviews) * 100) 
          : 0
      }
    })
  } catch (error) {
    console.error('Review stats error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create a review
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, productId, orderId, rating, title, comment, images } = body

    if (!userId || !productId || !rating) {
      return NextResponse.json({ error: 'User ID, product ID, and rating are required' }, { status: 400 })
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 })
    }

    // Check if user already reviewed this product
    const existingReview = await db.review.findFirst({
      where: { userId, productId }
    })

    if (existingReview) {
      return NextResponse.json({ error: 'You have already reviewed this product' }, { status: 400 })
    }

    // Verify purchase if orderId provided
    let isVerifiedPurchase = false
    if (orderId) {
      const orderItem = await db.orderItem.findFirst({
        where: { orderId, productId }
      })

      if (orderItem) {
        isVerifiedPurchase = true
      }
    }

    // Create review (requires admin approval by default for reviews under 3 stars)
    const requiresApproval = rating < 3
    const review = await db.review.create({
      data: {
        userId,
        productId,
        orderId,
        rating,
        title,
        comment,
        images: images ? JSON.stringify(images) : null,
        isVerifiedPurchase,
        isApproved: !requiresApproval, // Auto-approve for 3+ stars, require approval for low ratings
        helpfulCount: 0
      }
    })

    // Update product's average rating
    await updateProductRating(productId)

    // Notify seller of new review
    const product = await db.product.findUnique({
      where: { id: productId },
      include: {
        seller: {
          select: { userId: true }
        }
      }
    })

    if (product?.seller?.userId && review.isApproved) {
      // Create notification for seller
      await db.notification.create({
        data: {
          userId: product.seller.userId,
          type: NotificationType.SYSTEM,
          title: 'New Product Review',
          message: `Your product received a ${rating}-star review${title ? `: "${title}"` : ''}`,
          data: JSON.stringify({ reviewId: review.id, productId })
        }
      })
    }

    return NextResponse.json({ 
      success: true, 
      review,
      message: requiresApproval 
        ? 'Your review has been submitted and is pending approval.' 
        : 'Your review has been published.'
    })
  } catch (error) {
    console.error('Reviews POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - Update a review (mark as helpful, seller response, admin moderation)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { reviewId, action, userId, sellerId, sellerResponse, isApproved } = body

    if (!reviewId || !action) {
      return NextResponse.json({ error: 'Review ID and action are required' }, { status: 400 })
    }

    // Mark as helpful
    if (action === 'helpful') {
      // Increment helpful count
      await db.review.update({
        where: { id: reviewId },
        data: { helpfulCount: { increment: 1 } }
      })

      return NextResponse.json({ success: true, message: 'Marked as helpful' })
    }

    // Seller response
    if (action === 'seller_response') {
      if (!sellerId || !sellerResponse) {
        return NextResponse.json({ error: 'Seller ID and response are required' }, { status: 400 })
      }

      // Verify seller owns the product
      const review = await db.review.findUnique({
        where: { id: reviewId },
        include: { product: { select: { sellerId: true } } }
      })

      if (!review || review.product.sellerId !== sellerId) {
        return NextResponse.json({ error: 'Unauthorized - You can only respond to reviews on your products' }, { status: 403 })
      }

      await db.review.update({
        where: { id: reviewId },
        data: {
          sellerResponse,
          sellerRespondedAt: new Date()
        }
      })

      // Notify the reviewer
      const reviewWithUser = await db.review.findUnique({
        where: { id: reviewId },
        include: { product: { select: { name: true } } }
      })

      if (reviewWithUser) {
        await db.notification.create({
          data: {
            userId: reviewWithUser.userId,
            type: NotificationType.SYSTEM,
            title: 'Seller Responded to Your Review',
            message: `The seller has responded to your review for ${reviewWithUser.product?.name}`,
            data: JSON.stringify({ reviewId })
          }
        })
      }

      return NextResponse.json({ success: true, message: 'Response added successfully' })
    }

    // Admin moderation - Approve
    if (action === 'approve') {
      if (!userId) {
        return NextResponse.json({ error: 'User ID required' }, { status: 401 })
      }

      // Verify admin role
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { role: true }
      })

      if (!user || (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPER_ADMIN)) {
        return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 })
      }

      await db.review.update({
        where: { id: reviewId },
        data: { isApproved: true }
      })

      // Update product rating
      const review = await db.review.findUnique({
        where: { id: reviewId },
        select: { productId: true }
      })

      if (review) {
        await updateProductRating(review.productId)
      }

      return NextResponse.json({ success: true, message: 'Review approved' })
    }

    // Admin moderation - Reject
    if (action === 'reject') {
      if (!userId) {
        return NextResponse.json({ error: 'User ID required' }, { status: 401 })
      }

      // Verify admin role
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { role: true }
      })

      if (!user || (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPER_ADMIN)) {
        return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 })
      }

      // Delete the rejected review
      await db.review.delete({
        where: { id: reviewId }
      })

      // Notify the user their review was rejected
      const review = await db.review.findUnique({
        where: { id: reviewId },
        include: { product: { select: { name: true } } }
      })

      if (review) {
        await db.notification.create({
          data: {
            userId: review.userId,
            type: NotificationType.SYSTEM,
            title: 'Review Update',
            message: `Your review for ${review.product?.name} was not approved.`,
            data: JSON.stringify({ reviewId })
          }
        })
      }

      return NextResponse.json({ success: true, message: 'Review rejected' })
    }

    // Update review content (by owner)
    if (action === 'update') {
      const { rating, title, comment, images } = body

      // Verify ownership
      const review = await db.review.findUnique({
        where: { id: reviewId },
        select: { userId: true, productId: true }
      })

      if (!review || review.userId !== userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }

      const updateData: { rating?: number; title?: string; comment?: string; images?: string | null; isApproved?: boolean; updatedAt: Date } = { 
        updatedAt: new Date() 
      }
      
      if (rating !== undefined) {
        updateData.rating = rating
        // If rating drops below 3, require re-approval
        if (rating < 3) {
          updateData.isApproved = false
        }
      }
      if (title !== undefined) updateData.title = title
      if (comment !== undefined) updateData.comment = comment
      if (images !== undefined) updateData.images = images ? JSON.stringify(images) : null

      await db.review.update({
        where: { id: reviewId },
        data: updateData
      })

      // Update product rating
      await updateProductRating(review.productId)

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Reviews PUT error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete a review
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const reviewId = searchParams.get('reviewId')
    const userId = searchParams.get('userId')
    const adminDelete = searchParams.get('adminDelete') === 'true'

    if (!reviewId || !userId) {
      return NextResponse.json({ error: 'Review ID and User ID are required' }, { status: 400 })
    }

    // Verify ownership or admin
    const review = await db.review.findUnique({
      where: { id: reviewId },
      select: { userId: true, productId: true }
    })

    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 })
    }

    // Check permissions
    if (!adminDelete && review.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    if (adminDelete) {
      // Verify admin role
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { role: true }
      })

      if (!user || (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPER_ADMIN)) {
        return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 })
      }
    }

    await db.review.delete({
      where: { id: reviewId }
    })

    // Update product's average rating
    await updateProductRating(review.productId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Reviews DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Helper function to update product rating
async function updateProductRating(productId: string) {
  const reviews = await db.review.findMany({
    where: { productId, isApproved: true },
    select: { rating: true }
  })

  if (reviews.length > 0) {
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    await db.product.update({
      where: { id: productId },
      data: {
        averageRating: Math.round(avgRating * 10) / 10,
        totalReviews: reviews.length
      }
    })
  } else {
    // No reviews - reset to 0
    await db.product.update({
      where: { id: productId },
      data: {
        averageRating: 0,
        totalReviews: 0
      }
    })
  }
}
