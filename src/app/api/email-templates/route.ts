// Email Templates API Route
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Default email templates
const DEFAULT_TEMPLATES = [
  {
    id: 'order-confirmation',
    name: 'Order Confirmation',
    type: 'order_confirmation',
    subject: 'Your Order #{{orderNumber}} has been confirmed!',
    body: `Dear {{customerName}},

Thank you for your order! Your order #{{orderNumber}} has been successfully placed.

Order Details:
{{#each items}}
- {{name}} x {{quantity}} @ {{price}}
{{/each}}

Subtotal: {{subtotal}}
Shipping: {{shippingFee}}
Total: {{total}}

Shipping Address:
{{shippingAddress}}

Estimated Delivery: {{estimatedDelivery}}

Thank you for shopping with LUMINVERA!

Best regards,
The LUMINVERA Team`,
    variables: ['customerName', 'orderNumber', 'items', 'subtotal', 'shippingFee', 'total', 'shippingAddress', 'estimatedDelivery'],
    isActive: true
  },
  {
    id: 'order-shipped',
    name: 'Order Shipped',
    type: 'shipping',
    subject: 'Your Order #{{orderNumber}} is on its way!',
    body: `Dear {{customerName}},

Great news! Your order #{{orderNumber}} has been shipped.

Tracking Number: {{trackingNumber}}
Courier: {{courierName}}
{{#if trackingUrl}}
Track your package: {{trackingUrl}}
{{/if}}

Estimated Delivery: {{estimatedDelivery}}

Items in this shipment:
{{#each items}}
- {{name}} x {{quantity}}
{{/each}}

Thank you for shopping with LUMINVERA!

Best regards,
The LUMINVERA Team`,
    variables: ['customerName', 'orderNumber', 'trackingNumber', 'courierName', 'trackingUrl', 'estimatedDelivery', 'items'],
    isActive: true
  },
  {
    id: 'order-delivered',
    name: 'Order Delivered',
    type: 'delivery',
    subject: 'Your Order #{{orderNumber}} has been delivered!',
    body: `Dear {{customerName}},

Your order #{{orderNumber}} has been delivered!

Delivered on: {{deliveredDate}}
Delivery Address: {{shippingAddress}}

We hope you enjoy your purchase! If you have a moment, please consider leaving a review for the products you received.

{{#each items}}
Review {{name}}: {{reviewLink}}
{{/each}}

Thank you for shopping with LUMINVERA!

Best regards,
The LUMINVERA Team`,
    variables: ['customerName', 'orderNumber', 'deliveredDate', 'shippingAddress', 'items', 'reviewLink'],
    isActive: true
  },
  {
    id: 'welcome',
    name: 'Welcome Email',
    type: 'welcome',
    subject: 'Welcome to LUMINVERA!',
    body: `Dear {{firstName}},

Welcome to LUMINVERA - Pakistan's Premier Multi-Vendor Marketplace!

We're thrilled to have you join our community. With LUMINVERA, you can:

🛒 Discover thousands of products from verified sellers
🚚 Enjoy fast and reliable delivery across Pakistan
💳 Pay your way with COD, JazzCash, EasyPaisa, and more
⭐ Shop with confidence with our buyer protection program

Get started:
1. Complete your profile: {{profileUrl}}
2. Browse our categories: {{categoriesUrl}}
3. Add items to your wishlist

Happy Shopping!

Best regards,
The LUMINVERA Team`,
    variables: ['firstName', 'profileUrl', 'categoriesUrl'],
    isActive: true
  },
  {
    id: 'password-reset',
    name: 'Password Reset',
    type: 'password_reset',
    subject: 'Reset Your LUMINVERA Password',
    body: `Dear {{firstName}},

We received a request to reset your password for your LUMINVERA account.

To reset your password, click the link below:
{{resetUrl}}

This link will expire in {{expiryTime}} minutes.

If you did not request this password reset, please ignore this email. Your password will remain unchanged.

For security reasons, we recommend:
- Using a strong, unique password
- Never sharing your password with others
- Enabling two-factor authentication when available

Best regards,
The LUMINVERA Team`,
    variables: ['firstName', 'resetUrl', 'expiryTime'],
    isActive: true
  },
  {
    id: 'seller-welcome',
    name: 'Seller Account Approved',
    type: 'seller_welcome',
    subject: 'Your Seller Account has been Approved!',
    body: `Dear {{storeName}},

Congratulations! Your seller account on LUMINVERA has been approved.

Your Store: {{storeName}}
Commission Rate: {{commissionRate}}%

You can now start listing products and selling to customers across Pakistan!

Get started:
1. Set up your store profile: {{storeSettingsUrl}}
2. Add your first product: {{addProductUrl}}
3. Configure payment methods: {{paymentSettingsUrl}}

Seller Tips:
- Upload high-quality product images
- Write detailed product descriptions
- Set competitive prices
- Respond to customer inquiries promptly

Welcome to the LUMINVERA seller community!

Best regards,
The LUMINVERA Team`,
    variables: ['storeName', 'commissionRate', 'storeSettingsUrl', 'addProductUrl', 'paymentSettingsUrl'],
    isActive: true
  },
  {
    id: 'refund-processed',
    name: 'Refund Processed',
    type: 'refund',
    subject: 'Your Refund for Order #{{orderNumber}} has been Processed',
    body: `Dear {{customerName}},

Your refund request for order #{{orderNumber}} has been processed.

Refund Details:
- Order Number: {{orderNumber}}
- Refund Amount: {{refundAmount}}
- Refund Method: {{refundMethod}}
- Processing Time: {{processingTime}}

The refund has been credited to your LUMINVERA wallet. You can use this balance for future purchases or request a withdrawal.

If you have any questions, please contact our support team.

Best regards,
The LUMINVERA Team`,
    variables: ['customerName', 'orderNumber', 'refundAmount', 'refundMethod', 'processingTime'],
    isActive: true
  },
  {
    id: 'marketing-promo',
    name: 'Marketing Promotion',
    type: 'marketing',
    subject: '{{subject}}',
    body: `Dear {{firstName}},

{{promoMessage}}

{{#if couponCode}}
Use code: {{couponCode}} for {{discountValue}} off!
Valid until: {{expiryDate}}
{{/if}}

Shop Now: {{shopUrl}}

Best regards,
The LUMINVERA Team`,
    variables: ['firstName', 'subject', 'promoMessage', 'couponCode', 'discountValue', 'expiryDate', 'shopUrl'],
    isActive: true
  }
]

