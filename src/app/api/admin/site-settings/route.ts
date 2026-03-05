// Admin Site Settings API Route - Site Settings Management
// Using Prisma ORM with the same auth pattern as flash-sale route
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Helper to hash token using SHA-256 (same as flash-sale route)
async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(token)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// Helper to get user from session token (same as flash-sale route)
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

// Default site settings
function getDefaultSiteSettings() {
  return {
    siteName: 'LUMINVERA',
    tagline: "Pakistan's #1 Marketplace",
    logo: '',
    favicon: '',
    email: 'support@luminvera.pk',
    phone: '+92-300-1234567',
    address: 'LUMINVERA Headquarters, DHA Phase 6, Lahore, Pakistan',
    socialLinks: {
      facebook: 'https://facebook.com/luminvera.pk',
      instagram: 'https://instagram.com/luminvera.pk',
      twitter: 'https://twitter.com/luminvera_pk',
      youtube: 'https://youtube.com/@luminvera',
    },
  }
}

// Site settings keys mapped to their storage keys in PlatformConfig
const SITE_SETTINGS_MAP: Record<string, string> = {
  siteName: 'site.name',
  tagline: 'site.tagline',
  logo: 'site.logo',
  favicon: 'site.favicon',
  email: 'site.email',
  phone: 'site.phone',
  address: 'site.address',
  'socialLinks.facebook': 'site.social.facebook',
  'socialLinks.instagram': 'site.social.instagram',
  'socialLinks.twitter': 'site.social.twitter',
  'socialLinks.youtube': 'site.social.youtube',
}

// All storage keys for site settings
const SITE_SETTING_KEYS = Object.values(SITE_SETTINGS_MAP)

