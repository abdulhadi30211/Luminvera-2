// Email Service - Send emails using SMTP settings from platform config
import { db } from '@/lib/db'

// Email configuration interface
interface EmailConfig {
  smtpHost: string
  smtpPort: number
  smtpUser: string
  smtpPassword: string
  fromEmail: string
  fromName: string
}

// Email options interface
interface EmailOptions {
  to: string | string[]
  subject: string
  html?: string
  text?: string
  replyTo?: string
  attachments?: Array<{
    filename: string
    content: Buffer | string
    contentType?: string
  }>
}

// Template variables interface
interface TemplateVariables {
  [key: string]: string | number | boolean | Array<Record<string, unknown>> | undefined
}

// Get email configuration from platform settings
async function getEmailConfig(): Promise<EmailConfig | null> {
  try {
    const settings = await db.platformConfig.findMany({
      where: {
        key: {
          in: ['smtp_host', 'smtp_port', 'smtp_user', 'smtp_password', 'from_email', 'from_name']
        }
      }
    })

    if (!settings || settings.length === 0) {
      console.error('No email config found')
      return null
    }

    const configMap: Record<string, string> = {}
    settings.forEach(s => {
      configMap[s.key] = s.value
    })

    // Check if we have minimum required config
    if (!configMap.smtp_host || !configMap.smtp_user) {
      return null
    }

    return {
      smtpHost: configMap.smtp_host || 'smtp.gmail.com',
      smtpPort: parseInt(configMap.smtp_port) || 587,
      smtpUser: configMap.smtp_user,
      smtpPassword: configMap.smtp_password || '',
      fromEmail: configMap.from_email || 'noreply@luminvera.pk',
      fromName: configMap.from_name || 'LUMINVERA'
    }
  } catch (error) {
    console.error('Error getting email config:', error)
    return null
  }
}

// Simple template rendering with variable substitution
export function renderTemplate(template: string, variables: TemplateVariables): string {
  let rendered = template

  // Handle {{#if condition}}...{{/if}} blocks
  rendered = rendered.replace(/\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (_, key, content) => {
    const value = variables[key]
    if (value) {
      return content.trim()
    }
    return ''
  })

  // Handle {{#each array}}...{{/each}} blocks
  rendered = rendered.replace(/\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g, (_, key, content) => {
    const items = variables[key] as Array<Record<string, unknown>> | undefined
    if (!Array.isArray(items) || items.length === 0) {
      return ''
    }

    return items.map(item => {
      let itemContent = content
      // Replace variables within the each block
      itemContent = itemContent.replace(/\{\{(\w+)\}\}/g, (match: string, prop: string) => {
        return String((item as Record<string, unknown>)[prop] ?? match)
      })
      return itemContent
    }).join('')
  })

  // Replace simple variables {{variable}}
  rendered = rendered.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const value = variables[key]
    if (value === undefined || value === null) {
      return ''
    }
    if (typeof value === 'boolean') {
      return value ? 'true' : ''
    }
    if (Array.isArray(value)) {
      return JSON.stringify(value)
    }
    return String(value)
  })

  return rendered.trim()
}

