// Addresses API Route - Using Prisma
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashToken } from '@/lib/auth'

// Pakistan Provinces and Cities
const PAKISTAN_LOCATIONS = {
  'Punjab': ['Lahore', 'Faisalabad', 'Rawalpindi', 'Multan', 'Gujranwala', 'Sialkot', 'Sargodha', 'Bahawalpur', 'Sahiwal', 'Sheikhupura'],
  'Sindh': ['Karachi', 'Hyderabad', 'Sukkur', 'Larkana', 'Nawabshah', 'Mirpur Khas', 'Jacobabad'],
  'Khyber Pakhtunkhwa': ['Peshawar', 'Mardan', 'Mingora', 'Kohat', 'Abbottabad', 'Mansehra', 'Dera Ismail Khan'],
  'Balochistan': ['Quetta', 'Gwadar', 'Turbat', 'Khuzdar', 'Chaman', 'Sibi', 'Zhob'],
  'Islamabad Capital Territory': ['Islamabad'],
  'Gilgit-Baltistan': ['Gilgit', 'Skardu', 'Hunza', 'Chilas', 'Ghizer'],
  'Azad Kashmir': ['Muzaffarabad', 'Mirpur', 'Rawalakot', 'Kotli', 'Bagh', 'Bhimber']
}

// Helper to get authenticated user
async function getAuthUser(request: NextRequest) {
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

  return session?.user || null
}

// GET - Get user's addresses
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const addressId = searchParams.get('addressId')
    const getLocations = searchParams.get('getLocations') === 'true'

    // Return Pakistan locations
    if (getLocations) {
      return NextResponse.json({
        provinces: Object.keys(PAKISTAN_LOCATIONS),
        cities: PAKISTAN_LOCATIONS
      })
    }

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Get specific address
    if (addressId) {
      const address = await db.address.findFirst({
        where: {
          id: addressId,
          userId: userId
        }
      })

      if (!address) {
        return NextResponse.json({ error: 'Address not found' }, { status: 404 })
      }

      return NextResponse.json({ address })
    }

    // Get all user addresses
    const addresses = await db.address.findMany({
      where: { userId },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' }
      ]
    })

    return NextResponse.json({ addresses })
  } catch (error) {
    console.error('Addresses GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create new address
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      userId, label, recipientName, recipientPhone,
      province, city, area, streetAddress, postalCode,
      latitude, longitude, isDefault
    } = body

    if (!userId || !recipientName || !recipientPhone || !province || !city || !streetAddress) {
      return NextResponse.json({ 
        error: 'User ID, recipient name, phone, province, city, and street address are required' 
      }, { status: 400 })
    }

    // If this is default, unset other defaults
    if (isDefault) {
      await db.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false }
      })
    }

    const address = await db.address.create({
      data: {
        userId,
        label: label || 'Home',
        recipientName,
        recipientPhone,
        country: 'Pakistan',
        province,
        city,
        area,
        streetAddress,
        postalCode,
        isDefault: isDefault || false,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null
      }
    })

    return NextResponse.json({ success: true, address })
  } catch (error) {
    console.error('Addresses POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - Update address
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      addressId, userId, label, recipientName, recipientPhone,
      province, city, area, streetAddress, postalCode,
      latitude, longitude, isDefault
    } = body

    if (!addressId || !userId) {
      return NextResponse.json({ error: 'Address ID and User ID are required' }, { status: 400 })
    }

    // Verify ownership
    const existingAddress = await db.address.findFirst({
      where: { id: addressId }
    })

    if (!existingAddress || existingAddress.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // If setting as default, unset other defaults
    if (isDefault) {
      await db.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false }
      })
    }

    const updateData: Record<string, unknown> = {}
    if (label !== undefined) updateData.label = label
    if (recipientName !== undefined) updateData.recipientName = recipientName
    if (recipientPhone !== undefined) updateData.recipientPhone = recipientPhone
    if (province !== undefined) updateData.province = province
    if (city !== undefined) updateData.city = city
    if (area !== undefined) updateData.area = area
    if (streetAddress !== undefined) updateData.streetAddress = streetAddress
    if (postalCode !== undefined) updateData.postalCode = postalCode
    if (latitude !== undefined) updateData.latitude = parseFloat(latitude)
    if (longitude !== undefined) updateData.longitude = parseFloat(longitude)
    if (isDefault !== undefined) updateData.isDefault = isDefault

    const address = await db.address.update({
      where: { id: addressId },
      data: updateData
    })

    return NextResponse.json({ success: true, address })
  } catch (error) {
    console.error('Addresses PUT error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete address
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const addressId = searchParams.get('addressId')
    const userId = searchParams.get('userId')

    if (!addressId || !userId) {
      return NextResponse.json({ error: 'Address ID and User ID are required' }, { status: 400 })
    }

    // Verify ownership
    const address = await db.address.findFirst({
      where: { id: addressId }
    })

    if (!address || address.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    await db.address.delete({
      where: { id: addressId }
    })

    // If deleted address was default, set another as default
    if (address.isDefault) {
      const otherAddress = await db.address.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' }
      })

      if (otherAddress) {
        await db.address.update({
          where: { id: otherAddress.id },
          data: { isDefault: true }
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Addresses DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
