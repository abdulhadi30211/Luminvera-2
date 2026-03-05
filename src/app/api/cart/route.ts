import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Helper to get auth user
async function getAuthUser(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value
  if (!token) return null
  
  const session = await db.session.findFirst({
    where: { isActive: true, expiresAt: { gt: new Date() } },
    include: { user: true }
  })
  
  return session?.user || null
}

// GET /api/cart - Get user's cart
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    let cart = await db.cart.findUnique({
      where: { userId: user.id },
      include: {
        items: {
          include: {
            product: {
              include: {
                seller: {
                  select: {
                    id: true,
                    storeName: true,
                    storeLogoUrl: true,
                  }
                }
              }
            },
            variant: true,
          }
        }
      }
    })

    if (!cart) {
      cart = await db.cart.create({
        data: {
          userId: user.id,
          subtotal: 0,
          discount: 0,
          deliveryFee: 0,
          tax: 0,
          total: 0,
        },
        include: {
          items: {
            include: {
              product: {
                include: {
                  seller: {
                    select: {
                      id: true,
                      storeName: true,
                      storeLogoUrl: true,
                    }
                  }
                }
              },
              variant: true,
            }
          }
        }
      })
    }

    return NextResponse.json({ success: true, data: cart })
  } catch (error) {
    console.error('Cart fetch error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch cart' }, { status: 500 })
  }
}

// POST /api/cart - Add item to cart
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { productId, variantId, quantity = 1 } = body

    // Get product
    const product = await db.product.findUnique({
      where: { id: productId },
      include: { seller: true }
    })

    if (!product || product.status !== 'LIVE') {
      return NextResponse.json({ success: false, error: 'Product not available' }, { status: 400 })
    }

    // Check stock
    let unitPrice = product.basePrice
    let availableStock = product.stockQuantity

    if (variantId) {
      const variant = await db.productVariant.findUnique({
        where: { id: variantId }
      })
      if (!variant || !variant.isActive) {
        return NextResponse.json({ success: false, error: 'Variant not available' }, { status: 400 })
      }
      unitPrice = product.basePrice + variant.priceAdjustment
      availableStock = variant.stockQuantity
    }

    if (product.trackInventory && availableStock < quantity) {
      return NextResponse.json({ success: false, error: 'Insufficient stock' }, { status: 400 })
    }

    // Get or create cart
    let cart = await db.cart.findUnique({
      where: { userId: user.id },
      include: { items: true }
    })

    if (!cart) {
      cart = await db.cart.create({
        data: {
          userId: user.id,
          subtotal: 0,
          discount: 0,
          deliveryFee: 0,
          tax: 0,
          total: 0,
        },
        include: { items: true }
      })
    }

    // Check if item already in cart
    const existingItem = cart.items.find(
      item => item.productId === productId && item.variantId === variantId
    )

    if (existingItem) {
      // Update quantity
      const newQuantity = existingItem.quantity + quantity
      await db.cartItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: newQuantity,
          totalPrice: newQuantity * unitPrice,
        }
      })
    } else {
      // Add new item
      await db.cartItem.create({
        data: {
          cartId: cart.id,
          productId,
          variantId,
          quantity,
          unitPrice,
          totalPrice: quantity * unitPrice,
          sellerId: product.sellerId,
        }
      })
    }

    // Recalculate cart totals
    const updatedCart = await db.cart.findUnique({
      where: { id: cart.id },
      include: { items: true }
    })

    if (updatedCart) {
      const subtotal = updatedCart.items.reduce((sum, item) => sum + item.totalPrice, 0)
      await db.cart.update({
        where: { id: cart.id },
        data: { subtotal, total: subtotal }
      })
    }

    return NextResponse.json({ success: true, message: 'Item added to cart' })
  } catch (error) {
    console.error('Add to cart error:', error)
    return NextResponse.json({ success: false, error: 'Failed to add to cart' }, { status: 500 })
  }
}

// PUT /api/cart - Update cart item quantity
export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { itemId, quantity } = body

    if (quantity <= 0) {
      // Remove item
      await db.cartItem.delete({ where: { id: itemId } })
    } else {
      const item = await db.cartItem.findUnique({
        where: { id: itemId },
        include: { product: true, variant: true }
      })

      if (!item) {
        return NextResponse.json({ success: false, error: 'Item not found' }, { status: 404 })
      }

      await db.cartItem.update({
        where: { id: itemId },
        data: {
          quantity,
          totalPrice: quantity * item.unitPrice,
        }
      })
    }

    // Recalculate totals
    const cart = await db.cart.findUnique({
      where: { userId: user.id },
      include: { items: true }
    })

    if (cart) {
      const subtotal = cart.items.reduce((sum, item) => sum + item.totalPrice, 0)
      await db.cart.update({
        where: { id: cart.id },
        data: { subtotal, total: subtotal }
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Update cart error:', error)
    return NextResponse.json({ success: false, error: 'Failed to update cart' }, { status: 500 })
  }
}

// DELETE /api/cart - Clear cart or remove item
export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const itemId = searchParams.get('itemId')

    if (itemId) {
      await db.cartItem.delete({ where: { id: itemId } })
    } else {
      const cart = await db.cart.findUnique({
        where: { userId: user.id }
      })
      if (cart) {
        await db.cartItem.deleteMany({ where: { cartId: cart.id } })
        await db.cart.update({
          where: { id: cart.id },
          data: { subtotal: 0, discount: 0, deliveryFee: 0, tax: 0, total: 0 }
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete cart error:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete' }, { status: 500 })
  }
}