// Get template from database or default
async function getTemplate(type: string): Promise<{ subject: string; body: string } | null> {
  try {
    // Try to get from database first
    const dbTemplate = await db.emailTemplate.findFirst({
      where: {
        type,
        isActive: true
      }
    })

    if (dbTemplate) {
      return { subject: dbTemplate.subject, body: dbTemplate.body }
    }

    // Fall back to default templates
    const defaultTemplates: Record<string, { subject: string; body: string }> = {
      order_confirmation: {
        subject: 'Your Order #{{orderNumber}} has been confirmed!',
        body: `Dear {{customerName}},

Thank you for your order! Your order #{{orderNumber}} has been successfully placed.

Order Details:
{{orderItems}}

Subtotal: {{subtotal}}
Shipping: {{shippingFee}}
Total: {{total}}

Shipping Address:
{{shippingAddress}}

Estimated Delivery: {{estimatedDelivery}}

Thank you for shopping with LUMINVERA!

Best regards,
The LUMINVERA Team`
      },
      shipping: {
        subject: 'Your Order #{{orderNumber}} is on its way!',
        body: `Dear {{customerName}},

Great news! Your order #{{orderNumber}} has been shipped.

Tracking Number: {{trackingNumber}}
Courier: {{courierName}}
Tracking URL: {{trackingUrl}}

Estimated Delivery: {{estimatedDelivery}}

Thank you for shopping with LUMINVERA!

Best regards,
The LUMINVERA Team`
      },
      delivery: {
        subject: 'Your Order #{{orderNumber}} has been delivered!',
        body: `Dear {{customerName}},

Your order #{{orderNumber}} has been delivered!

We hope you enjoy your purchase. Please consider leaving a review for your products.

Thank you for shopping with LUMINVERA!

Best regards,
The LUMINVERA Team`
      },
      welcome: {
        subject: 'Welcome to LUMINVERA!',
        body: `Dear {{firstName}},

Welcome to LUMINVERA - Pakistan's Premier Multi-Vendor Marketplace!

We're thrilled to have you join our community.

Happy Shopping!

Best regards,
The LUMINVERA Team`
      },
      password_reset: {
        subject: 'Reset Your LUMINVERA Password',
        body: `Dear {{firstName}},

We received a request to reset your password.

To reset your password, click the link below:
{{resetUrl}}

This link will expire in {{expiryTime}} minutes.

If you did not request this, please ignore this email.

Best regards,
The LUMINVERA Team`
      },
      refund: {
        subject: 'Your Refund for Order #{{orderNumber}} has been Processed',
        body: `Dear {{customerName}},

Your refund request for order #{{orderNumber}} has been processed.

Refund Amount: {{refundAmount}}
Refund Method: {{refundMethod}}

Best regards,
The LUMINVERA Team`
      },
      seller_welcome: {
        subject: 'Your Seller Account has been Approved!',
        body: `Dear {{storeName}},

Congratulations! Your seller account on LUMINVERA has been approved.

Commission Rate: {{commissionRate}}%

You can now start listing products and selling to customers across Pakistan!

Best regards,
The LUMINVERA Team`
      },
      marketing: {
        subject: '{{subject}}',
        body: `Dear {{firstName}},

{{promoMessage}}

{{#if couponCode}}
Use code: {{couponCode}} for {{discountValue}} off!
{{/if}}

Best regards,
The LUMINVERA Team`
      }
    }

    return defaultTemplates[type] || null
  } catch (error) {
    console.error('Error getting template:', error)
    return null
  }
}