// GET - Fetch site settings (public access for basic info, admin for all)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const admin = searchParams.get('admin') === 'true'

    // Check if admin access is requested
    const user = await getUserFromToken(request)
    const isAdminUser = isAdmin(user)

    // For admin mode, require admin role
    if (admin && !isAdminUser) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Get all site settings from PlatformConfig
    const settings = await db.platformConfig.findMany({
      where: {
        key: { in: SITE_SETTING_KEYS },
      },
    })

    // Convert to object
    const settingsMap: Record<string, string> = {}
    settings.forEach((setting) => {
      settingsMap[setting.key] = setting.value
    })

    // Build response with defaults
    const defaults = getDefaultSiteSettings()
    const siteSettings = {
      siteName: settingsMap['site.name'] ?? defaults.siteName,
      tagline: settingsMap['site.tagline'] ?? defaults.tagline,
      logo: settingsMap['site.logo'] ?? defaults.logo,
      favicon: settingsMap['site.favicon'] ?? defaults.favicon,
      email: settingsMap['site.email'] ?? defaults.email,
      phone: settingsMap['site.phone'] ?? defaults.phone,
      address: settingsMap['site.address'] ?? defaults.address,
      socialLinks: {
        facebook: settingsMap['site.social.facebook'] ?? defaults.socialLinks.facebook,
        instagram: settingsMap['site.social.instagram'] ?? defaults.socialLinks.instagram,
        twitter: settingsMap['site.social.twitter'] ?? defaults.socialLinks.twitter,
        youtube: settingsMap['site.social.youtube'] ?? defaults.socialLinks.youtube,
      },
    }

    return NextResponse.json({
      success: true,
      settings: siteSettings,
      isDefault: settings.length === 0,
    })
  } catch (error) {
    console.error('Site Settings GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Save site settings (admin only, with image upload support via base64)
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request)

    if (!isAdmin(user)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()

    // Support both nested and flat structure
    const {
      siteName,
      tagline,
      logo,
      favicon,
      email,
      phone,
      address,
      socialLinks,
    } = body

    // Validate email format if provided
    if (email && email.trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        return NextResponse.json(
          { error: 'Invalid email format' },
          { status: 400 }
        )
      }
    }

    // Validate base64 image size (max 2MB) for logo
    if (logo && logo.startsWith('data:')) {
      const sizeInBytes = (logo.length * 3) / 4
      if (sizeInBytes > 2 * 1024 * 1024) {
        return NextResponse.json(
          { error: 'Logo image size exceeds 2MB limit' },
          { status: 400 }
        )
      }
    }

    // Validate base64 image size (max 1MB) for favicon
    if (favicon && favicon.startsWith('data:')) {
      const sizeInBytes = (favicon.length * 3) / 4
      if (sizeInBytes > 1024 * 1024) {
        return NextResponse.json(
          { error: 'Favicon image size exceeds 1MB limit' },
          { status: 400 }
        )
      }
    }

    // Validate social link URLs if provided
    const socialLinkKeys = ['facebook', 'instagram', 'twitter', 'youtube'] as const
    if (socialLinks) {
      for (const key of socialLinkKeys) {
        const url = socialLinks[key]
        if (url && url.trim() !== '') {
          try {
            new URL(url)
          } catch {
            return NextResponse.json(
              { error: `Invalid URL for ${key}` },
              { status: 400 }
            )
          }
        }
      }
    }

    // Build updates array
    const updates: Promise<unknown>[] = []

    // Add simple field updates
    const simpleFields: Record<string, string | undefined> = {
      'site.name': siteName,
      'site.tagline': tagline,
      'site.logo': logo,
      'site.favicon': favicon,
      'site.email': email,
      'site.phone': phone,
      'site.address': address,
    }

    for (const [key, value] of Object.entries(simpleFields)) {
      if (value !== undefined) {
        updates.push(
          db.platformConfig.upsert({
            where: { key },
            update: { value: String(value) },
            create: {
              key,
              value: String(value),
              description: `Site setting: ${key}`,
            },
          })
        )
      }
    }

    // Add social link updates
    if (socialLinks) {
      const socialFieldMap: Record<string, string> = {
        facebook: 'site.social.facebook',
        instagram: 'site.social.instagram',
        twitter: 'site.social.twitter',
        youtube: 'site.social.youtube',
      }

      for (const [field, storageKey] of Object.entries(socialFieldMap)) {
        const value = socialLinks[field as keyof typeof socialLinks]
        if (value !== undefined) {
          updates.push(
            db.platformConfig.upsert({
              where: { key: storageKey },
              update: { value: String(value) },
              create: {
                key: storageKey,
                value: String(value),
                description: `Site social link: ${field}`,
              },
            })
          )
        }
      }
    }

    // Execute all updates
    if (updates.length > 0) {
      await Promise.all(updates)
    }

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: user.id,
        userRole: user.role,
        action: 'UPDATE_SITE_SETTINGS',
        entityType: 'platform_config',
        newValue: JSON.stringify({
          siteName,
          tagline,
          logo: logo ? '[BASE64_IMAGE]' : undefined,
          favicon: favicon ? '[BASE64_IMAGE]' : undefined,
          email,
          phone,
          address,
          socialLinks,
        }),
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Site settings saved successfully',
    })
  } catch (error) {
    console.error('Site Settings POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - Update specific site setting (admin only)
export async function PUT(request: NextRequest) {
  try {
    const user = await getUserFromToken(request)

    if (!isAdmin(user)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { key, value } = body

    if (!key) {
      return NextResponse.json({ error: 'Setting key is required' }, { status: 400 })
    }

    // Map frontend key to storage key
    const storageKey = SITE_SETTINGS_MAP[key] || key

    // Validate that key is a valid site setting key
    if (!SITE_SETTING_KEYS.includes(storageKey)) {
      return NextResponse.json(
        { error: 'Invalid site setting key' },
        { status: 400 }
      )
    }

    // Validate email if updating email
    if (storageKey === 'site.email' && value) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(value)) {
        return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
      }
    }

    // Validate image size for logo/favicon
    if ((storageKey === 'site.logo' || storageKey === 'site.favicon') && value?.startsWith('data:')) {
      const maxSize = storageKey === 'site.logo' ? 2 * 1024 * 1024 : 1024 * 1024
      const sizeInBytes = (value.length * 3) / 4
      if (sizeInBytes > maxSize) {
        return NextResponse.json(
          { error: `Image size exceeds ${storageKey === 'site.logo' ? '2MB' : '1MB'} limit` },
          { status: 400 }
        )
      }
    }

    // Validate social link URLs
    if (storageKey.startsWith('site.social.') && value) {
      try {
        new URL(value)
      } catch {
        return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 })
      }
    }

    // Update the setting
    await db.platformConfig.upsert({
      where: { key: storageKey },
      update: { value: String(value) },
      create: {
        key: storageKey,
        value: String(value),
        description: `Site setting: ${key}`,
      },
    })

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: user.id,
        userRole: user.role,
        action: 'UPDATE_SITE_SETTING',
        entityType: 'platform_config',
        entityId: storageKey,
        newValue: String(value),
      },
    })

    return NextResponse.json({
      success: true,
      message: `${key} updated successfully`,
    })
  } catch (error) {
    console.error('Site Settings PUT error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Reset site settings to defaults (admin only)
export async function DELETE(request: NextRequest) {
  try {
    const user = await getUserFromToken(request)

    if (!isAdmin(user)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Delete all site settings
    await db.platformConfig.deleteMany({
      where: {
        key: { in: SITE_SETTING_KEYS },
      },
    })

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: user.id,
        userRole: user.role,
        action: 'RESET_SITE_SETTINGS',
        entityType: 'platform_config',
        newValue: JSON.stringify({ action: 'reset_to_defaults' }),
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Site settings reset to defaults',
      settings: getDefaultSiteSettings(),
    })
  } catch (error) {
    console.error('Site Settings DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
