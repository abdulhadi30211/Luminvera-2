// Coupon Validation Endpoint - Dedicated route for validating coupon codes
// Returns discount amount and coupon details if valid
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Helper to hash token using SHA-256
async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(token)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// Helper to get user from session token
async function getUserFromToken(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value
  if (!token) return null

  const tokenHash = await hashToken(token)

  const session = await db.session.findFirst({
    where: {
      tokenHash,
      isActive: true,
      expiresAt: { gt: new Date() },
    },
    include: {
      user: {
        select: { id: true, role: true },
      },
    },
  })

  return session?.user ?? null
}

// Coupon Types
type CouponType = 'PERCENTAGE' | 'FIXED' | 'FREE_SHIPPING'

interface ValidationResult {
  valid: boolean
  error?: string
  discountAmount?: number
  coupon?: Record<string, unknown>
  message?: string
}

// POST - Validate coupon code with order details
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request)
    const body = await request.json()
    const { code, orderValue, productIds, categoryIds } = body

    // Validation
    if (!code) {
      return NextResponse.json({ valid: false, error: 'Coupon code is required' }, { status: 400 })
    }

    if (orderValue === undefined || orderValue < 0) {
      return NextResponse.json(
        { valid: false, error: 'Valid order value is required' },
        { status: 400 }
      )
    }

    const now = new Date()
    const userId = user?.id

    // Find the coupon
    const coupon = await db.coupon.findFirst({
      where: {
        code: code.toUpperCase(),
        isActive: true,
        validFrom: { lte: now },
        validUntil: { gte: now },
      },
    })

    if (!coupon) {
      return NextResponse.json({
        valid: false,
        error: 'Invalid or expired coupon code',
      })
    }

    // Check usage limits
    if (coupon.maxUses && coupon.currentUses >= coupon.maxUses) {
      return NextResponse.json({
        valid: false,
        error: 'Coupon has reached maximum uses',
      })
    }

    // Check per-user limit
    // Note: Since there's no CouponUsage model, we track via orders with couponDiscount > 0
    if (userId && coupon.maxUsesPerUser) {
      const userCouponOrders = await db.order.count({
        where: {
          userId,
          couponDiscount: { gt: 0 },
        },
      })

      if (userCouponOrders >= coupon.maxUsesPerUser) {
        return NextResponse.json({
          valid: false,
          error: 'You have reached the maximum uses for this coupon',
        })
      }
    }

    // Check minimum order value
    if (coupon.minOrderValue && orderValue < coupon.minOrderValue) {
      return NextResponse.json({
        valid: false,
        error: `Minimum order value of PKR ${coupon.minOrderValue.toLocaleString()} required`,
      })
    }

    // Check first-time user only
    if (coupon.firstTimeUserOnly && userId) {
      const orderCount = await db.order.count({
        where: { userId },
      })

      if (orderCount > 0) {
        return NextResponse.json({
          valid: false,
          error: 'This coupon is for first-time users only',
        })
      }
    }

    // Check applicable categories
    if (coupon.applicableCategories && categoryIds?.length) {
      const allowedCategories: string[] =
        typeof coupon.applicableCategories === 'string'
          ? JSON.parse(coupon.applicableCategories)
          : coupon.applicableCategories
      const hasMatchingCategory = categoryIds.some((id: string) => allowedCategories.includes(id))
      if (!hasMatchingCategory) {
        return NextResponse.json({
          valid: false,
          error: 'Coupon not applicable to products in your cart',
        })
      }
    }

    // Check applicable products
    if (coupon.applicableProducts && productIds?.length) {
      const allowedProducts: string[] =
        typeof coupon.applicableProducts === 'string'
          ? JSON.parse(coupon.applicableProducts)
          : coupon.applicableProducts
      const hasMatchingProduct = productIds.some((id: string) => allowedProducts.includes(id))
      if (!hasMatchingProduct) {
        return NextResponse.json({
          valid: false,
          error: 'Coupon not applicable to products in your cart',
        })
      }
    }

    // Calculate discount based on type
    let discountAmount = 0

    switch (coupon.type as CouponType) {
      case 'PERCENTAGE':
        discountAmount = (orderValue * coupon.discountValue) / 100
        // Apply max discount cap if set
        if (coupon.maxDiscountAmount && discountAmount > coupon.maxDiscountAmount) {
          discountAmount = coupon.maxDiscountAmount
        }
        break

      case 'FIXED':
        discountAmount = Math.min(coupon.discountValue, orderValue)
        break

      case 'FREE_SHIPPING':
        // Free shipping discount is handled during checkout
        discountAmount = 0
        break
    }

    // Parse JSON fields for response
    const parsedCoupon = {
      id: coupon.id,
      code: coupon.code,
      name: coupon.name,
      type: coupon.type,
      discount_value: coupon.discountValue,
      max_discount_amount: coupon.maxDiscountAmount,
      min_order_value: coupon.minOrderValue,
      applicable_categories:
        typeof coupon.applicableCategories === 'string'
          ? JSON.parse(coupon.applicableCategories)
          : coupon.applicableCategories,
      applicable_products:
        typeof coupon.applicableProducts === 'string'
          ? JSON.parse(coupon.applicableProducts)
          : coupon.applicableProducts,
      first_time_user_only: coupon.firstTimeUserOnly,
      valid_from: coupon.validFrom,
      valid_until: coupon.validUntil,
    }

    // Generate success message
    let message: string
    if (coupon.type === 'FREE_SHIPPING') {
      message = 'Free shipping applied!'
    } else if (coupon.type === 'PERCENTAGE') {
      message = `${coupon.discountValue}% off! You save PKR ${discountAmount.toLocaleString()}`
    } else {
      message = `You save PKR ${discountAmount.toLocaleString()}`
    }

    const result: ValidationResult = {
      valid: true,
      discountAmount,
      coupon: parsedCoupon,
      message,
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Coupon validation error:', error)
    return NextResponse.json({ valid: false, error: 'Internal server error' }, { status: 500 })
  }
}