// Send email using fetch to an email API endpoint
// This is a simplified implementation that logs emails in development
// In production, you would integrate with a real email service (SendGrid, AWS SES, etc.)
export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const config = await getEmailConfig()

  // In development or without config, log the email
  if (!config || process.env.NODE_ENV === 'development') {
    console.log('='.repeat(50))
    console.log('EMAIL (Development Mode)')
    console.log('='.repeat(50))
    console.log('To:', Array.isArray(options.to) ? options.to.join(', ') : options.to)
    console.log('Subject:', options.subject)
    console.log('From:', config?.fromName ? `${config.fromName} <${config.fromEmail}>` : 'LUMINVERA <noreply@luminvera.pk>')
    console.log('-'.repeat(50))
    if (options.text) console.log('Text:', options.text)
    if (options.html) console.log('HTML:', options.html.substring(0, 500) + '...')
    console.log('='.repeat(50))

    // In development, simulate success
    return { 
      success: true, 
      messageId: `dev-${Date.now()}-${Math.random().toString(36).substring(7)}` 
    }
  }

  try {
    // For production, use nodemailer or an email API service
    // Here we'll use a simple approach with Resend API or similar
    
    // If using Resend API
    if (process.env.RESEND_API_KEY) {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `${config.fromName} <${config.fromEmail}>`,
          to: Array.isArray(options.to) ? options.to : [options.to],
          subject: options.subject,
          html: options.html,
          text: options.text,
          reply_to: options.replyTo,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        console.error('Resend API error:', data)
        return { success: false, error: data.message || 'Failed to send email' }
      }

      return { success: true, messageId: data.id }
    }

    // If using SendGrid API
    if (process.env.SENDGRID_API_KEY) {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{
            to: (Array.isArray(options.to) ? options.to : [options.to]).map(email => ({ email })),
          }],
          from: { email: config.fromEmail, name: config.fromName },
          subject: options.subject,
          content: [
            ...(options.text ? [{ type: 'text/plain', value: options.text }] : []),
            ...(options.html ? [{ type: 'text/html', value: options.html }] : []),
          ],
        }),
      })

      if (!response.ok) {
        const error = await response.text()
        console.error('SendGrid API error:', error)
        return { success: false, error: 'Failed to send email' }
      }

      return { success: true, messageId: response.headers.get('X-Message-Id') || undefined }
    }

    // Fallback: Use a custom email endpoint
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...options,
        config: {
          host: config.smtpHost,
          port: config.smtpPort,
          user: config.smtpUser,
          password: config.smtpPassword,
          from: `${config.fromName} <${config.fromEmail}>`,
        },
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to send email' }
    }

    return { success: true, messageId: data.messageId }
  } catch (error) {
    console.error('Send email error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to send email' 
    }
  }
}

// Send templated email
export async function sendTemplatedEmail(
  to: string | string[],
  templateType: string,
  variables: TemplateVariables,
  options?: { replyTo?: string }
): Promise<{ success: boolean; error?: string }> {
  try {
    const template = await getTemplate(templateType)

    if (!template) {
      console.error(`Template not found: ${templateType}`)
      return { success: false, error: 'Template not found' }
    }

    // Render subject and body
    const subject = renderTemplate(template.subject, variables)
    const text = renderTemplate(template.body, variables)
    
    // Create HTML version (simple conversion)
    const html = text
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')

    const result = await sendEmail({
      to,
      subject,
      text,
      html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">${html}</div>`,
      replyTo: options?.replyTo,
    })

    return result
  } catch (error) {
    console.error('Send templated email error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to send email' 
    }
  }
}

// Send order confirmation email
export async function sendOrderConfirmationEmail(
  email: string,
  orderData: {
    customerName: string
    orderNumber: string
    items: Array<{ name: string; quantity: number; price: string }>
    subtotal: string
    shippingFee: string
    total: string
    shippingAddress: string
    estimatedDelivery: string
  }
): Promise<{ success: boolean; error?: string }> {
  const itemsList = orderData.items
    .map(item => `- ${item.name} x ${item.quantity} @ ${item.price}`)
    .join('\n')

  return sendTemplatedEmail(email, 'order_confirmation', {
    customerName: orderData.customerName,
    orderNumber: orderData.orderNumber,
    orderItems: itemsList,
    subtotal: orderData.subtotal,
    shippingFee: orderData.shippingFee,
    total: orderData.total,
    shippingAddress: orderData.shippingAddress,
    estimatedDelivery: orderData.estimatedDelivery,
  })
}

// Send order shipped email
export async function sendOrderShippedEmail(
  email: string,
  orderData: {
    customerName: string
    orderNumber: string
    trackingNumber: string
    courierName: string
    trackingUrl?: string
    estimatedDelivery: string
  }
): Promise<{ success: boolean; error?: string }> {
  return sendTemplatedEmail(email, 'shipping', {
    customerName: orderData.customerName,
    orderNumber: orderData.orderNumber,
    trackingNumber: orderData.trackingNumber,
    courierName: orderData.courierName,
    trackingUrl: orderData.trackingUrl || '',
    estimatedDelivery: orderData.estimatedDelivery,
  })
}

// Send order delivered email
export async function sendOrderDeliveredEmail(
  email: string,
  orderData: {
    customerName: string
    orderNumber: string
  }
): Promise<{ success: boolean; error?: string }> {
  return sendTemplatedEmail(email, 'delivery', {
    customerName: orderData.customerName,
    orderNumber: orderData.orderNumber,
  })
}

