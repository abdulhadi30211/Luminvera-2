// Payouts API Route - Seller Payout Management
// Supports: Bank Transfer, JazzCash, EasyPaisa

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { PaymentStatus, NotificationType } from '@prisma/client'

// Payout status constants
const PAYOUT_STATUS = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED'
} as const

// Payment method constants for payouts
const PAYOUT_METHODS = {
  BANK_TRANSFER: 'BANK_TRANSFER',
  JAZZCASH: 'JAZZCASH',
  EASYPAISA: 'EASYPAISA'
} as const

// Minimum payout amounts by method
const MIN_PAYOUT_AMOUNTS: Record<string, number> = {
  BANK_TRANSFER: 5000,   // PKR 5,000 minimum for bank transfer
  JAZZCASH: 1000,        // PKR 1,000 minimum for JazzCash
  EASYPAISA: 1000        // PKR 1,000 minimum for EasyPaisa
}

// GET - Fetch seller payouts with filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const payoutId = searchParams.get('payoutId')
    const sellerId = searchParams.get('sellerId')
    const status = searchParams.get('status')
    const method = searchParams.get('method')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const isAdmin = searchParams.get('isAdmin') === 'true'
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Get specific payout by ID
    if (payoutId) {
      const payout = await db.sellerPayout.findUnique({
        where: { id: payoutId },
        include: {
          seller: {
            select: {
              id: true,
              storeName: true,
              storeSlug: true,
              bankName: true,
              bankAccountNumber: true,
              bankAccountTitle: true,
              iban: true,
              jazzCashNumber: true,
              easypaisaNumber: true,
              totalEarnings: true,
              availableBalance: true,
              pendingBalance: true
            }
          }
        }
      })

      if (!payout) {
        return NextResponse.json({ error: 'Payout not found' }, { status: 404 })
      }

      // Get payout transactions if exists
      const transactions = await db.walletTransaction.findMany({
        where: { reference: payoutId },
        orderBy: { createdAt: 'desc' }
      })

      return NextResponse.json({ 
        payout: {
          ...payout,
          transactions
        }
      })
    }

    // Admin can see all payouts, sellers only see their own
    if (!isAdmin && !sellerId) {
      return NextResponse.json({ error: 'Seller ID is required' }, { status: 400 })
    }

    // Build query
    const where: any = {}
    
    if (sellerId) {
      where.sellerId = sellerId
    }
    if (status) {
      where.status = status.toUpperCase() as PaymentStatus
    }
    if (startDate) {
      where.createdAt = { ...where.createdAt, gte: new Date(startDate) }
    }
    if (endDate) {
      where.createdAt = { ...where.createdAt, lte: new Date(endDate) }
    }

    // Get payouts with count
    const [payouts, count] = await Promise.all([
      db.sellerPayout.findMany({
        where,
        include: {
          seller: {
            select: {
              id: true,
              storeName: true,
              storeSlug: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit
      }),
      db.sellerPayout.count({ where })
    ])

    // Get seller balance info for seller requests
    let balanceInfo = null
    if (sellerId) {
      const seller = await db.seller.findUnique({
        where: { id: sellerId },
        select: {
          availableBalance: true,
          pendingBalance: true,
          totalEarnings: true,
          bankName: true,
          bankAccountNumber: true,
          jazzCashNumber: true,
          easypaisaNumber: true
        }
      })
      balanceInfo = seller
    }

    // Calculate summary stats
    const stats = await db.sellerPayout.findMany({
      where,
      select: { status: true, amount: true }
    })

    const summary = {
      totalPayouts: stats.length,
      totalAmount: stats.reduce((sum, p) => sum + p.amount, 0),
      pendingAmount: stats.filter(p => p.status === 'PENDING').reduce((sum, p) => sum + p.amount, 0),
      completedAmount: stats.filter(p => p.status === 'COMPLETED').reduce((sum, p) => sum + p.amount, 0),
    }

    return NextResponse.json({
      payouts,
      balance: balanceInfo,
      summary,
      pagination: {
        total: count,
        limit,
        offset,
        hasMore: offset + limit < count
      }
    })
  } catch (error) {
    console.error('Payouts GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Request payout (seller)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      sellerId, 
      amount, 
      payoutMethod = 'BANK_TRANSFER',
      customBankName,
      customBankAccount,
      customAccountTitle,
      customJazzCashNumber,
      customEasyPaisaNumber
    } = body

    if (!sellerId || !amount) {
      return NextResponse.json({ 
        error: 'Seller ID and amount are required' 
      }, { status: 400 })
    }

    // Validate payout method
    const validMethods = ['BANK_TRANSFER', 'JAZZCASH', 'EASYPAISA']
    if (!validMethods.includes(payoutMethod)) {
      return NextResponse.json({ 
        error: 'Invalid payout method. Use BANK_TRANSFER, JAZZCASH, or EASYPAISA' 
      }, { status: 400 })
    }

    // Check minimum payout amount
    const minAmount = MIN_PAYOUT_AMOUNTS[payoutMethod] || 1000
    if (amount < minAmount) {
      return NextResponse.json({ 
        error: `Minimum payout amount for ${payoutMethod.toLowerCase().replace('_', ' ')} is PKR ${minAmount.toLocaleString()}` 
      }, { status: 400 })
    }

    // Get seller's balance and payment details
    const seller = await db.seller.findUnique({
      where: { id: sellerId },
      select: {
        id: true,
        storeName: true,
        availableBalance: true,
        pendingBalance: true,
        totalEarnings: true,
        bankName: true,
        bankAccountNumber: true,
        bankAccountTitle: true,
        iban: true,
        jazzCashNumber: true,
        easypaisaNumber: true,
        status: true
      }
    })

    if (!seller) {
      return NextResponse.json({ error: 'Seller not found' }, { status: 404 })
    }

    // Check if seller is verified
    if (seller.status !== 'VERIFIED') {
      return NextResponse.json({ 
        error: 'Only verified sellers can request payouts' 
      }, { status: 400 })
    }

    // Check balance
    if (seller.availableBalance < amount) {
      return NextResponse.json({ 
        error: `Insufficient balance. Available: PKR ${seller.availableBalance.toLocaleString()}` 
      }, { status: 400 })
    }

    // Determine payment details based on method
    let paymentDetails: Record<string, any> = {}

    if (payoutMethod === 'BANK_TRANSFER') {
      const bankName = customBankName || seller.bankName
      const bankAccount = customBankAccount || seller.bankAccountNumber
      const accountTitle = customAccountTitle || seller.bankAccountTitle

      if (!bankName || !bankAccount) {
        return NextResponse.json({ 
          error: 'Bank account details not configured. Please update your payment settings.' 
        }, { status: 400 })
      }

      paymentDetails = {
        bankName,
        bankAccountNumber: bankAccount
      }
    } else if (payoutMethod === 'JAZZCASH') {
      const jazzCashNumber = customJazzCashNumber || seller.jazzCashNumber

      if (!jazzCashNumber) {
        return NextResponse.json({ 
          error: 'JazzCash number not configured. Please update your payment settings.' 
        }, { status: 400 })
      }
    } else if (payoutMethod === 'EASYPAISA') {
      const easypaisaNumber = customEasyPaisaNumber || seller.easypaisaNumber

      if (!easypaisaNumber) {
        return NextResponse.json({ 
          error: 'EasyPaisa number not configured. Please update your payment settings.' 
        }, { status: 400 })
      }
    }

    // Check for pending payout requests
    const pendingPayouts = await db.sellerPayout.findMany({
      where: {
        sellerId,
        status: 'PENDING'
      },
      select: { id: true, amount: true }
    })

    if (pendingPayouts.length > 0) {
      return NextResponse.json({ 
        error: 'You have a pending payout request. Please wait for it to be processed.',
        pendingAmount: pendingPayouts[0].amount
      }, { status: 400 })
    }

    // Generate payout period (previous month)
    const now = new Date()
    const periodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const periodEnd = new Date(now.getFullYear(), now.getMonth(), 0)

    // Create payout request
    const payout = await db.sellerPayout.create({
      data: {
        sellerId,
        amount,
        status: 'PENDING',
        periodStart,
        periodEnd,
        ...paymentDetails
      }
    })

    // Deduct from available balance and add to pending
    const newAvailableBalance = seller.availableBalance - amount
    const newPendingBalance = (seller.pendingBalance || 0) + amount

    await db.seller.update({
      where: { id: sellerId },
      data: {
        availableBalance: newAvailableBalance,
        pendingBalance: newPendingBalance
      }
    })

    // Create notification for admin - get all admins
    const admins = await db.user.findMany({
      where: {
        role: { in: ['ADMIN', 'SUPER_ADMIN'] }
      },
      select: { id: true }
    })

    if (admins.length > 0) {
      await db.notification.createMany({
        data: admins.map(admin => ({
          userId: admin.id,
          type: NotificationType.PAYOUT,
          title: 'New Payout Request',
          message: `${seller.storeName} has requested a payout of PKR ${amount.toLocaleString()} via ${payoutMethod.toLowerCase().replace('_', ' ')}`,
          data: JSON.stringify({ payoutId: payout.id, sellerId, amount, payoutMethod })
        }))
      })
    }

    // Create notification for seller - get seller's user id
    const sellerUser = await db.seller.findUnique({
      where: { id: sellerId },
      select: { userId: true }
    })

    if (sellerUser) {
      await db.notification.create({
        data: {
          userId: sellerUser.userId,
          type: NotificationType.PAYOUT,
          title: 'Payout Request Submitted',
          message: `Your payout request of PKR ${amount.toLocaleString()} has been submitted and is being processed.`,
          data: JSON.stringify({ payoutId: payout.id, amount })
        }
      })
    }

    return NextResponse.json({ 
      success: true, 
      payout,
      message: 'Payout request submitted successfully',
      newBalance: {
        available: newAvailableBalance,
        pending: newPendingBalance
      }
    })
  } catch (error) {
    console.error('Payouts POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - Process payout (admin only)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      payoutId, 
      action, 
      transactionReference, 
      processedBy, 
      adminNotes,
      failureReason
    } = body

    if (!payoutId || !action || !processedBy) {
      return NextResponse.json({ 
        error: 'Payout ID, action, and processed by are required' 
      }, { status: 400 })
    }

    // Get payout details
    const payout = await db.sellerPayout.findUnique({
      where: { id: payoutId },
      include: {
        seller: {
          select: {
            id: true,
            userId: true,
            storeName: true,
            availableBalance: true,
            pendingBalance: true
          }
        }
      }
    })

    if (!payout) {
      return NextResponse.json({ error: 'Payout not found' }, { status: 404 })
    }

    if (payout.status !== 'PENDING' && payout.status !== 'PROCESSING') {
      return NextResponse.json({ 
        error: `Cannot process payout with status: ${payout.status}` 
      }, { status: 400 })
    }

    const now = new Date()

    // Handle different actions
    if (action === 'process') {
      // Mark as processing
      await db.sellerPayout.update({
        where: { id: payoutId },
        data: {
          status: 'PROCESSING',
          processedBy
        }
      })

      // Create notification
      if (payout.seller) {
        await db.notification.create({
          data: {
            userId: payout.seller.userId,
            type: NotificationType.PAYOUT,
            title: 'Payout Processing',
            message: `Your payout of PKR ${payout.amount.toLocaleString()} is being processed.`
          }
        })
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Payout marked as processing' 
      })
    }

    if (action === 'complete') {
      if (!transactionReference) {
        return NextResponse.json({ 
          error: 'Transaction reference is required to complete payout' 
        }, { status: 400 })
      }

      // Update payout status
      await db.sellerPayout.update({
        where: { id: payoutId },
        data: {
          status: 'COMPLETED',
          transactionReference,
          processedAt: now,
          processedBy
        }
      })

      // Deduct from pending balance
      const newPendingBalance = (payout.seller?.pendingBalance || 0) - payout.amount

      await db.seller.update({
        where: { id: payout.sellerId },
        data: {
          pendingBalance: Math.max(0, newPendingBalance)
        }
      })

      // Create notification
      if (payout.seller) {
        await db.notification.create({
          data: {
            userId: payout.seller.userId,
            type: NotificationType.PAYOUT,
            title: 'Payout Completed',
            message: `Your payout of PKR ${payout.amount.toLocaleString()} has been completed. Transaction reference: ${transactionReference}`,
            data: JSON.stringify({ payoutId, transactionReference })
          }
        })
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Payout completed successfully' 
      })
    }

    if (action === 'fail') {
      // Refund to seller's available balance
      const newAvailableBalance = (payout.seller?.availableBalance || 0) + payout.amount
      const newPendingBalance = (payout.seller?.pendingBalance || 0) - payout.amount

      await db.seller.update({
        where: { id: payout.sellerId },
        data: {
          availableBalance: newAvailableBalance,
          pendingBalance: Math.max(0, newPendingBalance)
        }
      })

      // Update payout status
      await db.sellerPayout.update({
        where: { id: payoutId },
        data: {
          status: 'FAILED',
          processedAt: now,
          processedBy,
          // Note: failureReason field doesn't exist in schema, we'd need to add it
        }
      })

      // Create notification
      if (payout.seller) {
        await db.notification.create({
          data: {
            userId: payout.seller.userId,
            type: NotificationType.PAYOUT,
            title: 'Payout Failed',
            message: `Your payout of PKR ${payout.amount.toLocaleString()} has failed. Reason: ${failureReason || 'Processing failed'}. Amount has been refunded to your available balance.`,
            data: JSON.stringify({ payoutId, failureReason })
          }
        })
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Payout marked as failed, amount refunded' 
      })
    }

    if (action === 'cancel') {
      // Refund to seller's available balance
      const newAvailableBalance = (payout.seller?.availableBalance || 0) + payout.amount
      const newPendingBalance = (payout.seller?.pendingBalance || 0) - payout.amount

      await db.seller.update({
        where: { id: payout.sellerId },
        data: {
          availableBalance: newAvailableBalance,
          pendingBalance: Math.max(0, newPendingBalance)
        }
      })

      // Update payout status - use FAILED as CANCELLED doesn't exist in PaymentStatus
      await db.sellerPayout.update({
        where: { id: payoutId },
        data: {
          status: 'FAILED',
          processedAt: now,
          processedBy
        }
      })

      // Create notification
      if (payout.seller) {
        await db.notification.create({
          data: {
            userId: payout.seller.userId,
            type: NotificationType.PAYOUT,
            title: 'Payout Cancelled',
            message: `Your payout request of PKR ${payout.amount.toLocaleString()} has been cancelled. Amount has been refunded to your available balance.`,
            data: JSON.stringify({ payoutId })
          }
        })
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Payout cancelled, amount refunded' 
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Payouts PUT error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Cancel pending payout (seller)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const payoutId = searchParams.get('payoutId')
    const sellerId = searchParams.get('sellerId')

    if (!payoutId || !sellerId) {
      return NextResponse.json({ 
        error: 'Payout ID and Seller ID are required' 
      }, { status: 400 })
    }

    // Get payout details
    const payout = await db.sellerPayout.findUnique({
      where: { id: payoutId }
    })

    if (!payout || payout.sellerId !== sellerId) {
      return NextResponse.json({ error: 'Payout not found' }, { status: 404 })
    }

    if (payout.status !== 'PENDING') {
      return NextResponse.json({ 
        error: 'Only pending payouts can be cancelled' 
      }, { status: 400 })
    }

    // Get seller balance
    const seller = await db.seller.findUnique({
      where: { id: sellerId },
      select: { availableBalance: true, pendingBalance: true, userId: true }
    })

    if (!seller) {
      return NextResponse.json({ error: 'Seller not found' }, { status: 404 })
    }

    // Refund to available balance
    const newAvailableBalance = (seller.availableBalance || 0) + payout.amount
    const newPendingBalance = (seller.pendingBalance || 0) - payout.amount

    await db.seller.update({
      where: { id: sellerId },
      data: {
        availableBalance: newAvailableBalance,
        pendingBalance: Math.max(0, newPendingBalance)
      }
    })

    // Update payout status
    await db.sellerPayout.update({
      where: { id: payoutId },
      data: {
        status: 'FAILED'
      }
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Payout cancelled successfully',
      refundedAmount: payout.amount,
      newBalance: {
        available: newAvailableBalance,
        pending: Math.max(0, newPendingBalance)
      }
    })
  } catch (error) {
    console.error('Payouts DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
