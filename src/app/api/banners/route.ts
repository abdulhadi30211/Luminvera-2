// Banners API Route - Complete CRUD for homepage banners/sliders
// Supports positions: hero, promotional, category, sidebar
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Valid banner positions
const VALID_POSITIONS = ['hero', 'promotional', 'category', 'sidebar'] as const
type BannerPosition = typeof VALID_POSITIONS[number]

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

  return session?.user ?? null
}

function isAdmin(user: { role: string } | null): boolean {
  return user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN'
}

// GET - Fetch all banners or filter by position
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const position = searchParams.get('position') as BannerPosition | null
    const bannerId = searchParams.get('bannerId')
    const activeOnly = searchParams.get('active') === 'true'
    const admin = searchParams.get('admin') === 'true'
    const user = await getUserFromToken(request)

    // Get specific banner by ID
    if (bannerId) {
      const banner = await db.banner.findUnique({
        where: { id: bannerId },
      })

      if (!banner) {
        return NextResponse.json({ error: 'Banner not found' }, { status: 404 })
      }

      return NextResponse.json({ banner, success: true })
    }

    // Validate position if provided
    if (position && !VALID_POSITIONS.includes(position)) {
      return NextResponse.json(
        { error: `Invalid position. Valid positions are: ${VALID_POSITIONS.join(', ')}` },
        { status: 400 }
      )
    }

    // Build where clause
    const where: {
      position?: string
      isActive?: boolean
    } = {}

    // Filter by position if specified
    if (position) {
      where.position = position
    }

    // For non-admin requests, only show active banners
    if (!isAdmin(user) || !admin) {
      where.isActive = true
    } else if (activeOnly) {
      where.isActive = true
    }

    const banners = await db.banner.findMany({
      where,
      orderBy: {
        sortOrder: 'asc',
      },
    })

    // Group banners by position for easier frontend consumption
    const groupedBanners = banners.reduce(
      (acc: Record<string, typeof banners>, banner) => {
        const pos = banner.position || 'hero'
        if (!acc[pos]) acc[pos] = []
        acc[pos].push(banner)
        return acc
      },
      {}
    )

    return NextResponse.json({
      banners,
      groupedBanners,
      success: true,
      count: banners.length,
    })
  } catch (error) {
    console.error('Banners GET error:', error)
    return NextResponse.json({ banners: [], success: true })
  }
}

// POST - Create new banner (admin only)
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request)

    if (!isAdmin(user)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { title, subtitle, image_url, link_url, position, is_active, sort_order } = body

    // Validation
    if (!title || !image_url) {
      return NextResponse.json({ error: 'Title and image_url are required' }, { status: 400 })
    }

    // Validate position
    const bannerPosition = position || 'hero'
    if (!VALID_POSITIONS.includes(bannerPosition)) {
      return NextResponse.json(
        { error: `Invalid position. Valid positions are: ${VALID_POSITIONS.join(', ')}` },
        { status: 400 }
      )
    }

    // Get max sort order for the position if not provided
    let sortOrder = sort_order
    if (sortOrder === undefined) {
      const existingBanners = await db.banner.findMany({
        where: { position: bannerPosition },
        orderBy: { sortOrder: 'desc' },
        take: 1,
        select: { sortOrder: true },
      })

      sortOrder = (existingBanners[0]?.sortOrder || 0) + 1
    }

    const banner = await db.banner.create({
      data: {
        title,
        subtitle,
        imageUrl: image_url,
        linkUrl: link_url,
        position: bannerPosition,
        isActive: is_active ?? true,
        sortOrder,
      },
    })

    return NextResponse.json({
      success: true,
      banner,
      message: 'Banner created successfully',
    })
  } catch (error) {
    console.error('Banners POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - Update banner
export async function PUT(request: NextRequest) {
  try {
    const user = await getUserFromToken(request)

    if (!isAdmin(user)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { id, title, subtitle, image_url, link_url, position, is_active, sort_order } = body

    if (!id) {
      return NextResponse.json({ error: 'Banner ID is required' }, { status: 400 })
    }

    // Validate position if provided
    if (position && !VALID_POSITIONS.includes(position)) {
      return NextResponse.json(
        { error: `Invalid position. Valid positions are: ${VALID_POSITIONS.join(', ')}` },
        { status: 400 }
      )
    }

    // Check if banner exists
    const existingBanner = await db.banner.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!existingBanner) {
      return NextResponse.json({ error: 'Banner not found' }, { status: 404 })
    }

    // Build updates object with only provided fields
    const updates: {
      title?: string
      subtitle?: string | null
      imageUrl?: string
      linkUrl?: string | null
      position?: string
      isActive?: boolean
      sortOrder?: number
    } = {}
    if (title !== undefined) updates.title = title
    if (subtitle !== undefined) updates.subtitle = subtitle
    if (image_url !== undefined) updates.imageUrl = image_url
    if (link_url !== undefined) updates.linkUrl = link_url
    if (position !== undefined) updates.position = position
    if (is_active !== undefined) updates.isActive = is_active
    if (sort_order !== undefined) updates.sortOrder = sort_order

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const banner = await db.banner.update({
      where: { id },
      data: updates,
    })

    return NextResponse.json({
      success: true,
      banner,
      message: 'Banner updated successfully',
    })
  } catch (error) {
    console.error('Banners PUT error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete banner
export async function DELETE(request: NextRequest) {
  try {
    const user = await getUserFromToken(request)

    if (!isAdmin(user)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Banner ID is required' }, { status: 400 })
    }

    // Check if banner exists
    const existingBanner = await db.banner.findUnique({
      where: { id },
      select: { id: true, title: true },
    })

    if (!existingBanner) {
      return NextResponse.json({ error: 'Banner not found' }, { status: 404 })
    }

    await db.banner.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: `Banner "${existingBanner.title}" deleted successfully`,
    })
  } catch (error) {
    console.error('Banners DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
