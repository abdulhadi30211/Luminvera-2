// Payments API Route - Comprehensive Payment Management
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { PaymentStatus, NotificationType } from '@prisma/client'

// GET - Fetch payments
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const sellerId = searchParams.get('sellerId')
    const orderId = searchParams.get('orderId')
    const paymentId = searchParams.get('paymentId')
    const status = searchParams.get('status')
    const method = searchParams.get('method')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    // Get specific payment by ID
    if (paymentId) {
      const payment = await db.payment.findUnique({
        where: { id: paymentId },
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              total: true,
              status: true,
              paymentMethod: true,
              user: {
                select: {
                  id: true,
                  email: true,
                  firstName: true,
                  lastName: true,
                  phone: true
                }
              }
            }
          }
        }
      })

      if (!payment) {
        return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
      }

      return NextResponse.json({ payment })
    }

    // Get payments for a specific order
    if (orderId) {
      const payments = await db.payment.findMany({
        where: { orderId },
        orderBy: { createdAt: 'desc' }
      })

      return NextResponse.json({ payments })
    }

    // User view - fetch user's payments
    if (userId) {
      const where: any = {
        order: { userId }
      }
      
      if (status) {
        where.status = status as PaymentStatus
      }
      // Note: method filtering would need a raw query or different approach
      // since paymentMethod is on the order, not payment

      const [payments, count] = await Promise.all([
        db.payment.findMany({
          where,
          include: {
            order: {
              select: {
                id: true,
                orderNumber: true,
                status: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip: offset,
          take: limit
        }),
        db.payment.count({ where })
      ])

      return NextResponse.json({
        payments,
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil(count / limit)
        }
      })
    }

    // Seller view - fetch seller's order payments
    if (sellerId) {
      const where: any = {
        order: { sellerId }
      }

      const [payments, count] = await Promise.all([
        db.payment.findMany({
          where,
          include: {
            order: {
              select: {
                id: true,
                orderNumber: true,
                status: true,
                sellerId: true,
                user: {
                  select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    phone: true
                  }
                }
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip: offset,
          take: limit
        }),
        db.payment.count({ where })
      ])

      // Calculate summary
      const allPayments = await db.payment.findMany({
        where,
        select: { status: true, amount: true, paymentMethod: true }
      })

      const summary = {
        totalPayments: allPayments.length,
        completed: allPayments.filter(p => p.status === 'COMPLETED').reduce((sum, p) => sum + p.amount, 0),
        pending: allPayments.filter(p => p.status === 'PENDING').reduce((sum, p) => sum + p.amount, 0),
        processing: allPayments.filter(p => p.status === 'PROCESSING').reduce((sum, p) => sum + p.amount, 0),
        byMethod: {
          COD: allPayments.filter(p => p.paymentMethod === 'COD').reduce((sum, p) => sum + p.amount, 0),
          JAZZ_CASH: allPayments.filter(p => p.paymentMethod === 'JAZZ_CASH').reduce((sum, p) => sum + p.amount, 0),
          EASY_PAISA: allPayments.filter(p => p.paymentMethod === 'EASY_PAISA').reduce((sum, p) => sum + p.amount, 0),
          CARD: allPayments.filter(p => p.paymentMethod === 'CARD').reduce((sum, p) => sum + p.amount, 0),
          WALLET: allPayments.filter(p => p.paymentMethod === 'WALLET').reduce((sum, p) => sum + p.amount, 0),
          BANK_TRANSFER: allPayments.filter(p => p.paymentMethod === 'BANK_TRANSFER').reduce((sum, p) => sum + p.amount, 0)
        }
      }

      return NextResponse.json({
        payments,
        summary,
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil(count / limit)
        }
      })
    }

    // Admin view - fetch all payments
    const where: any = {}
    
    if (status) {
      where.status = status as PaymentStatus
    }
    if (method) {
      where.paymentMethod = method
    }

    const [payments, count] = await Promise.all([
      db.payment.findMany({
        where,
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              total: true,
              status: true,
              paymentMethod: true,
              user: {
                select: {
                  id: true,
                  email: true,
                  firstName: true,
                  lastName: true,
                  phone: true
                }
              },
              seller: {
                select: {
                  id: true,
                  storeName: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit
      }),
      db.payment.count({ where })
    ])

    // Calculate overall summary
    const allPayments = await db.payment.findMany({
      select: { status: true, amount: true, paymentMethod: true }
    })

    const summary = {
      totalPayments: allPayments.length,
      totalAmount: allPayments.reduce((sum, p) => sum + p.amount, 0),
      completed: allPayments.filter(p => p.status === 'COMPLETED').reduce((sum, p) => sum + p.amount, 0),
      pending: allPayments.filter(p => p.status === 'PENDING').reduce((sum, p) => sum + p.amount, 0),
      processing: allPayments.filter(p => p.status === 'PROCESSING').reduce((sum, p) => sum + p.amount, 0),
      refunded: allPayments.filter(p => p.status === 'REFUNDED').reduce((sum, p) => sum + p.amount, 0),
      byMethod: {
        COD: allPayments.filter(p => p.paymentMethod === 'COD').reduce((sum, p) => sum + p.amount, 0),
        JAZZ_CASH: allPayments.filter(p => p.paymentMethod === 'JAZZ_CASH').reduce((sum, p) => sum + p.amount, 0),
        EASY_PAISA: allPayments.filter(p => p.paymentMethod === 'EASY_PAISA').reduce((sum, p) => sum + p.amount, 0),
        CARD: allPayments.filter(p => p.paymentMethod === 'CARD').reduce((sum, p) => sum + p.amount, 0),
        WALLET: allPayments.filter(p => p.paymentMethod === 'WALLET').reduce((sum, p) => sum + p.amount, 0),
        BANK_TRANSFER: allPayments.filter(p => p.paymentMethod === 'BANK_TRANSFER').reduce((sum, p) => sum + p.amount, 0)
      }
    }

    return NextResponse.json({
      payments,
      summary,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    })
  } catch (error) {
    console.error('Payments GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Record new payment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      orderId,
      paymentMethod,
      amount,
      transactionId,
      gatewayReference,
      gatewayResponse,
      status = 'PENDING',
      initiatedBy // User ID who initiated the payment
    } = body

    // Validate required fields
    if (!orderId || !paymentMethod || !amount) {
      return NextResponse.json({
        error: 'Missing required fields: orderId, paymentMethod, amount'
      }, { status: 400 })
    }

    // Verify order exists
    const order = await db.order.findUnique({
      where: { id: orderId },
      select: { id: true, orderNumber: true, total: true, paymentStatus: true, paymentMethod: true, userId: true }
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Create payment record
    const payment = await db.payment.create({
      data: {
        orderId,
        paymentMethod: paymentMethod as any, // PaymentMethod enum
        amount,
        transactionId: transactionId || null,
        gatewayReference: gatewayReference || null,
        gatewayResponse: gatewayResponse ? JSON.stringify(gatewayResponse) : null,
        status: status as PaymentStatus,
        completedAt: status === 'COMPLETED' ? new Date() : null
      }
    })

    // Update order payment status if payment completed
    if (status === 'COMPLETED') {
      await db.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: 'COMPLETED' as PaymentStatus,
          paidAt: new Date(),
          paymentReference: transactionId || payment.id
        }
      })

      // If COD payment, mark as collected
      if (paymentMethod === 'COD') {
        await db.order.update({
          where: { id: orderId },
          data: {
            codCollected: true,
            codCollectedAt: new Date()
          }
        })
      }
    }

    // Create notification for user
    await db.notification.create({
      data: {
        userId: order.userId,
        type: NotificationType.PAYMENT,
        title: 'Payment Recorded',
        message: `Payment of PKR ${amount.toLocaleString()} recorded for order ${order.orderNumber}`,
        data: JSON.stringify({ orderId, paymentId: payment.id, status })
      }
    })

    return NextResponse.json({
      success: true,
      payment,
      message: 'Payment recorded successfully'
    })
  } catch (error) {
    console.error('Payments POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - Update payment status
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      paymentId,
      status,
      transactionId,
      gatewayReference,
      gatewayResponse,
      failureReason,
      refundAmount,
      refundReason,
      processedBy // Admin/Seller ID processing the update
    } = body

    if (!paymentId) {
      return NextResponse.json({ error: 'Payment ID is required' }, { status: 400 })
    }

    // Get current payment
    const currentPayment = await db.payment.findUnique({
      where: { id: paymentId },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            userId: true,
            sellerId: true,
            total: true,
            paymentStatus: true,
            paymentMethod: true
          }
        }
      }
    })

    if (!currentPayment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    // Prepare update data
    const updateData: any = {}

    if (status) {
      updateData.status = status as PaymentStatus
      
      if (status === 'COMPLETED') {
        updateData.completedAt = new Date()
      } else if (status === 'FAILED') {
        updateData.failedAt = new Date()
        if (failureReason) {
          updateData.failureReason = failureReason
        }
      }
    }

    if (transactionId) updateData.transactionId = transactionId
    if (gatewayReference) updateData.gatewayReference = gatewayReference
    if (gatewayResponse) updateData.gatewayResponse = JSON.stringify(gatewayResponse)

    // Update payment
    const updatedPayment = await db.payment.update({
      where: { id: paymentId },
      data: updateData
    })

    // Handle refund
    if (refundAmount && refundReason) {
      // Create refund record
      const refund = await db.refund.create({
        data: {
          orderId: currentPayment.orderId,
          amount: refundAmount,
          reason: refundReason,
          status: 'PENDING' as PaymentStatus,
          processedBy
        }
      })

      // Update user's refund wallet
      let refundWallet = await db.refundWallet.findUnique({
        where: { userId: currentPayment.order.userId }
      })

      if (refundWallet) {
        const newBalance = (refundWallet.balance || 0) + refundAmount
        await db.refundWallet.update({
          where: { userId: currentPayment.order.userId },
          data: { balance: newBalance }
        })

        // Record transaction
        await db.refundWalletTransaction.create({
          data: {
            refundWalletId: refundWallet.id,
            type: 'credit',
            amount: refundAmount,
            balanceAfter: newBalance,
            reference: refund.id,
            description: `Refund for order ${currentPayment.order.orderNumber}`
          }
        })
      } else {
        // Create refund wallet
        refundWallet = await db.refundWallet.create({
          data: {
            userId: currentPayment.order.userId,
            balance: refundAmount
          }
        })

        // Record transaction
        await db.refundWalletTransaction.create({
          data: {
            refundWalletId: refundWallet.id,
            type: 'credit',
            amount: refundAmount,
            balanceAfter: refundAmount,
            reference: refund.id,
            description: `Refund for order ${currentPayment.order.orderNumber}`
          }
        })
      }
    }

    // Update order payment status if needed
    if (status === 'COMPLETED') {
      await db.order.update({
        where: { id: currentPayment.orderId },
        data: {
          paymentStatus: 'COMPLETED' as PaymentStatus,
          paidAt: new Date()
        }
      })
    } else if (status === 'FAILED') {
      await db.order.update({
        where: { id: currentPayment.orderId },
        data: { paymentStatus: 'FAILED' as PaymentStatus }
      })
    } else if (status === 'REFUNDED') {
      await db.order.update({
        where: { id: currentPayment.orderId },
        data: { paymentStatus: 'REFUNDED' as PaymentStatus }
      })
    } else if (status === 'PARTIALLY_REFUNDED') {
      await db.order.update({
        where: { id: currentPayment.orderId },
        data: { paymentStatus: 'PARTIALLY_REFUNDED' as PaymentStatus }
      })
    }

    // Create notifications
    if (status) {
      await db.notification.create({
        data: {
          userId: currentPayment.order.userId,
          type: NotificationType.PAYMENT,
          title: `Payment ${status.toLowerCase().replace('_', ' ')}`,
          message: `Your payment for order ${currentPayment.order.orderNumber} has been ${status.toLowerCase().replace('_', ' ')}`,
          data: JSON.stringify({ paymentId, status, orderId: currentPayment.orderId })
        }
      })

      // Notify seller if exists
      if (currentPayment.order.sellerId) {
        const sellerUser = await db.seller.findUnique({
          where: { id: currentPayment.order.sellerId },
          select: { userId: true }
        })

        if (sellerUser) {
          await db.notification.create({
            data: {
              userId: sellerUser.userId,
              type: NotificationType.PAYMENT,
              title: 'Payment Update',
              message: `Payment for order ${currentPayment.order.orderNumber} has been ${status.toLowerCase().replace('_', ' ')}`,
              data: JSON.stringify({ paymentId, status, orderId: currentPayment.orderId })
            }
          })
        }
      }
    }

    return NextResponse.json({
      success: true,
      payment: updatedPayment,
      message: 'Payment updated successfully'
    })
  } catch (error) {
    console.error('Payments PUT error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Cancel payment (soft delete by updating status)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const paymentId = searchParams.get('paymentId')

    if (!paymentId) {
      return NextResponse.json({ error: 'Payment ID is required' }, { status: 400 })
    }

    // Get payment details
    const payment = await db.payment.findUnique({
      where: { id: paymentId },
      include: {
        order: {
          select: { id: true, orderNumber: true, userId: true }
        }
      }
    })

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    // Only allow cancellation of pending payments
    if (payment.status !== 'PENDING' && payment.status !== 'PROCESSING') {
      return NextResponse.json({
        error: 'Can only cancel pending or processing payments'
      }, { status: 400 })
    }

    // Update status to cancelled (using FAILED as cancelled)
    await db.payment.update({
      where: { id: paymentId },
      data: {
        status: 'FAILED' as PaymentStatus,
        failureReason: 'Payment cancelled',
        failedAt: new Date()
      }
    })

    // Update order payment status
    await db.order.update({
      where: { id: payment.orderId },
      data: { paymentStatus: 'FAILED' as PaymentStatus }
    })

    // Create notification
    await db.notification.create({
      data: {
        userId: payment.order.userId,
        type: NotificationType.PAYMENT,
        title: 'Payment Cancelled',
        message: `Payment for order ${payment.order.orderNumber} has been cancelled`,
        data: JSON.stringify({ paymentId, orderId: payment.orderId })
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Payment cancelled successfully'
    })
  } catch (error) {
    console.error('Payments DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