// GET - List email templates
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const templateId = searchParams.get('id')

    // Get specific template by ID
    if (templateId) {
      // First check database
      const dbTemplate = await db.emailTemplate.findUnique({
        where: { id: templateId }
      })

      if (dbTemplate) {
        return NextResponse.json({ template: dbTemplate })
      }

      // Fall back to default template
      const defaultTemplate = DEFAULT_TEMPLATES.find(t => t.id === templateId)
      if (defaultTemplate) {
        return NextResponse.json({ template: defaultTemplate })
      }

      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    // Get templates from database
    const whereClause = type ? { type } : {}
    const dbTemplates = await db.emailTemplate.findMany({
      where: whereClause,
      orderBy: { createdAt: 'asc' }
    })

    // Merge default templates with database templates
    let templates = [...DEFAULT_TEMPLATES]

    if (dbTemplates && dbTemplates.length > 0) {
      // Override defaults with custom templates
      dbTemplates.forEach(custom => {
        const defaultIndex = templates.findIndex(t => t.id === custom.id || t.type === custom.type)
        if (defaultIndex >= 0) {
          templates[defaultIndex] = { 
            ...templates[defaultIndex], 
            id: custom.id,
            name: custom.name,
            type: custom.type,
            subject: custom.subject,
            body: custom.body,
            variables: custom.variables as string[],
            isActive: custom.isActive 
          }
        } else {
          templates.push({
            id: custom.id,
            name: custom.name,
            type: custom.type,
            subject: custom.subject,
            body: custom.body,
            variables: custom.variables as string[],
            isActive: custom.isActive
          })
        }
      })
    }

    // Filter by type if specified
    if (type) {
      templates = templates.filter(t => t.type === type)
    }

    return NextResponse.json({
      templates,
      defaultTemplates: DEFAULT_TEMPLATES.map(t => ({ id: t.id, name: t.name, type: t.type }))
    })
  } catch (error) {
    console.error('Email Templates GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create email template (admin only)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, type, subject, body: templateBody, variables, userId } = body

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 401 })
    }

    // Verify admin role
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { role: true }
    })

    if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 })
    }

    if (!name || !type || !subject || !templateBody) {
      return NextResponse.json({ error: 'Name, type, subject, and body are required' }, { status: 400 })
    }

    // Create template
    const template = await db.emailTemplate.create({
      data: {
        name,
        type,
        subject,
        body: templateBody,
        variables: variables || [],
        isActive: true
      }
    })

    return NextResponse.json({ success: true, template })
  } catch (error) {
    console.error('Email Templates POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - Update template
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, name, type, subject, body: templateBody, variables, isActive, userId } = body

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 401 })
    }

    // Verify admin role
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { role: true }
    })

    if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 })
    }

    if (!id) {
      return NextResponse.json({ error: 'Template ID required' }, { status: 400 })
    }

    // Check if template exists in database
    const existing = await db.emailTemplate.findUnique({
      where: { id }
    })

    let template
    if (existing) {
      // Update existing
      template = await db.emailTemplate.update({
        where: { id },
        data: {
          name,
          type,
          subject,
          body: templateBody,
          variables,
          isActive
        }
      })
    } else {
      // Create new as custom template
      template = await db.emailTemplate.create({
        data: {
          id,
          name: name || DEFAULT_TEMPLATES.find(t => t.id === id)?.name || 'Custom Template',
          type: type || DEFAULT_TEMPLATES.find(t => t.id === id)?.type || 'custom',
          subject: subject || DEFAULT_TEMPLATES.find(t => t.id === id)?.subject || '',
          body: templateBody || DEFAULT_TEMPLATES.find(t => t.id === id)?.body || '',
          variables: variables || [],
          isActive: isActive !== undefined ? isActive : true
        }
      })
    }

    return NextResponse.json({ success: true, template })
  } catch (error) {
    console.error('Email Templates PUT error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete template (admin only)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 401 })
    }

    // Verify admin role
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { role: true }
    })

    if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 })
    }

    if (!id) {
      return NextResponse.json({ error: 'Template ID required' }, { status: 400 })
    }

    // Check if it's a default template
    const isDefault = DEFAULT_TEMPLATES.some(t => t.id === id)
    if (isDefault) {
      // Reset to default by deleting custom version
      try {
        await db.emailTemplate.delete({ where: { id } })
      } catch {
        // Not found is OK
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Template reset to default' 
      })
    }

    // Delete custom template
    await db.emailTemplate.delete({ where: { id } })

    return NextResponse.json({ success: true, message: 'Template deleted' })
  } catch (error) {
    console.error('Email Templates DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
