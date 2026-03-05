import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

// ============================================
// PLATFORM MANAGEMENT API
// Handles: Services, Features, Tools, Color Palettes
// ============================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const id = searchParams.get('id')
    const category = searchParams.get('category')
    const enabled = searchParams.get('enabled')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '50')

    const skip = (page - 1) * pageSize

    switch (type) {
      case 'services': {
        const where: Prisma.PlatformServiceWhereInput = {}
        if (category) where.category = category as any
        if (enabled !== null) where.isEnabled = enabled === 'true'
        if (search) {
          where.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
            { provider: { contains: search, mode: 'insensitive' } },
          ]
        }

        const [services, total] = await Promise.all([
          db.platformService.findMany({
            where,
            skip,
            take: pageSize,
            orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
          }),
          db.platformService.count({ where }),
        ])

        return NextResponse.json({
          success: true,
          data: services,
          pagination: {
            total,
            page,
            pageSize,
            totalPages: Math.ceil(total / pageSize),
          },
        })
      }

      case 'features': {
        const where: Prisma.PlatformFeatureWhereInput = {}
        if (enabled !== null) where.isEnabled = enabled === 'true'
        if (search) {
          where.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { key: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ]
        }

        const [features, total] = await Promise.all([
          db.platformFeature.findMany({
            where,
            skip,
            take: pageSize,
            orderBy: [{ category: 'asc' }, { name: 'asc' }],
          }),
          db.platformFeature.count({ where }),
        ])

        return NextResponse.json({
          success: true,
          data: features,
          pagination: {
            total,
            page,
            pageSize,
            totalPages: Math.ceil(total / pageSize),
          },
        })
      }

      case 'tools': {
        const where: Prisma.AdminToolWhereInput = {}
        if (category) where.category = category as any
        if (enabled !== null) where.isEnabled = enabled === 'true'
        if (search) {
          where.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { slug: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ]
        }

        const [tools, total] = await Promise.all([
          db.adminTool.findMany({
            where,
            skip,
            take: pageSize,
            orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
            include: {
              _count: { select: { executionLogs: true } },
            },
          }),
          db.adminTool.count({ where }),
        ])

        return NextResponse.json({
          success: true,
          data: tools,
          pagination: {
            total,
            page,
            pageSize,
            totalPages: Math.ceil(total / pageSize),
          },
        })
      }

      case 'palettes': {
        const [palettes, total] = await Promise.all([
          db.colorPalette.findMany({
            skip,
            take: pageSize,
            orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
          }),
          db.colorPalette.count(),
        ])

        return NextResponse.json({
          success: true,
          data: palettes,
          pagination: {
            total,
            page,
            pageSize,
            totalPages: Math.ceil(total / pageSize),
          },
        })
      }

      case 'active-palette': {
        const palette = await db.colorPalette.findFirst({
          where: { isActive: true },
        })
        return NextResponse.json({ success: true, data: palette })
      }

      case 'themes': {
        const themes = await db.themeSetting.findMany({
          orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
        })

        return NextResponse.json({
          success: true,
          data: themes,
        })
      }

      case 'stats': {
        const [
          servicesCount,
          featuresCount,
          toolsCount,
          palettesCount,
          activeServices,
          activeFeatures,
        ] = await Promise.all([
          db.platformService.count(),
          db.platformFeature.count(),
          db.adminTool.count(),
          db.colorPalette.count(),
          db.platformService.count({ where: { isEnabled: true } }),
          db.platformFeature.count({ where: { isEnabled: true } }),
        ])

        return NextResponse.json({
          success: true,
          data: {
            services: { total: servicesCount, active: activeServices },
            features: { total: featuresCount, active: activeFeatures },
            tools: { total: toolsCount },
            palettes: { total: palettesCount },
          },
        })
      }

      default:
        return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 })
    }
  } catch (error) {
    console.error('Platform GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch platform data' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, data } = body

    switch (type) {
      case 'service': {
        const service = await db.platformService.create({
          data: {
            name: data.name,
            slug: data.slug || data.name.toLowerCase().replace(/\s+/g, '-'),
            description: data.description,
            icon: data.icon,
            category: data.category,
            provider: data.provider,
            providerUrl: data.providerUrl,
            configSchema: data.configSchema ? JSON.stringify(data.configSchema) : null,
            config: data.config ? JSON.stringify(data.config) : null,
            status: data.status || 'ACTIVE',
            isEnabled: data.isEnabled ?? false,
            isPublic: data.isPublic ?? true,
            isPremium: data.isPremium ?? false,
            pricingModel: data.pricingModel,
            pricePerUnit: data.pricePerUnit,
            monthlyFee: data.monthlyFee,
            capabilities: data.capabilities ? JSON.stringify(data.capabilities) : null,
            apiVersion: data.apiVersion,
            apiEndpoint: data.apiEndpoint,
            apiKey: data.apiKey,
            apiSecret: data.apiSecret,
            integrationGuide: data.integrationGuide,
            webhookUrl: data.webhookUrl,
            supportedCountries: data.supportedCountries ? JSON.stringify(data.supportedCountries) : null,
            supportedCurrencies: data.supportedCurrencies ? JSON.stringify(data.supportedCurrencies) : null,
            notes: data.notes,
            sortOrder: data.sortOrder || 0,
          },
        })
        return NextResponse.json({ success: true, data: service })
      }

      case 'feature': {
        const feature = await db.platformFeature.create({
          data: {
            name: data.name,
            key: data.key || data.name.toLowerCase().replace(/\s+/g, '_'),
            description: data.description,
            icon: data.icon,
            type: data.type || 'TOGGLE',
            isEnabled: data.isEnabled ?? false,
            isPublic: data.isPublic ?? true,
            rolloutPercentage: data.rolloutPercentage || 0,
            targetRoles: data.targetRoles ? JSON.stringify(data.targetRoles) : null,
            targetPlans: data.targetPlans ? JSON.stringify(data.targetPlans) : null,
            targetRegions: data.targetRegions ? JSON.stringify(data.targetRegions) : null,
            targetUsers: data.targetUsers ? JSON.stringify(data.targetUsers) : null,
            scheduledStart: data.scheduledStart ? new Date(data.scheduledStart) : null,
            scheduledEnd: data.scheduledEnd ? new Date(data.scheduledEnd) : null,
            dependsOn: data.dependsOn ? JSON.stringify(data.dependsOn) : null,
            category: data.category,
            tags: data.tags ? JSON.stringify(data.tags) : null,
          },
        })
        return NextResponse.json({ success: true, data: feature })
      }

      case 'tool': {
        const tool = await db.adminTool.create({
          data: {
            name: data.name,
            slug: data.slug || data.name.toLowerCase().replace(/\s+/g, '-'),
            description: data.description,
            icon: data.icon,
            category: data.category,
            tags: data.tags ? JSON.stringify(data.tags) : null,
            executeEndpoint: data.executeEndpoint,
            executeMethod: data.executeMethod || 'POST',
            parameters: data.parameters ? JSON.stringify(data.parameters) : null,
            requiredRole: data.requiredRole || 'ADMIN',
            isEnabled: data.isEnabled ?? true,
            isDangerous: data.isDangerous ?? false,
            requiresConfirmation: data.requiresConfirmation ?? true,
            isSchedulable: data.isSchedulable ?? false,
            defaultSchedule: data.defaultSchedule,
            documentation: data.documentation,
            helpUrl: data.helpUrl,
            sortOrder: data.sortOrder || 0,
          },
        })
        return NextResponse.json({ success: true, data: tool })
      }

      case 'palette': {
        // If this is set as active, deactivate others
        if (data.isActive) {
          await db.colorPalette.updateMany({
            where: { isActive: true },
            data: { isActive: false },
          })
        }

        const palette = await db.colorPalette.create({
          data: {
            name: data.name,
            slug: data.slug || data.name.toLowerCase().replace(/\s+/g, '-'),
            description: data.description,
            primary: data.primary || '#10b981',
            primaryForeground: data.primaryForeground || '#ffffff',
            primaryHover: data.primaryHover || '#059669',
            secondary: data.secondary || '#6b7280',
            secondaryForeground: data.secondaryForeground || '#ffffff',
            background: data.background || '#ffffff',
            foreground: data.foreground || '#0f172a',
            card: data.card || '#ffffff',
            cardForeground: data.cardForeground || '#0f172a',
            accent: data.accent || '#f59e0b',
            accentForeground: data.accentForeground || '#ffffff',
            success: data.success || '#10b981',
            successForeground: data.successForeground || '#ffffff',
            warning: data.warning || '#f59e0b',
            warningForeground: data.warningForeground || '#ffffff',
            error: data.error || '#ef4444',
            errorForeground: data.errorForeground || '#ffffff',
            info: data.info || '#3b82f6',
            infoForeground: data.infoForeground || '#ffffff',
            muted: data.muted || '#f1f5f9',
            mutedForeground: data.mutedForeground || '#64748b',
            border: data.border || '#e2e8f0',
            input: data.input || '#e2e8f0',
            ring: data.ring || '#10b981',
            gradientFrom: data.gradientFrom || '#10b981',
            gradientVia: data.gradientVia || '#14b8a6',
            gradientTo: data.gradientTo || '#06b6d4',
            sidebarBackground: data.sidebarBackground || '#0f172a',
            sidebarForeground: data.sidebarForeground || '#f8fafc',
            sidebarAccent: data.sidebarAccent || '#1e293b',
            customColors: data.customColors ? JSON.stringify(data.customColors) : null,
            darkBackground: data.darkBackground || '#0f172a',
            darkForeground: data.darkForeground || '#f8fafc',
            darkCard: data.darkCard || '#1e293b',
            darkCardForeground: data.darkCardForeground || '#f8fafc',
            darkMuted: data.darkMuted || '#334155',
            darkMutedForeground: data.darkMutedForeground || '#94a3b8',
            darkBorder: data.darkBorder || '#334155',
            isActive: data.isActive ?? false,
            isDefault: data.isDefault ?? false,
            isPublic: data.isPublic ?? true,
            tags: data.tags ? JSON.stringify(data.tags) : null,
          },
        })
        return NextResponse.json({ success: true, data: palette })
      }

      case 'seed': {
        // Seed 100+ services, features, and tools
        const result = await seedPlatformData()
        return NextResponse.json({ success: true, data: result })
      }

      default:
        return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 })
    }
  } catch (error) {
    console.error('Platform POST error:', error)
    return NextResponse.json(
      { error: 'Failed to create platform data' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, id, data } = body

    switch (type) {
      case 'service': {
        const service = await db.platformService.update({
          where: { id },
          data: {
            name: data.name,
            description: data.description,
            icon: data.icon,
            category: data.category,
            provider: data.provider,
            providerUrl: data.providerUrl,
            status: data.status,
            isEnabled: data.isEnabled,
            isPublic: data.isPublic,
            isPremium: data.isPremium,
            pricingModel: data.pricingModel,
            pricePerUnit: data.pricePerUnit,
            monthlyFee: data.monthlyFee,
            apiVersion: data.apiVersion,
            apiEndpoint: data.apiEndpoint,
            apiKey: data.apiKey,
            apiSecret: data.apiSecret,
            notes: data.notes,
            sortOrder: data.sortOrder,
          },
        })
        return NextResponse.json({ success: true, data: service })
      }

      case 'feature': {
        const feature = await db.platformFeature.update({
          where: { id },
          data: {
            name: data.name,
            description: data.description,
            icon: data.icon,
            type: data.type,
            isEnabled: data.isEnabled,
            isPublic: data.isPublic,
            rolloutPercentage: data.rolloutPercentage,
            targetRoles: data.targetRoles ? JSON.stringify(data.targetRoles) : undefined,
            targetPlans: data.targetPlans ? JSON.stringify(data.targetPlans) : undefined,
            scheduledStart: data.scheduledStart ? new Date(data.scheduledStart) : null,
            scheduledEnd: data.scheduledEnd ? new Date(data.scheduledEnd) : null,
            category: data.category,
          },
        })
        return NextResponse.json({ success: true, data: feature })
      }

      case 'tool': {
        const tool = await db.adminTool.update({
          where: { id },
          data: {
            name: data.name,
            description: data.description,
            icon: data.icon,
            category: data.category,
            isEnabled: data.isEnabled,
            isDangerous: data.isDangerous,
            requiresConfirmation: data.requiresConfirmation,
            documentation: data.documentation,
            sortOrder: data.sortOrder,
          },
        })
        return NextResponse.json({ success: true, data: tool })
      }

      case 'palette': {
        // If this is set as active, deactivate others
        if (data.isActive) {
          await db.colorPalette.updateMany({
            where: { isActive: true, id: { not: id } },
            data: { isActive: false },
          })
        }

        const palette = await db.colorPalette.update({
          where: { id },
          data: {
            name: data.name,
            description: data.description,
            primary: data.primary,
            primaryForeground: data.primaryForeground,
            primaryHover: data.primaryHover,
            secondary: data.secondary,
            secondaryForeground: data.secondaryForeground,
            background: data.background,
            foreground: data.foreground,
            card: data.card,
            cardForeground: data.cardForeground,
            accent: data.accent,
            accentForeground: data.accentForeground,
            success: data.success,
            successForeground: data.successForeground,
            warning: data.warning,
            warningForeground: data.warningForeground,
            error: data.error,
            errorForeground: data.errorForeground,
            info: data.info,
            infoForeground: data.infoForeground,
            muted: data.muted,
            mutedForeground: data.mutedForeground,
            border: data.border,
            input: data.input,
            ring: data.ring,
            gradientFrom: data.gradientFrom,
            gradientVia: data.gradientVia,
            gradientTo: data.gradientTo,
            sidebarBackground: data.sidebarBackground,
            sidebarForeground: data.sidebarForeground,
            sidebarAccent: data.sidebarAccent,
            customColors: data.customColors ? JSON.stringify(data.customColors) : undefined,
            darkBackground: data.darkBackground,
            darkForeground: data.darkForeground,
            darkCard: data.darkCard,
            darkCardForeground: data.darkCardForeground,
            darkMuted: data.darkMuted,
            darkMutedForeground: data.darkMutedForeground,
            darkBorder: data.darkBorder,
            isActive: data.isActive,
            isDefault: data.isDefault,
            isPublic: data.isPublic,
          },
        })
        return NextResponse.json({ success: true, data: palette })
      }

      case 'activate-palette': {
        // Deactivate all palettes first
        await db.colorPalette.updateMany({
          data: { isActive: false },
        })

        // Activate the selected palette
        const palette = await db.colorPalette.update({
          where: { id },
          data: { isActive: true },
        })
        return NextResponse.json({ success: true, data: palette })
      }

      case 'toggle-feature': {
        const feature = await db.platformFeature.update({
          where: { id },
          data: { isEnabled: data.isEnabled },
        })
        return NextResponse.json({ success: true, data: feature })
      }

      case 'toggle-service': {
        const service = await db.platformService.update({
          where: { id },
          data: { isEnabled: data.isEnabled },
        })
        return NextResponse.json({ success: true, data: service })
      }

      default:
        return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 })
    }
  } catch (error) {
    console.error('Platform PUT error:', error)
    return NextResponse.json(
      { error: 'Failed to update platform data' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    switch (type) {
      case 'service': {
        await db.platformService.delete({ where: { id } })
        return NextResponse.json({ success: true })
      }

      case 'feature': {
        await db.platformFeature.delete({ where: { id } })
        return NextResponse.json({ success: true })
      }

      case 'tool': {
        await db.adminTool.delete({ where: { id } })
        return NextResponse.json({ success: true })
      }

      case 'palette': {
        const palette = await db.colorPalette.findUnique({ where: { id } })
        if (palette?.isDefault) {
          return NextResponse.json(
            { error: 'Cannot delete default palette' },
            { status: 400 }
          )
        }
        await db.colorPalette.delete({ where: { id } })
        return NextResponse.json({ success: true })
      }

      default:
        return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 })
    }
  } catch (error) {
    console.error('Platform DELETE error:', error)
    return NextResponse.json(
      { error: 'Failed to delete platform data' },
      { status: 500 }
    )
  }
}

