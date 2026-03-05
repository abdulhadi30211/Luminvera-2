// Platform Settings API Route - Comprehensive Configuration Management
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createHash } from 'crypto'

// Encryption helper for sensitive data
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'luminvera-encryption-key-32ch'

function encryptValue(value: string): string {
  // Simple XOR encryption for demo - use proper encryption in production
  const encrypted = Buffer.from(value).toString('base64')
  return `enc:${encrypted}`
}

function decryptValue(value: string): string {
  if (!value.startsWith('enc:')) return value
  try {
    return Buffer.from(value.slice(4), 'base64').toString('utf-8')
  } catch {
    return value
  }
}

// Verify admin access
async function verifyAdmin(userId: string): Promise<boolean> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true }
  })
  return user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN'
}

// GET - Fetch all platform settings or specific group
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const group = searchParams.get('group')
    const key = searchParams.get('key')
    
    if (key) {
      // Get specific setting
      const setting = await db.platformConfig.findUnique({
        where: { key }
      })
      
      if (!setting) {
        return NextResponse.json({ error: 'Setting not found' }, { status: 404 })
      }
      
      // Decrypt sensitive values
      let value = setting.value
      if (key.includes('secret') || key.includes('key') || key.includes('password') || key.includes('credential')) {
        value = decryptValue(value)
      }
      
      return NextResponse.json({ setting: { ...setting, value } })
    }
    
    // Get all settings as key-value object
    const settings = await db.platformConfig.findMany({
      orderBy: { key: 'asc' }
    })
    
    // Group settings by category
    const settingsMap: Record<string, string> = {}
    const groupedSettings: Record<string, Record<string, string>> = {}
    
    settings.forEach(s => {
      let value = s.value
      
      // Decrypt sensitive values
      if (s.key.includes('secret') || s.key.includes('key') || s.key.includes('password') || s.key.includes('credential')) {
        value = decryptValue(value)
      }
      
      settingsMap[s.key] = value
      
      // Group by prefix (e.g., 'theme.primaryColor' -> 'theme')
      const [group, ...rest] = s.key.split('.')
      if (!groupedSettings[group]) {
        groupedSettings[group] = {}
      }
      groupedSettings[group][rest.join('.')] = value
    })
    
    // Fetch delivery zones
    const deliveryZones = await db.deliveryZone.findMany({
      orderBy: { name: 'asc' }
    })
    
    // Fetch couriers
    const couriers = await db.courier.findMany({
      orderBy: { name: 'asc' }
    })
    
    // Fetch banners
    const banners = await db.banner.findMany({
      orderBy: [{ position: 'asc' }, { sortOrder: 'asc' }]
    })
    
    // Fetch feature flags
    const featureFlags = await db.featureFlag.findMany({
      orderBy: { key: 'asc' }
    })
    
    if (group) {
      // Return specific group with related data
      return NextResponse.json({
        settings: groupedSettings[group] || {},
        raw: settings.filter(s => s.key.startsWith(`${group}.`)),
        deliveryZones,
        couriers,
        banners,
        featureFlags
      })
    }
    
    return NextResponse.json({
      settings: settingsMap,
      grouped: groupedSettings,
      raw: settings,
      deliveryZones,
      couriers,
      banners,
      featureFlags
    })
  } catch (error) {
    console.error('Settings GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create or update multiple settings (admin only)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { settings, userId } = body
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 401 })
    }
    
    // Verify admin role
    const isAdmin = await verifyAdmin(userId)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 })
    }
    
    // Update multiple settings
    const updates = []
    for (const [key, value] of Object.entries(settings)) {
      let processedValue = String(value)
      
      // Encrypt sensitive values
      if (key.includes('secret') || key.includes('key') || key.includes('password') || key.includes('credential')) {
        processedValue = encryptValue(processedValue)
      }
      
      updates.push(
        db.platformConfig.upsert({
          where: { key },
          create: { key, value: processedValue },
          update: { value: processedValue }
        })
      )
    }
    
    await Promise.all(updates)
    
    // Log audit
    await db.auditLog.create({
      data: {
        userId,
        userRole: 'ADMIN',
        action: 'UPDATE_SETTINGS',
        entityType: 'platform_config',
        newValue: JSON.stringify(Object.keys(settings)),
      }
    })
    
    return NextResponse.json({ success: true, message: 'Settings updated successfully' })
  } catch (error) {
    console.error('Settings POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - Update single setting
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { key, value, description, userId } = body
    
    if (!key || value === undefined) {
      return NextResponse.json({ error: 'Key and value required' }, { status: 400 })
    }
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 401 })
    }
    
    // Verify admin role
    const isAdmin = await verifyAdmin(userId)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 })
    }
    
    let processedValue = String(value)
    
    // Encrypt sensitive values
    if (key.includes('secret') || key.includes('key') || key.includes('password') || key.includes('credential')) {
      processedValue = encryptValue(processedValue)
    }
    
    await db.platformConfig.upsert({
      where: { key },
      create: { key, value: processedValue, description },
      update: { value: processedValue, description }
    })
    
    // Log audit
    await db.auditLog.create({
      data: {
        userId,
        userRole: 'ADMIN',
        action: 'UPDATE_SETTING',
        entityType: 'platform_config',
        entityId: key,
        newValue: processedValue,
      }
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Settings PUT error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete setting (admin only)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const key = searchParams.get('key')
    const userId = searchParams.get('userId')
    
    if (!key || !userId) {
      return NextResponse.json({ error: 'Key and User ID required' }, { status: 400 })
    }
    
    // Verify admin role
    const isAdmin = await verifyAdmin(userId)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 })
    }
    
    await db.platformConfig.delete({
      where: { key }
    })
    
    // Log audit
    await db.auditLog.create({
      data: {
        userId,
        userRole: 'ADMIN',
        action: 'DELETE_SETTING',
        entityType: 'platform_config',
        entityId: key,
      }
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Settings DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
