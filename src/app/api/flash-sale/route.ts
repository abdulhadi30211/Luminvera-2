// Flash Sale API Route - Complete CRUD with real-time countdown support
// Using Prisma ORM
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
      expiresAt: {
        gt: new Date(),
      },
    },
    include: {
      user: {
        select: {
          id: true,
          role: true,
        },
      },
    },
  })

  return session?.user
}

function isAdmin(user: { role: string } | null): boolean {
  return user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN'
}

// Calculate countdown time
function calculateCountdown(endTime: Date): {
  days: number
  hours: number
  minutes: number
  seconds: number
  totalSeconds: number
  isExpired: boolean
} {
  const now = Date.now()
  const end = new Date(endTime).getTime()
  const diff = Math.max(0, end - now)

  const totalSeconds = Math.floor(diff / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  return {
    days,
    hours,
    minutes,
    seconds,
    totalSeconds,
    isExpired: diff <= 0,
  }
}

// GET - Fetch flash sales
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const active = searchParams.get('active') === 'true'
    const upcoming = searchParams.get('upcoming') === 'true'
    const id = searchParams.get('id')
    const includeCountdown = searchParams.get('includeCountdown') === 'true'
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    const now = new Date()

    // Get specific flash sale by ID
    if (id) {
      const flashSale = await db.flashSale.findUnique({
        where: { id },
        include: {
          items: true,
        },
      })

      if (!flashSale) {
        return NextResponse.json({ error: 'Flash sale not found' }, { status: 404 })
      }

      // Calculate status
      const isActive = flashSale.startTime <= now && flashSale.endTime >= now && flashSale.isActive
      const isUpcoming = flashSale.startTime > now
      const isEnded = flashSale.endTime < now

      // Add countdown if requested
      const countdown = includeCountdown ? calculateCountdown(flashSale.endTime) : null

      return NextResponse.json({
        flashSale: {
          ...flashSale,
          countdown,
          isActive,
          isUpcoming,
          isEnded,
        },
      })
    }

    // Get active flash sales
    if (active) {
      const flashSales = await db.flashSale.findMany({
        where: {
          isActive: true,
          startTime: { lte: now },
          endTime: { gte: now },
        },
        orderBy: {
          endTime: 'asc',
        },
        skip: offset,
        take: limit,
        include: {
          items: true,
        },
      })

      // Add countdown and status to each flash sale
      const enrichedFlashSales = flashSales.map((fs) => ({
        ...fs,
        countdown: includeCountdown ? calculateCountdown(fs.endTime) : null,
        isActive: true,
        isUpcoming: false,
        isEnded: false,
      }))

      return NextResponse.json({
        flashSales: enrichedFlashSales,
        pagination: {
          total: flashSales.length,
          limit,
          offset,
          hasMore: false,
        },
      })
    }

    // Get upcoming flash sales
    if (upcoming) {
      const flashSales = await db.flashSale.findMany({
        where: {
          isActive: true,
          startTime: { gt: now },
        },
        orderBy: {
          startTime: 'asc',
        },
        skip: offset,
        take: limit,
        include: {
          items: true,
        },
      })

      // Add countdown to start
      const enrichedFlashSales = flashSales.map((fs) => ({
        ...fs,
        countdownToStart: includeCountdown ? calculateCountdown(fs.startTime) : null,
        isActive: false,
        isUpcoming: true,
        isEnded: false,
      }))

      return NextResponse.json({
        flashSales: enrichedFlashSales,
        pagination: {
          total: enrichedFlashSales.length,
          limit,
          offset,
          hasMore: false,
        },
      })
    }

    // Get all flash sales (for admin or general listing)
    const user = await getUserFromToken(request)
    const admin = searchParams.get('admin') === 'true'

    const whereClause = !isAdmin(user) || !admin ? { isActive: true } : {}

    const [flashSales, totalCount] = await Promise.all([
      db.flashSale.findMany({
        where: whereClause,
        orderBy: {
          createdAt: 'desc',
        },
        skip: offset,
        take: limit,
        include: {
          items: true,
        },
      }),
      db.flashSale.count({ where: whereClause }),
    ])

    // Add status to each flash sale
    const enrichedFlashSales = flashSales.map((fs) => ({
      ...fs,
      countdown: includeCountdown && fs.endTime > now ? calculateCountdown(fs.endTime) : null,
      isActive: fs.startTime <= now && fs.endTime >= now && fs.isActive,
      isUpcoming: fs.startTime > now,
      isEnded: fs.endTime < now,
    }))

    return NextResponse.json({
      flashSales: enrichedFlashSales,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount,
      },
    })
  } catch (error) {
    console.error('Flash Sale GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create flash sale (admin only)
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request)

    if (!isAdmin(user)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { title, name, description, discount_percentage, discountPercentage, start_time, startTime, end_time, endTime, is_active, isActive } = body

    // Support both naming conventions
    const flashSaleName = title || name
    const flashSaleStartTime = start_time || startTime
    const flashSaleEndTime = end_time || endTime
    const flashSaleDiscountPercentage = discount_percentage ?? discountPercentage
    const flashSaleIsActive = is_active ?? isActive

    // Validation
    if (!flashSaleName || !flashSaleStartTime || !flashSaleEndTime) {
      return NextResponse.json(
        { error: 'Title/name, start_time, and end_time are required' },
        { status: 400 }
      )
    }

    // Validate discount percentage if provided
    if (flashSaleDiscountPercentage !== undefined) {
      if (flashSaleDiscountPercentage < 1 || flashSaleDiscountPercentage > 99) {
        return NextResponse.json(
          { error: 'Discount percentage must be between 1 and 99' },
          { status: 400 }
        )
      }
    }

    // Validate dates
    const startDate = new Date(flashSaleStartTime)
    const endDate = new Date(flashSaleEndTime)

    if (startDate >= endDate) {
      return NextResponse.json({ error: 'end_time must be after start_time' }, { status: 400 })
    }

    const flashSale = await db.flashSale.create({
      data: {
        name: flashSaleName,
        description: description || null,
        discountPercentage: flashSaleDiscountPercentage ? parseFloat(flashSaleDiscountPercentage) : null,
        startTime: startDate,
        endTime: endDate,
        isActive: flashSaleIsActive ?? true,
      },
    })

    return NextResponse.json({
      success: true,
      flashSale,
      message: 'Flash sale created successfully',
    })
  } catch (error) {
    console.error('Flash Sale POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - Update flash sale
export async function PUT(request: NextRequest) {
  try {
    const user = await getUserFromToken(request)

    if (!isAdmin(user)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { 
      id, 
      title, 
      name, 
      description, 
      discount_percentage, 
      discountPercentage,
      start_time,
      startTime,
      end_time,
      endTime,
      is_active,
      isActive 
    } = body

    if (!id) {
      return NextResponse.json({ error: 'Flash sale ID is required' }, { status: 400 })
    }

    // Check if flash sale exists
    const existingFlashSale = await db.flashSale.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!existingFlashSale) {
      return NextResponse.json({ error: 'Flash sale not found' }, { status: 404 })
    }

    // Support both naming conventions
    const flashSaleName = title || name
    const flashSaleStartTime = start_time || startTime
    const flashSaleEndTime = end_time || endTime
    const flashSaleDiscountPercentage = discount_percentage ?? discountPercentage
    const flashSaleIsActive = is_active ?? isActive

    // Validate discount percentage if provided
    if (flashSaleDiscountPercentage !== undefined) {
      if (flashSaleDiscountPercentage < 1 || flashSaleDiscountPercentage > 99) {
        return NextResponse.json(
          { error: 'Discount percentage must be between 1 and 99' },
          { status: 400 }
        )
      }
    }

    // Build updates object
    const updates: Record<string, unknown> = {}

    if (flashSaleName !== undefined) updates.name = flashSaleName
    if (description !== undefined) updates.description = description
    if (flashSaleDiscountPercentage !== undefined) updates.discountPercentage = flashSaleDiscountPercentage ? parseFloat(flashSaleDiscountPercentage) : null
    if (flashSaleStartTime !== undefined) updates.startTime = new Date(flashSaleStartTime)
    if (flashSaleEndTime !== undefined) updates.endTime = new Date(flashSaleEndTime)
    if (flashSaleIsActive !== undefined) updates.isActive = flashSaleIsActive

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    // Validate dates if both provided
    const newStartTime = flashSaleStartTime ? new Date(flashSaleStartTime) : undefined
    const newEndTime = flashSaleEndTime ? new Date(flashSaleEndTime) : undefined

    if (newStartTime && newEndTime && newStartTime >= newEndTime) {
      return NextResponse.json({ error: 'end_time must be after start_time' }, { status: 400 })
    }

    const flashSale = await db.flashSale.update({
      where: { id },
      data: updates,
    })

    return NextResponse.json({
      success: true,
      flashSale,
      message: 'Flash sale updated successfully',
    })
  } catch (error) {
    console.error('Flash Sale PUT error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete flash sale
export async function DELETE(request: NextRequest) {
  try {
    const user = await getUserFromToken(request)

    if (!isAdmin(user)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Flash sale ID is required' }, { status: 400 })
    }

    // Check if flash sale exists
    const existingFlashSale = await db.flashSale.findUnique({
      where: { id },
      select: { id: true, name: true },
    })

    if (!existingFlashSale) {
      return NextResponse.json({ error: 'Flash sale not found' }, { status: 404 })
    }

    await db.flashSale.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: `Flash sale "${existingFlashSale.name}" deleted successfully`,
    })
  } catch (error) {
    console.error('Flash Sale DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
