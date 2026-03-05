// Theme API Route - Manage platform theme/branding
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { UserRole } from '@prisma/client'

// GET - Get theme configuration
export async function GET() {
  try {
    // Get theme settings from platform_config
    const themeKeys = [
      'site_name', 'tagline', 'logo_url', 'favicon_url',
      'primary_color', 'primary_hover_color', 'secondary_color', 'accent_color',
      'background_color', 'text_color', 'success_color', 'warning_color', 'error_color',
      'font_family', 'heading_font', 'base_font_size',
      'border_radius', 'card_shadow',
      'dark_mode_enabled', 'rtl_support',
      'footer_text', 'social_facebook', 'social_instagram', 'social_twitter', 'social_youtube',
      'support_email', 'support_phone', 'support_whatsapp'
    ]
    
    const settings = await db.platformConfig.findMany({
      where: {
        key: { in: themeKeys }
      }
    })
    
    if (!settings || settings.length === 0) {
      // Return defaults if no settings exist
      return NextResponse.json({ 
        theme: getDefaultTheme(),
        isDefault: true 
      })
    }
    
    const theme: Record<string, string> = {}
    settings?.forEach(s => {
      theme[s.key] = s.value
    })
    
    // Merge with defaults
    const fullTheme = {
      ...getDefaultTheme(),
      ...theme
    }
    
    return NextResponse.json({ theme: fullTheme, isDefault: false })
  } catch (error) {
    console.error('Theme GET error:', error)
    return NextResponse.json({ theme: getDefaultTheme(), isDefault: true })
  }
}

// POST - Update theme (admin only)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { theme, userId } = body
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 401 })
    }
    
    // Verify admin role
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { role: true }
    })
    
    if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    
    // Save theme settings
    const updates = []
    for (const [key, value] of Object.entries(theme)) {
      if (value !== undefined) {
        updates.push(
          db.platformConfig.upsert({
            where: { key },
            create: { key, value: String(value) },
            update: { value: String(value) }
          })
        )
      }
    }
    
    await Promise.all(updates)
    
    return NextResponse.json({ success: true, message: 'Theme updated successfully' })
  } catch (error) {
    console.error('Theme POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - Reset to default theme
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, reset } = body
    
    if (!userId || !reset) {
      return NextResponse.json({ error: 'User ID and reset flag required' }, { status: 400 })
    }
    
    // Verify admin role
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { role: true }
    })
    
    if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    
    // Delete all theme settings
    const themeKeys = [
      'primary_color', 'secondary_color', 'accent_color', 'logo_url', 'favicon_url'
    ]
    
    await db.platformConfig.deleteMany({
      where: {
        key: { in: themeKeys }
      }
    })
    
    return NextResponse.json({ success: true, message: 'Theme reset to defaults' })
  } catch (error) {
    console.error('Theme PUT error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function getDefaultTheme() {
  return {
    site_name: 'Luminvera',
    tagline: "Pakistan's #1 Marketplace",
    logo_url: '',
    favicon_url: '',
    primary_color: '#10b981',
    primary_hover_color: '#059669',
    secondary_color: '#14b8a6',
    accent_color: '#0d9488',
    background_color: '#ffffff',
    text_color: '#1e293b',
    success_color: '#22c55e',
    warning_color: '#f59e0b',
    error_color: '#ef4444',
    font_family: 'Inter, system-ui, sans-serif',
    heading_font: 'Inter, system-ui, sans-serif',
    base_font_size: '16px',
    border_radius: '0.75rem',
    dark_mode_enabled: 'true',
    footer_text: '© 2025 Luminvera. All rights reserved.',
    support_email: 'support@luminvera.pk',
    support_phone: '+92-300-1234567'
  }
}