// GET - Quick validation via query params (for simple checks)
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken(request)
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const orderValue = parseFloat(searchParams.get('orderValue') || '0')
    const productIds = searchParams.get('productIds')?.split(',').filter(Boolean)
    const categoryIds = searchParams.get('categoryIds')?.split(',').filter(Boolean)

    if (!code) {
      return NextResponse.json({ valid: false, error: 'Coupon code is required' }, { status: 400 })
    }

    const now = new Date()
    const userId = user?.id

    // Find the coupon
    const coupon = await db.coupon.findFirst({
      where: {
        code: code.toUpperCase(),
        isActive: true,
        validFrom: { lte: now },
        validUntil: { gte: now },
      },
    })

    if (!coupon) {
      return NextResponse.json({
        valid: false,
        error: 'Invalid or expired coupon code',
      })
    }

    // Check usage limits
    if (coupon.maxUses && coupon.currentUses >= coupon.maxUses) {
      return NextResponse.json({
        valid: false,
        error: 'Coupon has reached maximum uses',
      })
    }

    // Check per-user limit
    if (userId && coupon.maxUsesPerUser) {
      const userCouponOrders = await db.order.count({
        where: {
          userId,
          couponDiscount: { gt: 0 },
        },
      })

      if (userCouponOrders >= coupon.maxUsesPerUser) {
        return NextResponse.json({
          valid: false,
          error: 'You have reached the maximum uses for this coupon',
        })
      }
    }

    // Check minimum order value
    if (coupon.minOrderValue && orderValue < coupon.minOrderValue) {
      return NextResponse.json({
        valid: false,
        error: `Minimum order value of PKR ${coupon.minOrderValue.toLocaleString()} required`,
      })
    }

    // Check first-time user only
    if (coupon.firstTimeUserOnly && userId) {
      const orderCount = await db.order.count({
        where: { userId },
      })

      if (orderCount > 0) {
        return NextResponse.json({
          valid: false,
          error: 'This coupon is for first-time users only',
        })
      }
    }

    // Check applicable categories
    if (coupon.applicableCategories && categoryIds?.length) {
      const allowedCategories: string[] =
        typeof coupon.applicableCategories === 'string'
          ? JSON.parse(coupon.applicableCategories)
          : coupon.applicableCategories
      const hasMatchingCategory = categoryIds.some((id) => allowedCategories.includes(id))
      if (!hasMatchingCategory) {
        return NextResponse.json({
          valid: false,
          error: 'Coupon not applicable to products in your cart',
        })
      }
    }

    // Check applicable products
    if (coupon.applicableProducts && productIds?.length) {
      const allowedProducts: string[] =
        typeof coupon.applicableProducts === 'string'
          ? JSON.parse(coupon.applicableProducts)
          : coupon.applicableProducts
      const hasMatchingProduct = productIds.some((id) => allowedProducts.includes(id))
      if (!hasMatchingProduct) {
        return NextResponse.json({
          valid: false,
          error: 'Coupon not applicable to products in your cart',
        })
      }
    }

    // Calculate discount based on type
    let discountAmount = 0

    switch (coupon.type as CouponType) {
      case 'PERCENTAGE':
        discountAmount = (orderValue * coupon.discountValue) / 100
        if (coupon.maxDiscountAmount && discountAmount > coupon.maxDiscountAmount) {
          discountAmount = coupon.maxDiscountAmount
        }
        break

      case 'FIXED':
        discountAmount = Math.min(coupon.discountValue, orderValue)
        break

      case 'FREE_SHIPPING':
        discountAmount = 0
        break
    }

    // Generate success message
    let message: string
    if (coupon.type === 'FREE_SHIPPING') {
      message = 'Free shipping applied!'
    } else if (coupon.type === 'PERCENTAGE') {
      message = `${coupon.discountValue}% off! You save PKR ${discountAmount.toLocaleString()}`
    } else {
      message = `You save PKR ${discountAmount.toLocaleString()}`
    }

    return NextResponse.json({
      valid: true,
      discountAmount,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        name: coupon.name,
        type: coupon.type,
        discount_value: coupon.discountValue,
        max_discount_amount: coupon.maxDiscountAmount,
        min_order_value: coupon.minOrderValue,
        first_time_user_only: coupon.firstTimeUserOnly,
      },
      message,
    })
  } catch (error) {
    console.error('Coupon validation error:', error)
    return NextResponse.json({ valid: false, error: 'Internal server error' }, { status: 500 })
  }
}
