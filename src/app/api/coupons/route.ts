// Coupons API Route - Complete CRUD with validation and discount calculation
// Coupon Types: PERCENTAGE, FIXED, FREE_SHIPPING, BUY_X_GET_Y
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { CouponType } from '@prisma/client'

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

  return session?.user
}

function isAdmin(user: { role: string } | null): boolean {
  return user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN'
}

interface CouponValidation {
  isValid: boolean
  error?: string
  discountAmount?: number
  coupon?: Record<string, unknown>
}

// Parse JSON field safely
function parseJsonField(field: string | null): string[] {
  if (!field) return []
  try {
    return typeof field === 'string' ? JSON.parse(field) : field
  } catch {
    return []
  }
}

// Validate and calculate coupon discount
async function validateCoupon(
  code: string,
  orderValue: number,
  userId?: string,
  productIds?: string[],
  categoryIds?: string[]
): Promise<CouponValidation> {
  const now = new Date()

  const coupon = await db.coupon.findFirst({
    where: {
      code: code.toUpperCase(),
      isActive: true,
      validFrom: { lte: now },
      validUntil: { gte: now },
    },
  })

  if (!coupon) {
    return { isValid: false, error: 'Invalid or expired coupon code' }
  }

  // Check usage limits
  if (coupon.maxUses && coupon.currentUses >= coupon.maxUses) {
    return { isValid: false, error: 'Coupon has reached maximum uses' }
  }

  // Check per-user limit - Note: Requires CouponUsage model
  // Currently skipped as CouponUsage model is not in schema
  // TODO: Implement when CouponUsage model is added

  // Check minimum order value
  if (coupon.minOrderValue && orderValue < coupon.minOrderValue) {
    return {
      isValid: false,
      error: `Minimum order value of PKR ${coupon.minOrderValue.toLocaleString()} required`,
    }
  }

  // Check first-time user only
  if (coupon.firstTimeUserOnly && userId) {
    const orderCount = await db.order.count({
      where: { userId },
    })

    if (orderCount > 0) {
      return { isValid: false, error: 'This coupon is for first-time users only' }
    }
  }

  // Check applicable categories
  const applicableCategories = parseJsonField(coupon.applicableCategories)
  if (applicableCategories.length > 0 && categoryIds?.length) {
    const hasMatchingCategory = categoryIds.some((id) => applicableCategories.includes(id))
    if (!hasMatchingCategory) {
      return { isValid: false, error: 'Coupon not applicable to products in your cart' }
    }
  }

  // Check applicable products
  const applicableProducts = parseJsonField(coupon.applicableProducts)
  if (applicableProducts.length > 0 && productIds?.length) {
    const hasMatchingProduct = productIds.some((id) => applicableProducts.includes(id))
    if (!hasMatchingProduct) {
      return { isValid: false, error: 'Coupon not applicable to products in your cart' }
    }
  }

  // Calculate discount based on type
  let discountAmount = 0

  switch (coupon.type) {
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
      // Return a special flag for free shipping - handled in checkout
      discountAmount = 0
      break

    case 'BUY_X_GET_Y':
      // Buy X Get Y logic would be handled in checkout
      discountAmount = 0
      break
  }

  // Parse JSON fields for response
  const parsedCoupon = {
    ...coupon,
    applicableCategories: parseJsonField(coupon.applicableCategories),
    applicableProducts: parseJsonField(coupon.applicableProducts),
    applicableSellers: parseJsonField(coupon.applicableSellers),
    applicableUsers: parseJsonField(coupon.applicableUsers),
  }

  return {
    isValid: true,
    discountAmount,
    coupon: parsedCoupon,
  }
}

