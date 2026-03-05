// Admin Theme API Route - Platform Theme/Branding Management
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashToken } from '@/lib/auth'

// Helper to get authenticated admin user
async function getAdminUser(request: NextRequest) {
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

  const user = session?.user
  if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
    return null
  }

  return user
}

// Default theme settings
function getDefaultTheme() {
  return {
    primaryColor: '#10b981',
    secondaryColor: '#14b8a6',
    accentColor: '#0d9488',
    backgroundColor: '#ffffff',
    textColor: '#1e293b',
    successColor: '#22c55e',
    warningColor: '#f59e0b',
    errorColor: '#ef4444',
    fontFamily: 'Inter, system-ui, sans-serif',
    headingFont: 'Inter, system-ui, sans-serif',
    baseFontSize: '16px',
    borderRadius: '0.75rem',
    cardShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    darkMode: true,
    primaryHoverColor: '#059669',
    secondaryHoverColor: '#0d9488'
  }
}

// Theme keys stored in PlatformConfig
const THEME_KEYS = [
  'primaryColor',
  'secondaryColor',
  'accentColor',
  'backgroundColor',
  'textColor',
  'successColor',
  'warningColor',
  'errorColor',
  'fontFamily',
  'headingFont',
  'baseFontSize',
  'borderRadius',
  'cardShadow',
  'darkMode',
  'primaryHoverColor',
  'secondaryHoverColor',
  'customCSS'
]

// GET /api/admin/theme - Fetch theme settings
export async function GET(request: NextRequest) {
  try {
    const adminUser = await getAdminUser(request)
    if (!adminUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      )
    }

    // Get all theme settings from PlatformConfig
    const settings = await db.platformConfig.findMany({
      where: {
        key: { in: THEME_KEYS }
      }
    })

    // Convert to object
    const theme: Record<string, string> = {}
    settings.forEach(setting => {
      theme[setting.key] = setting.value
    })

    // Merge with defaults
    const fullTheme = {
      ...getDefaultTheme(),
      ...theme
    }

    return NextResponse.json({
      success: true,
      theme: fullTheme,
      isDefault: settings.length === 0
    })
  } catch (error) {
    console.error('Admin Theme GET error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/admin/theme - Save theme settings
export async function POST(request: NextRequest) {
  try {
    const adminUser = await getAdminUser(request)
    if (!adminUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { theme } = body

    if (!theme || typeof theme !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Theme settings are required' },
        { status: 400 }
      )
    }

    // Validate and save each theme setting
    const updates = []

    for (const [key, value] of Object.entries(theme)) {
      if (THEME_KEYS.includes(key)) {
        // Validate color format for color fields
        if (key.toLowerCase().includes('color') && typeof value === 'string') {
          const colorRegex = /^(#[0-9A-Fa-f]{3,8}|rgb\(\d{1,3},\s*\d{1,3},\s*\d{1,3}\)|rgba\(\d{1,3},\s*\d{1,3},\s*\d{1,3},\s*[\d.]+\))$/
          if (!colorRegex.test(value as string)) {
            continue // Skip invalid color
          }
        }

        updates.push(
          db.platformConfig.upsert({
            where: { key },
            update: { value: String(value) },
            create: {
              key,
              value: String(value),
              description: `Theme setting: ${key}`
            }
          })
        )
      }
    }

    await Promise.all(updates)

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: adminUser.id,
        userRole: adminUser.role,
        action: 'UPDATE_THEME',
        entityType: 'platform_config',
        newValue: JSON.stringify(theme)
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Theme settings saved successfully'
    })
  } catch (error) {
    console.error('Admin Theme POST error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/admin/theme - Reset theme to defaults
export async function PUT(request: NextRequest) {
  try {
    const adminUser = await getAdminUser(request)
    if (!adminUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      )
    }

    // Delete all theme settings
    await db.platformConfig.deleteMany({
      where: {
        key: { in: THEME_KEYS }
      }
    })

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: adminUser.id,
        userRole: adminUser.role,
        action: 'RESET_THEME',
        entityType: 'platform_config',
        newValue: JSON.stringify({ action: 'reset_to_defaults' })
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Theme reset to defaults',
      theme: getDefaultTheme()
    })
  } catch (error) {
    console.error('Admin Theme PUT error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