// ============================================
// SEED DATA FUNCTION
// ============================================

async function seedPlatformData() {
  const services: any[] = []
  const features: any[] = []
  const tools: any[] = []

  // ========== SERVICES (100+ services) ==========

  // Payment Services (15)
  const paymentServices = [
    { name: 'JazzCash', slug: 'jazzcash', category: 'PAYMENT', provider: 'JazzCash', isEnabled: true },
    { name: 'EasyPaisa', slug: 'easypaisa', category: 'PAYMENT', provider: 'Telenor', isEnabled: true },
    { name: 'Raast', slug: 'raast', category: 'PAYMENT', provider: 'State Bank of Pakistan', isEnabled: true },
    { name: 'HBL Payment Gateway', slug: 'hbl-payment', category: 'PAYMENT', provider: 'HBL', isEnabled: false },
    { name: 'UBL Payment Gateway', slug: 'ubl-payment', category: 'PAYMENT', provider: 'UBL', isEnabled: false },
    { name: 'Bank Alfalah Payment', slug: 'alfalah-payment', category: 'PAYMENT', provider: 'Bank Alfalah', isEnabled: false },
    { name: 'Meezan Bank Payment', slug: 'meezan-payment', category: 'PAYMENT', provider: 'Meezan Bank', isEnabled: false },
    { name: 'Stripe Integration', slug: 'stripe', category: 'PAYMENT', provider: 'Stripe', isEnabled: false },
    { name: 'PayPal Integration', slug: 'paypal', category: 'PAYMENT', provider: 'PayPal', isEnabled: false },
    { name: 'Payoneer', slug: 'payoneer', category: 'PAYMENT', provider: 'Payoneer', isEnabled: false },
    { name: '2Checkout', slug: '2checkout', category: 'PAYMENT', provider: '2Checkout', isEnabled: false },
    { name: 'SadaPay Business', slug: 'sadapay', category: 'PAYMENT', provider: 'SadaPay', isEnabled: true },
    { name: 'NayaPay', slug: 'nayapay', category: 'PAYMENT', provider: 'NayaPay', isEnabled: true },
    { name: 'Keenu Wallet', slug: 'keenu', category: 'PAYMENT', provider: 'Keenu', isEnabled: false },
    { name: 'UPaisa', slug: 'upaisa', category: 'PAYMENT', provider: 'U Microfinance', isEnabled: false },
  ]

  // Shipping Services (15)
  const shippingServices = [
    { name: 'Leopards Courier', slug: 'leopards', category: 'SHIPPING', provider: 'Leopards', isEnabled: true },
    { name: 'TCS Express', slug: 'tcs', category: 'SHIPPING', provider: 'TCS', isEnabled: true },
    { name: 'M&P Express', slug: 'mnp', category: 'SHIPPING', provider: 'M&P', isEnabled: true },
    { name: 'Daewoo Express', slug: 'daewoo', category: 'SHIPPING', provider: 'Daewoo', isEnabled: true },
    { name: 'Pakistan Post', slug: 'pakpost', category: 'SHIPPING', provider: 'Pakistan Post', isEnabled: true },
    { name: 'Call Courier', slug: 'callcourier', category: 'SHIPPING', provider: 'Call Courier', isEnabled: true },
    { name: 'BlueEx', slug: 'blueex', category: 'SHIPPING', provider: 'BlueEx', isEnabled: true },
    { name: 'DHL Pakistan', slug: 'dhl', category: 'SHIPPING', provider: 'DHL', isEnabled: false },
    { name: 'FedEx Pakistan', slug: 'fedex', category: 'SHIPPING', provider: 'FedEx', isEnabled: false },
    { name: 'UPS Pakistan', slug: 'ups', category: 'SHIPPING', provider: 'UPS', isEnabled: false },
    { name: 'Bykea Delivery', slug: 'bykea', category: 'SHIPPING', provider: 'Bykea', isEnabled: true },
    { name: 'Careem Box', slug: 'careem-box', category: 'SHIPPING', provider: 'Careem', isEnabled: false },
    { name: 'PostEx', slug: 'postex', category: 'SHIPPING', provider: 'PostEx', isEnabled: true },
    { name: 'Trax', slug: 'trax', category: 'SHIPPING', provider: 'Trax', isEnabled: true },
    { name: 'Cheetay Logistics', slug: 'cheetay', category: 'SHIPPING', provider: 'Cheetay', isEnabled: false },
  ]

  // Communication Services (10)
  const communicationServices = [
    { name: 'Twilio SMS', slug: 'twilio-sms', category: 'COMMUNICATION', provider: 'Twilio', isEnabled: true },
    { name: 'SendGrid Email', slug: 'sendgrid', category: 'COMMUNICATION', provider: 'SendGrid', isEnabled: true },
    { name: 'Firebase Cloud Messaging', slug: 'fcm', category: 'COMMUNICATION', provider: 'Google', isEnabled: true },
    { name: 'WhatsApp Business API', slug: 'whatsapp', category: 'COMMUNICATION', provider: 'Meta', isEnabled: true },
    { name: 'SMS.to', slug: 'sms-to', category: 'COMMUNICATION', provider: 'SMS.to', isEnabled: false },
    { name: 'Mailgun', slug: 'mailgun', category: 'COMMUNICATION', provider: 'Mailgun', isEnabled: false },
    { name: 'Amazon SES', slug: 'amazon-ses', category: 'COMMUNICATION', provider: 'AWS', isEnabled: false },
    { name: 'MSG91', slug: 'msg91', category: 'COMMUNICATION', provider: 'MSG91', isEnabled: false },
    { name: 'Infobip', slug: 'infobip', category: 'COMMUNICATION', provider: 'Infobip', isEnabled: false },
    { name: 'Plivo', slug: 'plivo', category: 'COMMUNICATION', provider: 'Plivo', isEnabled: false },
  ]

  // Analytics Services (10)
  const analyticsServices = [
    { name: 'Google Analytics', slug: 'google-analytics', category: 'ANALYTICS', provider: 'Google', isEnabled: true },
    { name: 'Mixpanel', slug: 'mixpanel', category: 'ANALYTICS', provider: 'Mixpanel', isEnabled: false },
    { name: 'Amplitude', slug: 'amplitude', category: 'ANALYTICS', provider: 'Amplitude', isEnabled: false },
    { name: 'Hotjar', slug: 'hotjar', category: 'ANALYTICS', provider: 'Hotjar', isEnabled: true },
    { name: 'Crazy Egg', slug: 'crazyegg', category: 'ANALYTICS', provider: 'Crazy Egg', isEnabled: false },
    { name: 'Heap Analytics', slug: 'heap', category: 'ANALYTICS', provider: 'Heap', isEnabled: false },
    { name: 'Segment', slug: 'segment', category: 'ANALYTICS', provider: 'Segment', isEnabled: false },
    { name: 'PostHog', slug: 'posthog', category: 'ANALYTICS', provider: 'PostHog', isEnabled: false },
    { name: 'Matomo', slug: 'matomo', category: 'ANALYTICS', provider: 'Matomo', isEnabled: false },
    { name: 'Plausible', slug: 'plausible', category: 'ANALYTICS', provider: 'Plausible', isEnabled: false },
  ]

  // Security Services (10)
  const securityServices = [
    { name: 'Cloudflare WAF', slug: 'cloudflare-waf', category: 'SECURITY', provider: 'Cloudflare', isEnabled: true },
    { name: 'reCAPTCHA v3', slug: 'recaptcha', category: 'SECURITY', provider: 'Google', isEnabled: true },
    { name: 'hCaptcha', slug: 'hcaptcha', category: 'SECURITY', provider: 'hCaptcha', isEnabled: false },
    { name: 'AWS WAF', slug: 'aws-waf', category: 'SECURITY', provider: 'AWS', isEnabled: false },
    { name: 'Imperva', slug: 'imperva', category: 'SECURITY', provider: 'Imperva', isEnabled: false },
    { name: 'Akamai Security', slug: 'akamai', category: 'SECURITY', provider: 'Akamai', isEnabled: false },
    { name: 'Sucuri', slug: 'sucuri', category: 'SECURITY', provider: 'Sucuri', isEnabled: false },
    { name: 'Wordfence', slug: 'wordfence', category: 'SECURITY', provider: 'Wordfence', isEnabled: false },
    { name: 'SSL Labs', slug: 'ssllabs', category: 'SECURITY', provider: 'SSL Labs', isEnabled: true },
    { name: 'VirusTotal', slug: 'virustotal', category: 'SECURITY', provider: 'Google', isEnabled: false },
  ]

  // AI/ML Services (10)
  const aiServices = [
    { name: 'OpenAI GPT-4', slug: 'openai-gpt4', category: 'AI_ML', provider: 'OpenAI', isEnabled: true, isPremium: true },
    { name: 'Google Gemini', slug: 'google-gemini', category: 'AI_ML', provider: 'Google', isEnabled: true },
    { name: 'Claude AI', slug: 'claude', category: 'AI_ML', provider: 'Anthropic', isEnabled: true },
    { name: 'Azure OpenAI', slug: 'azure-openai', category: 'AI_ML', provider: 'Microsoft', isEnabled: false },
    { name: 'AWS SageMaker', slug: 'sagemaker', category: 'AI_ML', provider: 'AWS', isEnabled: false },
    { name: 'Google Vision AI', slug: 'google-vision', category: 'AI_ML', provider: 'Google', isEnabled: true },
    { name: 'Amazon Rekognition', slug: 'rekognition', category: 'AI_ML', provider: 'AWS', isEnabled: false },
    { name: 'Hugging Face', slug: 'huggingface', category: 'AI_ML', provider: 'Hugging Face', isEnabled: false },
    { name: 'Stability AI', slug: 'stability', category: 'AI_ML', provider: 'Stability AI', isEnabled: false },
    { name: 'Replicate', slug: 'replicate', category: 'AI_ML', provider: 'Replicate', isEnabled: false },
  ]

  // Marketing Services (10)
  const marketingServices = [
    { name: 'Facebook Ads', slug: 'facebook-ads', category: 'MARKETING', provider: 'Meta', isEnabled: true },
    { name: 'Google Ads', slug: 'google-ads', category: 'MARKETING', provider: 'Google', isEnabled: true },
    { name: 'TikTok Ads', slug: 'tiktok-ads', category: 'MARKETING', provider: 'TikTok', isEnabled: true },
    { name: 'Mailchimp', slug: 'mailchimp', category: 'MARKETING', provider: 'Mailchimp', isEnabled: true },
    { name: 'HubSpot', slug: 'hubspot', category: 'MARKETING', provider: 'HubSpot', isEnabled: false },
    { name: 'Klaviyo', slug: 'klaviyo', category: 'MARKETING', provider: 'Klaviyo', isEnabled: false },
    { name: 'Braze', slug: 'braze', category: 'MARKETING', provider: 'Braze', isEnabled: false },
    { name: 'Iterable', slug: 'iterable', category: 'MARKETING', provider: 'Iterable', isEnabled: false },
    { name: 'Customer.io', slug: 'customerio', category: 'MARKETING', provider: 'Customer.io', isEnabled: false },
    { name: 'ActiveCampaign', slug: 'activecampaign', category: 'MARKETING', provider: 'ActiveCampaign', isEnabled: false },
  ]

  // Storage Services (8)
  const storageServices = [
    { name: 'AWS S3', slug: 'aws-s3', category: 'STORAGE', provider: 'AWS', isEnabled: true },
    { name: 'Google Cloud Storage', slug: 'gcs', category: 'STORAGE', provider: 'Google', isEnabled: true },
    { name: 'Azure Blob Storage', slug: 'azure-blob', category: 'STORAGE', provider: 'Microsoft', isEnabled: false },
    { name: 'Cloudflare R2', slug: 'cloudflare-r2', category: 'STORAGE', provider: 'Cloudflare', isEnabled: true },
    { name: 'Backblaze B2', slug: 'backblaze', category: 'STORAGE', provider: 'Backblaze', isEnabled: false },
    { name: 'DigitalOcean Spaces', slug: 'do-spaces', category: 'STORAGE', provider: 'DigitalOcean', isEnabled: false },
    { name: 'Wasabi', slug: 'wasabi', category: 'STORAGE', provider: 'Wasabi', isEnabled: false },
    { name: 'MinIO', slug: 'minio', category: 'STORAGE', provider: 'MinIO', isEnabled: false },
  ]

  // Verification Services (6)
  const verificationServices = [
    { name: 'NADRA Verisys', slug: 'nadra-verisys', category: 'VERIFICATION', provider: 'NADRA', isEnabled: true },
    { name: 'Onfido', slug: 'onfido', category: 'VERIFICATION', provider: 'Onfido', isEnabled: false },
    { name: 'Jumio', slug: 'jumio', category: 'VERIFICATION', provider: 'Jumio', isEnabled: false },
    { name: 'Trulioo', slug: 'trulioo', category: 'VERIFICATION', provider: 'Trulioo', isEnabled: false },
    { name: 'IDenfy', slug: 'idenfy', category: 'VERIFICATION', provider: 'IDenfy', isEnabled: false },
    { name: 'Sumsub', slug: 'sumsub', category: 'VERIFICATION', provider: 'Sumsub', isEnabled: false },
  ]

  // Notification Services (6)
  const notificationServices = [
    { name: 'Pusher', slug: 'pusher', category: 'NOTIFICATION', provider: 'Pusher', isEnabled: true },
    { name: 'OneSignal', slug: 'onesignal', category: 'NOTIFICATION', provider: 'OneSignal', isEnabled: true },
    { name: 'Pushwoosh', slug: 'pushwoosh', category: 'NOTIFICATION', provider: 'Pushwoosh', isEnabled: false },
    { name: 'Airship', slug: 'airship', category: 'NOTIFICATION', provider: 'Airship', isEnabled: false },
    { name: 'CleverTap', slug: 'clevertap', category: 'NOTIFICATION', provider: 'CleverTap', isEnabled: false },
    { name: 'MoEngage', slug: 'moengage', category: 'NOTIFICATION', provider: 'MoEngage', isEnabled: false },
  ]

  // Social Services (6)
  const socialServices = [
    { name: 'Facebook Login', slug: 'facebook-login', category: 'SOCIAL', provider: 'Meta', isEnabled: true },
    { name: 'Google Login', slug: 'google-login', category: 'SOCIAL', provider: 'Google', isEnabled: true },
    { name: 'Apple Login', slug: 'apple-login', category: 'SOCIAL', provider: 'Apple', isEnabled: false },
    { name: 'Twitter Login', slug: 'twitter-login', category: 'SOCIAL', provider: 'Twitter', isEnabled: false },
    { name: 'LinkedIn Login', slug: 'linkedin-login', category: 'SOCIAL', provider: 'LinkedIn', isEnabled: false },
    { name: 'Instagram Graph API', slug: 'instagram', category: 'SOCIAL', provider: 'Meta', isEnabled: true },
  ]

  // Search Services (5)
  const searchServices = [
    { name: 'Algolia', slug: 'algolia', category: 'SEARCH', provider: 'Algolia', isEnabled: true },
    { name: 'Elasticsearch', slug: 'elasticsearch', category: 'SEARCH', provider: 'Elastic', isEnabled: false },
    { name: 'Meilisearch', slug: 'meilisearch', category: 'SEARCH', provider: 'Meilisearch', isEnabled: false },
    { name: 'Typesense', slug: 'typesense', category: 'SEARCH', provider: 'Typesense', isEnabled: false },
    { name: 'Solr', slug: 'solr', category: 'SEARCH', provider: 'Apache', isEnabled: false },
  ]

  // CDN Services (4)
  const cdnServices = [
    { name: 'Cloudflare CDN', slug: 'cloudflare-cdn', category: 'CDN', provider: 'Cloudflare', isEnabled: true },
    { name: 'AWS CloudFront', slug: 'cloudfront', category: 'CDN', provider: 'AWS', isEnabled: false },
    { name: 'Fastly', slug: 'fastly', category: 'CDN', provider: 'Fastly', isEnabled: false },
    { name: 'KeyCDN', slug: 'keycdn', category: 'CDN', provider: 'KeyCDN', isEnabled: false },
  ]

  // Fraud Detection Services (4)
  const fraudServices = [
    { name: 'Stripe Radar', slug: 'stripe-radar', category: 'FRAUD_DETECTION', provider: 'Stripe', isEnabled: false },
    { name: 'Sift', slug: 'sift', category: 'FRAUD_DETECTION', provider: 'Sift', isEnabled: false },
    { name: 'Riskified', slug: 'riskified', category: 'FRAUD_DETECTION', provider: 'Riskified', isEnabled: false },
    { name: 'Signifyd', slug: 'signifyd', category: 'FRAUD_DETECTION', provider: 'Signifyd', isEnabled: false },
  ]

  // Loyalty Services (3)
  const loyaltyServices = [
    { name: 'Antavo', slug: 'antavo', category: 'LOYALTY', provider: 'Antavo', isEnabled: false },
    { name: 'Yotpo', slug: 'yotpo', category: 'LOYALTY', provider: 'Yotpo', isEnabled: false },
    { name: 'Smile.io', slug: 'smile', category: 'LOYALTY', provider: 'Smile.io', isEnabled: false },
  ]

  // Cache Services (3)
  const cacheServices = [
    { name: 'Redis Cloud', slug: 'redis', category: 'CACHE', provider: 'Redis', isEnabled: true },
    { name: 'Memcached', slug: 'memcached', category: 'CACHE', provider: 'Memcached', isEnabled: false },
    { name: 'Varnish', slug: 'varnish', category: 'CACHE', provider: 'Varnish', isEnabled: false },
  ]

  // Support Services (3)
  const supportServices = [
    { name: 'Zendesk', slug: 'zendesk', category: 'SUPPORT', provider: 'Zendesk', isEnabled: false },
    { name: 'Intercom', slug: 'intercom', category: 'SUPPORT', provider: 'Intercom', isEnabled: true },
    { name: 'Freshdesk', slug: 'freshdesk', category: 'SUPPORT', provider: 'Freshworks', isEnabled: false },
  ]

  // Combine all services
  const allServices = [
    ...paymentServices,
    ...shippingServices,
    ...communicationServices,
    ...analyticsServices,
    ...securityServices,
    ...aiServices,
    ...marketingServices,
    ...storageServices,
    ...verificationServices,
    ...notificationServices,
    ...socialServices,
    ...searchServices,
    ...cdnServices,
    ...fraudServices,
    ...loyaltyServices,
    ...cacheServices,
    ...supportServices,
  ]

  // Create services
  for (const service of allServices) {
    try {
      const created = await db.platformService.create({
        data: {
          name: service.name,
          slug: service.slug,
          category: service.category as any,
          provider: service.provider,
          isEnabled: service.isEnabled ?? false,
          isPremium: service.isPremium ?? false,
          status: 'ACTIVE',
        },
      })
      services.push(created)
    } catch (e) {
      // Skip if already exists
    }
  }

  // ========== FEATURES (60+ features) ==========

  const allFeatures = [
    // UI Features (15)
    { name: 'Dark Mode', key: 'dark_mode', category: 'UI', isEnabled: true },
    { name: 'RTL Support', key: 'rtl_support', category: 'UI', isEnabled: false },
    { name: 'Animations', key: 'animations', category: 'UI', isEnabled: true },
    { name: 'Infinite Scroll', key: 'infinite_scroll', category: 'UI', isEnabled: true },
    { name: 'Lazy Loading Images', key: 'lazy_loading', category: 'UI', isEnabled: true },
    { name: 'Skeleton Loading', key: 'skeleton_loading', category: 'UI', isEnabled: true },
    { name: 'Toast Notifications', key: 'toast_notifications', category: 'UI', isEnabled: true },
    { name: 'Modal Dialogs', key: 'modal_dialogs', category: 'UI', isEnabled: true },
    { name: 'Bottom Sheet', key: 'bottom_sheet', category: 'UI', isEnabled: true },
    { name: 'Pull to Refresh', key: 'pull_to_refresh', category: 'UI', isEnabled: false },
    { name: 'Swipe Actions', key: 'swipe_actions', category: 'UI', isEnabled: true },
    { name: 'Progressive Web App', key: 'pwa', category: 'UI', isEnabled: true },
    { name: 'Responsive Images', key: 'responsive_images', category: 'UI', isEnabled: true },
    { name: 'Virtual Keyboard', key: 'virtual_keyboard', category: 'UI', isEnabled: false },
    { name: 'Accessibility Mode', key: 'accessibility_mode', category: 'UI', isEnabled: true },

    // Commerce Features (15)
    { name: 'Product Reviews', key: 'product_reviews', category: 'Commerce', isEnabled: true },
    { name: 'Product Q&A', key: 'product_qa', category: 'Commerce', isEnabled: true },
    { name: 'Wishlist', key: 'wishlist', category: 'Commerce', isEnabled: true },
    { name: 'Price Alerts', key: 'price_alerts', category: 'Commerce', isEnabled: true },
    { name: 'Stock Alerts', key: 'stock_alerts', category: 'Commerce', isEnabled: true },
    { name: 'Flash Sales', key: 'flash_sales', category: 'Commerce', isEnabled: true },
    { name: 'Daily Deals', key: 'daily_deals', category: 'Commerce', isEnabled: true },
    { name: 'Bundle Products', key: 'bundle_products', category: 'Commerce', isEnabled: false },
    { name: 'Gift Cards', key: 'gift_cards', category: 'Commerce', isEnabled: false },
    { name: 'Loyalty Points', key: 'loyalty_points', category: 'Commerce', isEnabled: false },
    { name: 'Referral Program', key: 'referral_program', category: 'Commerce', isEnabled: true },
    { name: 'Product Comparison', key: 'product_comparison', category: 'Commerce', isEnabled: false },
    { name: 'Recently Viewed', key: 'recently_viewed', category: 'Commerce', isEnabled: true },
    { name: 'Recommended Products', key: 'recommended_products', category: 'Commerce', isEnabled: true },
    { name: 'Live Shopping', key: 'live_shopping', category: 'Commerce', isEnabled: false },

    // Security Features (10)
    { name: 'Two-Factor Auth', key: 'two_factor_auth', category: 'Security', isEnabled: true },
    { name: 'Biometric Login', key: 'biometric_login', category: 'Security', isEnabled: false },
    { name: 'Session Management', key: 'session_management', category: 'Security', isEnabled: true },
    { name: 'Login History', key: 'login_history', category: 'Security', isEnabled: true },
    { name: 'Device Management', key: 'device_management', category: 'Security', isEnabled: true },
    { name: 'Passwordless Login', key: 'passwordless_login', category: 'Security', isEnabled: false },
    { name: 'SSO Integration', key: 'sso_integration', category: 'Security', isEnabled: false },
    { name: 'CAPTCHA Protection', key: 'captcha_protection', category: 'Security', isEnabled: true },
    { name: 'Rate Limiting', key: 'rate_limiting', category: 'Security', isEnabled: true },
    { name: 'IP Whitelisting', key: 'ip_whitelisting', category: 'Security', isEnabled: false },

    // Communication Features (10)
    { name: 'Email Notifications', key: 'email_notifications', category: 'Communication', isEnabled: true },
    { name: 'SMS Notifications', key: 'sms_notifications', category: 'Communication', isEnabled: true },
    { name: 'Push Notifications', key: 'push_notifications', category: 'Communication', isEnabled: true },
    { name: 'WhatsApp Notifications', key: 'whatsapp_notifications', category: 'Communication', isEnabled: false },
    { name: 'In-App Chat', key: 'in_app_chat', category: 'Communication', isEnabled: true },
    { name: 'Live Chat Support', key: 'live_chat_support', category: 'Communication', isEnabled: true },
    { name: 'Chatbot', key: 'chatbot', category: 'Communication', isEnabled: true },
    { name: 'Help Center', key: 'help_center', category: 'Communication', isEnabled: true },
    { name: 'Ticket System', key: 'ticket_system', category: 'Communication', isEnabled: true },
    { name: 'Video Support', key: 'video_support', category: 'Communication', isEnabled: false },

    // Analytics Features (10)
    { name: 'User Analytics', key: 'user_analytics', category: 'Analytics', isEnabled: true },
    { name: 'Product Analytics', key: 'product_analytics', category: 'Analytics', isEnabled: true },
    { name: 'Sales Analytics', key: 'sales_analytics', category: 'Analytics', isEnabled: true },
    { name: 'Traffic Analytics', key: 'traffic_analytics', category: 'Analytics', isEnabled: true },
    { name: 'Heatmaps', key: 'heatmaps', category: 'Analytics', isEnabled: false },
    { name: 'Session Recording', key: 'session_recording', category: 'Analytics', isEnabled: false },
    { name: 'Funnel Analysis', key: 'funnel_analysis', category: 'Analytics', isEnabled: true },
    { name: 'Cohort Analysis', key: 'cohort_analysis', category: 'Analytics', isEnabled: false },
    { name: 'A/B Testing', key: 'ab_testing', category: 'Analytics', isEnabled: false },
    { name: 'Real-time Dashboard', key: 'realtime_dashboard', category: 'Analytics', isEnabled: true },
  ]

  // Create features
  for (const feature of allFeatures) {
    try {
      const created = await db.platformFeature.create({
        data: {
          name: feature.name,
          key: feature.key,
          category: feature.category,
          isEnabled: feature.isEnabled,
          type: 'TOGGLE',
        },
      })
      features.push(created)
    } catch (e) {
      // Skip if already exists
    }
  }

  // ========== TOOLS (40+ tools) ==========

  const allTools = [
    // Data Management (8)
    { name: 'Bulk Product Import', slug: 'bulk-import', category: 'DATA_MANAGEMENT', isDangerous: false },
    { name: 'Bulk Product Export', slug: 'bulk-export', category: 'DATA_MANAGEMENT', isDangerous: false },
    { name: 'CSV Product Upload', slug: 'csv-upload', category: 'DATA_MANAGEMENT', isDangerous: false },
    { name: 'Database Backup', slug: 'db-backup', category: 'DATA_MANAGEMENT', isDangerous: false },
    { name: 'Database Restore', slug: 'db-restore', category: 'DATA_MANAGEMENT', isDangerous: true },
    { name: 'Data Migration', slug: 'data-migration', category: 'DATA_MANAGEMENT', isDangerous: true },
    { name: 'Cache Clear', slug: 'cache-clear', category: 'DATA_MANAGEMENT', isDangerous: false },
    { name: 'Search Index Rebuild', slug: 'index-rebuild', category: 'DATA_MANAGEMENT', isDangerous: false },

    // User Management (6)
    { name: 'Bulk User Activation', slug: 'bulk-activate-users', category: 'USER_MANAGEMENT', isDangerous: false },
    { name: 'Bulk User Suspension', slug: 'bulk-suspend-users', category: 'USER_MANAGEMENT', isDangerous: true },
    { name: 'Role Assignment', slug: 'role-assignment', category: 'USER_MANAGEMENT', isDangerous: false },
    { name: 'Password Reset Tool', slug: 'password-reset', category: 'USER_MANAGEMENT', isDangerous: false },
    { name: 'Email Verification', slug: 'email-verification', category: 'USER_MANAGEMENT', isDangerous: false },
    { name: 'User Merge', slug: 'user-merge', category: 'USER_MANAGEMENT', isDangerous: true },

    // Product Management (6)
    { name: 'Bulk Price Update', slug: 'bulk-price-update', category: 'PRODUCT_MANAGEMENT', isDangerous: false },
    { name: 'Bulk Stock Update', slug: 'bulk-stock-update', category: 'PRODUCT_MANAGEMENT', isDangerous: false },
    { name: 'Product Approval Queue', slug: 'product-approval', category: 'PRODUCT_MANAGEMENT', isDangerous: false },
    { name: 'Category Assignment', slug: 'category-assignment', category: 'PRODUCT_MANAGEMENT', isDangerous: false },
    { name: 'Bulk Product Delete', slug: 'bulk-product-delete', category: 'PRODUCT_MANAGEMENT', isDangerous: true },
    { name: 'Image Optimization', slug: 'image-optimization', category: 'PRODUCT_MANAGEMENT', isDangerous: false },

    // Order Management (5)
    { name: 'Bulk Order Status', slug: 'bulk-order-status', category: 'ORDER_MANAGEMENT', isDangerous: false },
    { name: 'Order Export', slug: 'order-export', category: 'ORDER_MANAGEMENT', isDangerous: false },
    { name: 'Invoice Generator', slug: 'invoice-generator', category: 'ORDER_MANAGEMENT', isDangerous: false },
    { name: 'Shipping Label Print', slug: 'shipping-labels', category: 'ORDER_MANAGEMENT', isDangerous: false },
    { name: 'Bulk Refund Tool', slug: 'bulk-refund', category: 'ORDER_MANAGEMENT', isDangerous: true },

    // Financial Tools (4)
    { name: 'Commission Calculator', slug: 'commission-calc', category: 'FINANCIAL', isDangerous: false },
    { name: 'Payout Generator', slug: 'payout-generator', category: 'FINANCIAL', isDangerous: false },
    { name: 'Tax Report Generator', slug: 'tax-report', category: 'FINANCIAL', isDangerous: false },
    { name: 'Revenue Report', slug: 'revenue-report', category: 'FINANCIAL', isDangerous: false },

    // Marketing Tools (4)
    { name: 'Email Campaign Tool', slug: 'email-campaign', category: 'MARKETING', isDangerous: false },
    { name: 'SMS Campaign Tool', slug: 'sms-campaign', category: 'MARKETING', isDangerous: false },
    { name: 'Coupon Generator', slug: 'coupon-generator', category: 'MARKETING', isDangerous: false },
    { name: 'Banner Manager', slug: 'banner-manager', category: 'MARKETING', isDangerous: false },

    // Security Tools (4)
    { name: 'Security Audit', slug: 'security-audit', category: 'SECURITY', isDangerous: false },
    { name: 'API Key Generator', slug: 'api-key-gen', category: 'SECURITY', isDangerous: false },
    { name: 'Session Terminator', slug: 'session-terminator', category: 'SECURITY', isDangerous: true },
    { name: 'IP Blocker', slug: 'ip-blocker', category: 'SECURITY', isDangerous: false },

    // Automation Tools (4)
    { name: 'Task Scheduler', slug: 'task-scheduler', category: 'AUTOMATION', isDangerous: false },
    { name: 'Webhook Manager', slug: 'webhook-manager', category: 'AUTOMATION', isDangerous: false },
    { name: 'Auto Price Adjuster', slug: 'auto-price', category: 'AUTOMATION', isDangerous: false },
    { name: 'Stock Sync', slug: 'stock-sync', category: 'AUTOMATION', isDangerous: false },

    // Reporting Tools (3)
    { name: 'Custom Report Builder', slug: 'report-builder', category: 'REPORTING', isDangerous: false },
    { name: 'Scheduled Reports', slug: 'scheduled-reports', category: 'REPORTING', isDangerous: false },
    { name: 'Export All Data', slug: 'export-all', category: 'REPORTING', isDangerous: false },
  ]

  // Create tools
  for (const tool of allTools) {
    try {
      const created = await db.adminTool.create({
        data: {
          name: tool.name,
          slug: tool.slug,
          category: tool.category as any,
          isDangerous: tool.isDangerous,
          isEnabled: true,
          requiresConfirmation: tool.isDangerous,
        },
      })
      tools.push(created)
    } catch (e) {
      // Skip if already exists
    }
  }

  // ========== COLOR PALETTES (5 default palettes) ==========

  const defaultPalettes = [
    {
      name: 'Emerald Default',
      slug: 'emerald-default',
      isDefault: true,
      isActive: true,
      primary: '#10b981',
    },
    {
      name: 'Ocean Blue',
      slug: 'ocean-blue',
      primary: '#0ea5e9',
      gradientFrom: '#0ea5e9',
      gradientTo: '#06b6d4',
    },
    {
      name: 'Royal Purple',
      slug: 'royal-purple',
      primary: '#8b5cf6',
      gradientFrom: '#8b5cf6',
      gradientTo: '#a855f7',
    },
    {
      name: 'Sunset Orange',
      slug: 'sunset-orange',
      primary: '#f97316',
      gradientFrom: '#f97316',
      gradientTo: '#ef4444',
    },
    {
      name: 'Rose Pink',
      slug: 'rose-pink',
      primary: '#ec4899',
      gradientFrom: '#ec4899',
      gradientTo: '#f43f5e',
    },
  ]

  for (const palette of defaultPalettes) {
    try {
      await db.colorPalette.create({
        data: {
          name: palette.name,
          slug: palette.slug,
          primary: palette.primary,
          gradientFrom: palette.gradientFrom || palette.primary,
          gradientTo: palette.gradientTo || palette.primary,
          isDefault: palette.isDefault ?? false,
          isActive: palette.isActive ?? false,
        },
      })
    } catch (e) {
      // Skip if already exists
    }
  }

  return {
    services: services.length,
    features: features.length,
    tools: tools.length,
    message: `Seeded ${services.length} services, ${features.length} features, and ${tools.length} tools`,
  }
}