// GET - Get coupons or validate a coupon code
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken(request)
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const id = searchParams.get('id')
    const validate = searchParams.get('validate') === 'true'
    const isActive = searchParams.get('isActive')
    const orderValue = parseFloat(searchParams.get('orderValue') || '0')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Validate a coupon code
    if (code && validate) {
      const userId = user?.id
      const productIds = searchParams.get('productIds')?.split(',').filter(Boolean)
      const categoryIds = searchParams.get('categoryIds')?.split(',').filter(Boolean)

      const validation = await validateCoupon(code, orderValue, userId, productIds, categoryIds)

      if (!validation.isValid) {
        return NextResponse.json(
          {
            valid: false,
            error: validation.error,
          },
          { status: 400 }
        )
      }

      return NextResponse.json({
        valid: true,
        coupon: validation.coupon,
        discountAmount: validation.discountAmount,
        message:
          (validation.coupon?.type as string) === 'FREE_SHIPPING'
            ? 'Free shipping applied!'
            : `You save PKR ${validation.discountAmount?.toLocaleString()}`,
      })
    }

    // Get specific coupon by code
    if (code) {
      const now = new Date()

      const coupon = await db.coupon.findFirst({
        where: {
          code: code.toUpperCase(),
          isActive: true,
          validFrom: { lte: now },
          validUntil: { gte: now },
        },
      })

      if (!coupon) {
        return NextResponse.json({ error: 'Invalid or expired coupon code' }, { status: 404 })
      }

      // Check usage limits
      if (coupon.maxUses && coupon.currentUses >= coupon.maxUses) {
        return NextResponse.json({ error: 'Coupon has reached maximum uses' }, { status: 400 })
      }

      return NextResponse.json({
        coupon: {
          ...coupon,
          applicableCategories: parseJsonField(coupon.applicableCategories),
          applicableProducts: parseJsonField(coupon.applicableProducts),
          applicableSellers: parseJsonField(coupon.applicableSellers),
          applicableUsers: parseJsonField(coupon.applicableUsers),
        },
      })
    }

    // Get specific coupon by ID (admin only)
    if (id) {
      if (!isAdmin(user)) {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
      }

      const coupon = await db.coupon.findUnique({
        where: { id },
      })

      if (!coupon) {
        return NextResponse.json({ error: 'Coupon not found' }, { status: 404 })
      }

      return NextResponse.json({
        coupon: {
          ...coupon,
          applicableCategories: parseJsonField(coupon.applicableCategories),
          applicableProducts: parseJsonField(coupon.applicableProducts),
          applicableSellers: parseJsonField(coupon.applicableSellers),
          applicableUsers: parseJsonField(coupon.applicableUsers),
        },
      })
    }

    // List all coupons (admin only)
    if (!isAdmin(user)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const where: { isActive?: boolean } = {}
    if (isActive === 'true') {
      where.isActive = true
    } else if (isActive === 'false') {
      where.isActive = false
    }

    const [coupons, count] = await Promise.all([
      db.coupon.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      db.coupon.count({ where }),
    ])

    // Parse JSON fields for each coupon
    const parsedCoupons = coupons.map((c) => ({
      ...c,
      applicableCategories: parseJsonField(c.applicableCategories),
      applicableProducts: parseJsonField(c.applicableProducts),
      applicableSellers: parseJsonField(c.applicableSellers),
      applicableUsers: parseJsonField(c.applicableUsers),
    }))

    return NextResponse.json({
      coupons: parsedCoupons,
      pagination: {
        total: count,
        limit,
        offset,
        hasMore: offset + limit < count,
      },
    })
  } catch (error) {
    console.error('Coupons GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create coupon (admin only)
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request)

    if (!isAdmin(user)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const {
      code,
      name,
      type,
      discountValue,
      maxDiscountAmount,
      minOrderValue,
      maxUses,
      maxUsesPerUser,
      applicableCategories,
      applicableProducts,
      applicableSellers,
      applicableUsers,
      firstTimeUserOnly,
      validFrom,
      validUntil,
    } = body

    // Validation
    if (!code || !name || !type || !validFrom || !validUntil) {
      return NextResponse.json(
        { error: 'Code, name, type, validFrom, and validUntil are required' },
        { status: 400 }
      )
    }

    // Type-specific validation
    if ((type === 'PERCENTAGE' || type === 'FIXED') && discountValue === undefined) {
      return NextResponse.json(
        { error: 'Discount value is required for PERCENTAGE and FIXED type coupons' },
        { status: 400 }
      )
    }

    if (type === 'PERCENTAGE' && discountValue > 100) {
      return NextResponse.json({ error: 'Percentage discount cannot exceed 100%' }, { status: 400 })
    }

    // Validate dates
    const startDate = new Date(validFrom)
    const endDate = new Date(validUntil)

    if (startDate >= endDate) {
      return NextResponse.json({ error: 'validUntil must be after validFrom' }, { status: 400 })
    }

    // Check if code already exists
    const existing = await db.coupon.findUnique({
      where: { code: code.toUpperCase() },
    })

    if (existing) {
      return NextResponse.json({ error: 'Coupon code already exists' }, { status: 400 })
    }

    const coupon = await db.coupon.create({
      data: {
        code: code.toUpperCase(),
        name,
        type: type as CouponType,
        discountValue: discountValue || 0,
        maxDiscountAmount: maxDiscountAmount || null,
        minOrderValue: minOrderValue || null,
        maxUses: maxUses || null,
        maxUsesPerUser: maxUsesPerUser || null,
        applicableCategories: applicableCategories ? JSON.stringify(applicableCategories) : null,
        applicableProducts: applicableProducts ? JSON.stringify(applicableProducts) : null,
        applicableSellers: applicableSellers ? JSON.stringify(applicableSellers) : null,
        applicableUsers: applicableUsers ? JSON.stringify(applicableUsers) : null,
        firstTimeUserOnly: firstTimeUserOnly || false,
        validFrom: new Date(validFrom),
        validUntil: new Date(validUntil),
        isActive: true,
        currentUses: 0,
      },
    })

    return NextResponse.json({
      success: true,
      coupon: {
        ...coupon,
        applicableCategories,
        applicableProducts,
        applicableSellers,
        applicableUsers,
      },
    })
  } catch (error) {
    console.error('Coupons POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - Update coupon
export async function PUT(request: NextRequest) {
  try {
    const user = await getUserFromToken(request)
    const body = await request.json()
    const {
      id,
      action,
      // Full update fields
      name,
      type,
      discountValue,
      maxDiscountAmount,
      minOrderValue,
      maxUses,
      maxUsesPerUser,
      applicableCategories,
      applicableProducts,
      applicableSellers,
      applicableUsers,
      firstTimeUserOnly,
      validFrom,
      validUntil,
      isActive,
    } = body

    if (!id) {
      return NextResponse.json({ error: 'Coupon ID is required' }, { status: 400 })
    }

    // Increment usage (public endpoint for checkout)
    if (action === 'increment_usage') {
      const coupon = await db.coupon.findUnique({
        where: { id },
        select: { currentUses: true },
      })

      if (coupon) {
        await db.coupon.update({
          where: { id },
          data: { currentUses: coupon.currentUses + 1 },
        })
      }

      return NextResponse.json({ success: true })
    }

    // All other updates require admin access
    if (!isAdmin(user)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Toggle active status
    if (action === 'toggle_active') {
      await db.coupon.update({
        where: { id },
        data: { isActive: isActive ?? false },
      })

      return NextResponse.json({ success: true })
    }

    // Full update
    const updateData: Record<string, unknown> = {}

    if (name !== undefined) updateData.name = name
    if (type !== undefined) updateData.type = type
    if (discountValue !== undefined) updateData.discountValue = discountValue
    if (maxDiscountAmount !== undefined) updateData.maxDiscountAmount = maxDiscountAmount
    if (minOrderValue !== undefined) updateData.minOrderValue = minOrderValue
    if (maxUses !== undefined) updateData.maxUses = maxUses
    if (maxUsesPerUser !== undefined) updateData.maxUsesPerUser = maxUsesPerUser
    if (applicableCategories !== undefined)
      updateData.applicableCategories = JSON.stringify(applicableCategories)
    if (applicableProducts !== undefined)
      updateData.applicableProducts = JSON.stringify(applicableProducts)
    if (applicableSellers !== undefined)
      updateData.applicableSellers = JSON.stringify(applicableSellers)
    if (applicableUsers !== undefined)
      updateData.applicableUsers = JSON.stringify(applicableUsers)
    if (firstTimeUserOnly !== undefined) updateData.firstTimeUserOnly = firstTimeUserOnly
    if (validFrom !== undefined) updateData.validFrom = new Date(validFrom)
    if (validUntil !== undefined) updateData.validUntil = new Date(validUntil)
    if (isActive !== undefined) updateData.isActive = isActive

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    // Validate dates if provided
    const newValidFrom = validFrom ? new Date(validFrom) : undefined
    const newValidUntil = validUntil ? new Date(validUntil) : undefined

    if (newValidFrom && newValidUntil && newValidFrom >= newValidUntil) {
      return NextResponse.json({ error: 'validUntil must be after validFrom' }, { status: 400 })
    }

    // Type-specific validation
    if (type === 'PERCENTAGE' && discountValue && discountValue > 100) {
      return NextResponse.json({ error: 'Percentage discount cannot exceed 100%' }, { status: 400 })
    }

    await db.coupon.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Coupons PUT error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete coupon (admin only)
export async function DELETE(request: NextRequest) {
  try {
    const user = await getUserFromToken(request)

    if (!isAdmin(user)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Coupon ID is required' }, { status: 400 })
    }

    // Check if coupon exists
    const existingCoupon = await db.coupon.findUnique({
      where: { id },
      select: { id: true, code: true },
    })

    if (!existingCoupon) {
      return NextResponse.json({ error: 'Coupon not found' }, { status: 404 })
    }

    await db.coupon.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: `Coupon "${existingCoupon.code}" deleted successfully`,
    })
  } catch (error) {
    console.error('Coupons DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
