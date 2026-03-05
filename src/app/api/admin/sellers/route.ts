// Admin Sellers API Route - Comprehensive Seller Management
// Using Prisma ORM with auth pattern from flash-sale route
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Helper to hash token using SHA-256 (same pattern as flash-sale route)
async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(token)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// Helper to get user from session token (same pattern as flash-sale route)
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
          email: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  })

  return session?.user
}

// Check if user is admin
function isAdmin(user: { role: string } | null): boolean {
  return user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN'
}

// Generate a unique slug from store name
async function generateUniqueSlug(storeName: string): Promise<string> {
  const baseSlug = storeName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  let slug = baseSlug
  let counter = 1

  while (await db.seller.findUnique({ where: { storeSlug: slug } })) {
    slug = `${baseSlug}-${counter}`
    counter++
  }

  return slug
}

// ============================================
// GET /api/admin/sellers - Fetch all sellers with pagination, search, status filter
// ============================================
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken(request)

    if (!isAdmin(user)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    const sellerId = searchParams.get('id') || ''
    const includeVerification = searchParams.get('includeVerification') === 'true'
    const skip = (page - 1) * pageSize

    // If specific seller ID is requested - return full seller profile with verification details
    if (sellerId) {
      const seller = await db.seller.findUnique({
        where: { id: sellerId },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              phone: true,
              avatarUrl: true,
              accountStatus: true,
              emailVerified: true,
              phoneVerified: true,
              createdAt: true,
              lastLoginAt: true,
            }
          },
          sellerWarnings: {
            where: { isActive: true },
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
          _count: {
            select: {
              products: true,
              orders: { where: { status: 'DELIVERED' } },
              sellerPayouts: true,
            }
          }
        }
      })

      if (!seller) {
        return NextResponse.json({ error: 'Seller not found' }, { status: 404 })
      }

      // Get financial metrics
      const [totalRevenue, totalEarnings, pendingPayouts, recentOrders] = await Promise.all([
        db.orderItem.aggregate({
          where: { sellerId },
          _sum: { totalPrice: true }
        }),
        db.orderItem.aggregate({
          where: { sellerId },
          _sum: { sellerEarnings: true }
        }),
        db.sellerPayout.aggregate({
          where: { sellerId, status: 'PENDING' },
          _sum: { amount: true }
        }),
        db.order.findMany({
          where: { sellerId },
          select: {
            id: true,
            orderNumber: true,
            status: true,
            total: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        })
      ])

      // Build verification status object
      const verificationStatus = {
        isVerified: seller.status === 'VERIFIED',
        verifiedAt: seller.verifiedAt,
        verifiedBy: seller.verifiedBy,
        verificationNotes: seller.verificationNotes,
        hasBusinessDoc: !!seller.businessDocUrl,
        hasCnic: !!seller.cnicNumber,
        hasNtn: !!seller.ntnNumber,
        hasBankDetails: !!(seller.bankName && seller.bankAccountNumber),
        hasMobileWallet: !!(seller.jazzCashNumber || seller.easypaisaNumber),
        agreementAccepted: seller.sellerAgreementAccepted,
        agreementAcceptedAt: seller.sellerAgreementAcceptedAt,
      }

      return NextResponse.json({
        success: true,
        seller: {
          ...seller,
          verificationStatus: includeVerification ? verificationStatus : undefined,
          metrics: {
            totalRevenue: totalRevenue._sum.totalPrice || 0,
            totalEarnings: totalEarnings._sum.sellerEarnings || 0,
            pendingPayouts: pendingPayouts._sum.amount || 0,
            completedOrders: seller._count.orders,
            totalProducts: seller._count.products,
            totalPayouts: seller._count.sellerPayouts,
          },
          recentOrders,
        }
      })
    }

    // Build where clause for listing
    const where: {
      OR?: Array<Record<string, unknown>>
      status?: string
    } = {}

    // Search functionality
    if (search) {
      where.OR = [
        { storeName: { contains: search } },
        { storeSlug: { contains: search } },
        { businessName: { contains: search } },
        { businessEmail: { contains: search } },
        { businessPhone: { contains: search } },
      ]
    }

    // Status filter
    if (status && ['PENDING', 'VERIFIED', 'SUSPENDED', 'BANNED', 'REJECTED'].includes(status)) {
      where.status = status
    }

    // Get sellers with pagination
    const [sellers, totalCount] = await Promise.all([
      db.seller.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              phone: true,
              avatarUrl: true,
              accountStatus: true,
            }
          },
          _count: {
            select: {
              products: { where: { status: 'LIVE' } },
              orders: true,
            }
          }
        },
        orderBy: [
          { status: 'asc' }, // PENDING first
          { createdAt: 'desc' }
        ],
        skip,
        take: pageSize,
      }),
      db.seller.count({ where })
    ])

    // Get overall stats for admin dashboard
    const stats = await Promise.all([
      db.seller.count(),
      db.seller.count({ where: { status: 'PENDING' } }),
      db.seller.count({ where: { status: 'VERIFIED' } }),
      db.seller.count({ where: { status: 'SUSPENDED' } }),
      db.seller.count({ where: { status: 'BANNED' } }),
      db.seller.count({ where: { status: 'REJECTED' } }),
      db.seller.count({ where: { isFeatured: true } }),
      db.seller.count({ where: { isTopSeller: true } }),
    ])

    // Add verification summary to each seller
    const sellersWithVerification = sellers.map(seller => ({
      ...seller,
      verificationSummary: {
        isVerified: seller.status === 'VERIFIED',
        verifiedAt: seller.verifiedAt,
        hasBusinessDoc: !!seller.businessDocUrl,
        hasBankDetails: !!(seller.bankName && seller.bankAccountNumber),
        hasMobileWallet: !!(seller.jazzCashNumber || seller.easypaisaNumber),
      }
    }))

    return NextResponse.json({
      success: true,
      sellers: sellersWithVerification,
      pagination: {
        total: totalCount,
        page,
        pageSize,
        totalPages: Math.ceil(totalCount / pageSize),
        hasMore: skip + pageSize < totalCount,
      },
      stats: {
        total: stats[0],
        pending: stats[1],
        verified: stats[2],
        suspended: stats[3],
        banned: stats[4],
        rejected: stats[5],
        featured: stats[6],
        topSellers: stats[7],
      }
    })
  } catch (error) {
    console.error('Admin Sellers GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ============================================
// PUT /api/admin/sellers - Update seller status, verify seller
// ============================================
export async function PUT(request: NextRequest) {
  try {
    const user = await getUserFromToken(request)

    if (!isAdmin(user)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const {
      sellerId,
      action,
      status,
      verificationNotes,
      isFeatured,
      isTopSeller,
      commissionRate,
      // Store info updates
      storeName,
      storeDescription,
      storeLogoUrl,
      storeBannerUrl,
      // Business info updates
      businessPhone,
      businessEmail,
      // Banking info updates
      bankName,
      bankAccountTitle,
      bankAccountNumber,
      iban,
      jazzCashNumber,
      easypaisaNumber,
      // Policy updates
      returnPolicy,
      shippingPolicy,
      warrantyPolicy,
    } = body

    if (!sellerId) {
      return NextResponse.json({ error: 'Seller ID is required' }, { status: 400 })
    }

    // Get current seller data
    const currentSeller = await db.seller.findUnique({
      where: { id: sellerId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          }
        }
      }
    })

    if (!currentSeller) {
      return NextResponse.json({ error: 'Seller not found' }, { status: 404 })
    }

    // Build update data
    const updateData: Record<string, unknown> = {}
    const notifications: Array<{ title: string; message: string; type: string }> = []

    // Handle action-based updates
    if (action) {
      switch (action) {
        case 'approve':
        case 'verify':
          updateData.status = 'VERIFIED'
          updateData.verifiedAt = new Date()
          updateData.verifiedBy = user!.id
          if (verificationNotes) {
            updateData.verificationNotes = verificationNotes
          }
          notifications.push({
            title: 'Seller Account Verified',
            message: verificationNotes || 'Congratulations! Your seller account has been verified. You can now start selling on Luminvera.',
            type: 'APPROVAL'
          })
          break

        case 'reject':
          updateData.status = 'REJECTED'
          updateData.verificationNotes = verificationNotes || 'Your seller application has been rejected.'
          notifications.push({
            title: 'Seller Application Rejected',
            message: verificationNotes || 'Your seller application has been rejected. Please review the feedback and contact support if needed.',
            type: 'SUSPENSION'
          })
          break

        case 'suspend':
          updateData.status = 'SUSPENDED'
          updateData.verificationNotes = verificationNotes
          notifications.push({
            title: 'Seller Account Suspended',
            message: verificationNotes || 'Your seller account has been suspended. Please contact support for more information.',
            type: 'SUSPENSION'
          })
          // Deactivate all seller products
          await db.product.updateMany({
            where: { sellerId },
            data: { status: 'DISABLED' }
          })
          break

        case 'ban':
          updateData.status = 'BANNED'
          updateData.verificationNotes = verificationNotes
          notifications.push({
            title: 'Seller Account Banned',
            message: verificationNotes || 'Your seller account has been banned. Please contact support for more information.',
            type: 'SUSPENSION'
          })
          // Deactivate all seller products
          await db.product.updateMany({
            where: { sellerId },
            data: { status: 'DISABLED' }
          })
          break

        case 'reinstate':
        case 'unban':
        case 'unsuspend':
          updateData.status = 'VERIFIED'
          updateData.verificationNotes = verificationNotes
          notifications.push({
            title: 'Seller Account Reinstated',
            message: verificationNotes || 'Your seller account has been reinstated. You can resume selling on Luminvera.',
            type: 'APPROVAL'
          })
          break

        case 'feature':
          updateData.isFeatured = true
          break

        case 'unfeature':
          updateData.isFeatured = false
          break

        case 'setTopSeller':
          updateData.isTopSeller = true
          break

        case 'removeTopSeller':
          updateData.isTopSeller = false
          break

        default:
          return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
      }
    } else {
      // Handle direct status update (for backward compatibility)
      if (status && ['PENDING', 'VERIFIED', 'SUSPENDED', 'BANNED', 'REJECTED'].includes(status)) {
        updateData.status = status

        if (status === 'VERIFIED') {
          updateData.verifiedAt = new Date()
          updateData.verifiedBy = user!.id
        }

        if (status === 'SUSPENDED' || status === 'BANNED') {
          // Deactivate all seller products
          await db.product.updateMany({
            where: { sellerId },
            data: { status: 'DISABLED' }
          })
        }

        const statusMessages: Record<string, string> = {
          VERIFIED: 'Congratulations! Your seller account has been verified.',
          SUSPENDED: 'Your seller account has been suspended.',
          BANNED: 'Your seller account has been banned.',
          REJECTED: 'Your seller application has been rejected.',
          PENDING: 'Your seller account is under review.',
        }

        notifications.push({
          title: `Seller Account ${status.charAt(0) + status.slice(1).toLowerCase()}`,
          message: verificationNotes || statusMessages[status] || `Your account status has been updated.`,
          type: status === 'VERIFIED' ? 'APPROVAL' : 'SUSPENSION'
        })
      }
    }

    // Handle verification notes
    if (verificationNotes !== undefined && !action) {
      updateData.verificationNotes = verificationNotes
    }

    // Handle featured/top seller flags
    if (isFeatured !== undefined) {
      updateData.isFeatured = isFeatured
    }

    if (isTopSeller !== undefined) {
      updateData.isTopSeller = isTopSeller
    }

    // Handle commission rate
    if (commissionRate !== undefined) {
      if (commissionRate < 0 || commissionRate > 100) {
        return NextResponse.json({ error: 'Commission rate must be between 0 and 100' }, { status: 400 })
      }
      updateData.commissionRate = commissionRate
    }

    // Handle store info updates
    if (storeName !== undefined) {
      // Check if store name is unique
      if (storeName !== currentSeller.storeName) {
        const existingStore = await db.seller.findFirst({
          where: {
            storeName,
            id: { not: sellerId }
          }
        })
        if (existingStore) {
          return NextResponse.json({ error: 'Store name already exists' }, { status: 400 })
        }
      }
      updateData.storeName = storeName
    }
    if (storeDescription !== undefined) updateData.storeDescription = storeDescription
    if (storeLogoUrl !== undefined) updateData.storeLogoUrl = storeLogoUrl
    if (storeBannerUrl !== undefined) updateData.storeBannerUrl = storeBannerUrl

    // Handle business info updates
    if (businessPhone !== undefined) updateData.businessPhone = businessPhone
    if (businessEmail !== undefined) updateData.businessEmail = businessEmail

    // Handle banking info updates
    if (bankName !== undefined) updateData.bankName = bankName
    if (bankAccountTitle !== undefined) updateData.bankAccountTitle = bankAccountTitle
    if (bankAccountNumber !== undefined) updateData.bankAccountNumber = bankAccountNumber
    if (iban !== undefined) updateData.iban = iban
    if (jazzCashNumber !== undefined) updateData.jazzCashNumber = jazzCashNumber
    if (easypaisaNumber !== undefined) updateData.easypaisaNumber = easypaisaNumber

    // Handle policy updates
    if (returnPolicy !== undefined) updateData.returnPolicy = returnPolicy
    if (shippingPolicy !== undefined) updateData.shippingPolicy = shippingPolicy
    if (warrantyPolicy !== undefined) updateData.warrantyPolicy = warrantyPolicy

    // Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    // Update seller
    const updatedSeller = await db.seller.update({
      where: { id: sellerId },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            avatarUrl: true,
          }
        },
        _count: {
          select: {
            products: true,
            orders: true,
          }
        }
      }
    })

    // Create notifications for seller
    for (const notification of notifications) {
      await db.notification.create({
        data: {
          userId: currentSeller.userId,
          type: notification.type as 'APPROVAL' | 'SUSPENSION',
          title: notification.title,
          message: notification.message,
        }
      })
    }

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: user!.id,
        userRole: user!.role,
        action: action ? `SELLER_${action.toUpperCase()}` : 'UPDATE_SELLER',
        entityType: 'seller',
        entityId: sellerId,
        oldValue: JSON.stringify({
          status: currentSeller.status,
          isFeatured: currentSeller.isFeatured,
          isTopSeller: currentSeller.isTopSeller,
          commissionRate: currentSeller.commissionRate,
        }),
        newValue: JSON.stringify(updateData),
      }
    })

    // Build verification status for response
    const verificationStatus = {
      isVerified: updatedSeller.status === 'VERIFIED',
      verifiedAt: updatedSeller.verifiedAt,
      verifiedBy: updatedSeller.verifiedBy,
      verificationNotes: updatedSeller.verificationNotes,
      hasBusinessDoc: !!updatedSeller.businessDocUrl,
      hasCnic: !!updatedSeller.cnicNumber,
      hasNtn: !!updatedSeller.ntnNumber,
      hasBankDetails: !!(updatedSeller.bankName && updatedSeller.bankAccountNumber),
      hasMobileWallet: !!(updatedSeller.jazzCashNumber || updatedSeller.easypaisaNumber),
    }

    return NextResponse.json({
      success: true,
      message: 'Seller updated successfully',
      seller: {
        ...updatedSeller,
        verificationStatus,
      }
    })
  } catch (error) {
    console.error('Admin Sellers PUT error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ============================================
// POST /api/admin/sellers - Create seller profile (admin action)
// ============================================
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request)

    if (!isAdmin(user)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const {
      userId,
      storeName,
      storeDescription,
      storeLogoUrl,
      businessName,
      businessType,
      cnicNumber,
      ntnNumber,
      businessRegNumber,
      businessDocUrl,
      businessPhone,
      businessEmail,
      bankName,
      bankAccountTitle,
      bankAccountNumber,
      iban,
      jazzCashNumber,
      easypaisaNumber,
      returnPolicy,
      shippingPolicy,
      warrantyPolicy,
      status,
      commissionRate,
      isFeatured,
      verificationNotes,
    } = body

    // Validate required fields
    if (!userId || !storeName) {
      return NextResponse.json({ error: 'User ID and store name are required' }, { status: 400 })
    }

    // Check if user exists
    const targetUser = await db.user.findUnique({
      where: { id: userId }
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user already has a seller profile
    const existingSeller = await db.seller.findUnique({
      where: { userId }
    })

    if (existingSeller) {
      return NextResponse.json({ error: 'User already has a seller profile' }, { status: 400 })
    }

    // Generate unique slug
    const storeSlug = await generateUniqueSlug(storeName)

    // Create seller profile
    const seller = await db.seller.create({
      data: {
        userId,
        storeName,
        storeSlug,
        storeDescription: storeDescription || null,
        storeLogoUrl: storeLogoUrl || null,
        businessName: businessName || null,
        businessType: businessType || null,
        cnicNumber: cnicNumber || null,
        ntnNumber: ntnNumber || null,
        businessRegNumber: businessRegNumber || null,
        businessDocUrl: businessDocUrl || null,
        businessPhone: businessPhone || null,
        businessEmail: businessEmail || null,
        bankName: bankName || null,
        bankAccountTitle: bankAccountTitle || null,
        bankAccountNumber: bankAccountNumber || null,
        iban: iban || null,
        jazzCashNumber: jazzCashNumber || null,
        easypaisaNumber: easypaisaNumber || null,
        returnPolicy: returnPolicy || null,
        shippingPolicy: shippingPolicy || null,
        warrantyPolicy: warrantyPolicy || null,
        status: status || 'PENDING',
        commissionRate: commissionRate || 10,
        isFeatured: isFeatured || false,
        verificationNotes: verificationNotes || null,
        verifiedAt: status === 'VERIFIED' ? new Date() : null,
        verifiedBy: status === 'VERIFIED' ? user!.id : null,
        sellerAgreementAccepted: true,
        sellerAgreementAcceptedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            avatarUrl: true,
          }
        }
      }
    })

    // Update user role to SELLER if not already
    if (targetUser.role !== 'SELLER' && targetUser.role !== 'ADMIN' && targetUser.role !== 'SUPER_ADMIN') {
      await db.user.update({
        where: { id: userId },
        data: { role: 'SELLER' }
      })
    }

    // Create notification for user
    await db.notification.create({
      data: {
        userId,
        type: 'APPROVAL',
        title: 'Seller Profile Created',
        message: status === 'VERIFIED'
          ? 'Your seller profile has been created and verified. You can now start selling!'
          : 'Your seller profile has been created and is pending verification.'
      }
    })

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: user!.id,
        userRole: user!.role,
        action: 'CREATE_SELLER',
        entityType: 'seller',
        entityId: seller.id,
        newValue: JSON.stringify({
          storeName: seller.storeName,
          status: seller.status,
          userId: seller.userId
        })
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Seller profile created successfully',
      seller
    })
  } catch (error) {
    console.error('Admin Sellers POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ============================================
// DELETE /api/admin/sellers - Delete seller profile
// ============================================
export async function DELETE(request: NextRequest) {
  try {
    const user = await getUserFromToken(request)

    if (!isAdmin(user)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const sellerId = searchParams.get('sellerId')

    if (!sellerId) {
      return NextResponse.json({ error: 'Seller ID is required' }, { status: 400 })
    }

    // Get seller to delete
    const seller = await db.seller.findUnique({
      where: { id: sellerId },
      include: { user: true }
    })

    if (!seller) {
      return NextResponse.json({ error: 'Seller not found' }, { status: 404 })
    }

    // Check for active orders
    const activeOrders = await db.order.count({
      where: {
        sellerId,
        status: { in: ['PLACED', 'CONFIRMED', 'PACKED', 'SHIPPED'] }
      }
    })

    if (activeOrders > 0) {
      return NextResponse.json(
        { error: `Cannot delete seller with ${activeOrders} active orders. Complete or cancel orders first.` },
        { status: 400 }
      )
    }

    // Check for pending payouts
    const pendingPayouts = await db.sellerPayout.count({
      where: {
        sellerId,
        status: { in: ['PENDING', 'PROCESSING'] }
      }
    })

    if (pendingPayouts > 0) {
      return NextResponse.json(
        { error: `Cannot delete seller with ${pendingPayouts} pending payouts. Process payouts first.` },
        { status: 400 }
      )
    }

    // Store seller info for audit log before deletion
    const sellerInfo = {
      storeName: seller.storeName,
      userId: seller.userId,
      totalProducts: seller.totalProducts,
      totalOrders: seller.totalOrders,
      availableBalance: seller.availableBalance,
    }

    // Delete seller profile (cascade will handle related records)
    await db.seller.delete({
      where: { id: sellerId }
    })

    // Update user role back to USER if applicable
    if (seller.user.role === 'SELLER') {
      await db.user.update({
        where: { id: seller.userId },
        data: { role: 'USER' }
      })
    }

    // Create notification for user
    await db.notification.create({
      data: {
        userId: seller.userId,
        type: 'SYSTEM',
        title: 'Seller Profile Deleted',
        message: 'Your seller profile has been deleted by an administrator.'
      }
    })

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: user!.id,
        userRole: user!.role,
        action: 'DELETE_SELLER',
        entityType: 'seller',
        entityId: sellerId,
        oldValue: JSON.stringify(sellerInfo),
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Seller profile deleted successfully'
    })
  } catch (error) {
    console.error('Admin Sellers DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