// Send welcome email
export async function sendWelcomeEmail(
  email: string,
  userData: {
    firstName: string
    profileUrl?: string
    categoriesUrl?: string
  }
): Promise<{ success: boolean; error?: string }> {
  return sendTemplatedEmail(email, 'welcome', {
    firstName: userData.firstName,
    profileUrl: userData.profileUrl || '/dashboard',
    categoriesUrl: userData.categoriesUrl || '/products',
  })
}

// Send password reset email
export async function sendPasswordResetEmail(
  email: string,
  data: {
    firstName: string
    resetUrl: string
    expiryTime?: number
  }
): Promise<{ success: boolean; error?: string }> {
  return sendTemplatedEmail(email, 'password_reset', {
    firstName: data.firstName,
    resetUrl: data.resetUrl,
    expiryTime: data.expiryTime || 60,
  })
}

// Send refund processed email
export async function sendRefundEmail(
  email: string,
  data: {
    customerName: string
    orderNumber: string
    refundAmount: string
    refundMethod: string
  }
): Promise<{ success: boolean; error?: string }> {
  return sendTemplatedEmail(email, 'refund', {
    customerName: data.customerName,
    orderNumber: data.orderNumber,
    refundAmount: data.refundAmount,
    refundMethod: data.refundMethod,
  })
}

// Send seller welcome email
export async function sendSellerWelcomeEmail(
  email: string,
  data: {
    storeName: string
    commissionRate: number
  }
): Promise<{ success: boolean; error?: string }> {
  return sendTemplatedEmail(email, 'seller_welcome', {
    storeName: data.storeName,
    commissionRate: data.commissionRate,
    storeSettingsUrl: '/seller/settings',
    addProductUrl: '/seller/products?action=add',
    paymentSettingsUrl: '/seller/settings?tab=payment',
  })
}

// Send marketing email
export async function sendMarketingEmail(
  email: string,
  data: {
    firstName: string
    subject: string
    promoMessage: string
    couponCode?: string
    discountValue?: string
    expiryDate?: string
    shopUrl?: string
  }
): Promise<{ success: boolean; error?: string }> {
  return sendTemplatedEmail(email, 'marketing', {
    firstName: data.firstName,
    subject: data.subject,
    promoMessage: data.promoMessage,
    couponCode: data.couponCode,
    discountValue: data.discountValue,
    expiryDate: data.expiryDate,
    shopUrl: data.shopUrl || '/products',
  })
}

// Send notification email (generic)
export async function sendNotificationEmail(
  email: string,
  data: {
    subject: string
    title: string
    message: string
    actionUrl?: string
    actionText?: string
  }
): Promise<{ success: boolean; error?: string }> {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #10b981;">${data.title}</h2>
      <p>${data.message}</p>
      ${data.actionUrl ? `<a href="${data.actionUrl}" style="display: inline-block; padding: 12px 24px; background-color: #10b981; color: white; text-decoration: none; border-radius: 8px; margin-top: 16px;">${data.actionText || 'View Details'}</a>` : ''}
      <p style="margin-top: 24px; color: #666; font-size: 14px;">
        Best regards,<br>
        The LUMINVERA Team
      </p>
    </div>
  `

  const result = await sendEmail({
    to: email,
    subject: data.subject,
    html,
    text: `${data.title}\n\n${data.message}${data.actionUrl ? `\n\n${data.actionText || 'View Details'}: ${data.actionUrl}` : ''}\n\nBest regards,\nThe LUMINVERA Team`,
  })

  return result
}

export default {
  sendEmail,
  sendTemplatedEmail,
  sendOrderConfirmationEmail,
  sendOrderShippedEmail,
  sendOrderDeliveredEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendRefundEmail,
  sendSellerWelcomeEmail,
  sendMarketingEmail,
  sendNotificationEmail,
  renderTemplate,
}
