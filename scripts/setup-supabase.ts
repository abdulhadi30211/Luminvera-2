#!/usr/bin/env bun
/**
 * LUMINVERA Supabase Setup Script
 * 
 * This script sets up the database schema on Supabase
 * 
 * PREREQUISITES:
 * 1. Get your database password from Supabase Dashboard:
 *    - Go to: https://supabase.com/dashboard/project/ehieczmqbhqrtnrtthob/settings/database
 *    - Find "Database Password" and copy it
 * 
 * 2. Update .env file with your database password:
 *    - Replace YOUR_DB_PASSWORD in DATABASE_URL and DIRECT_URL
 */

import { createClient } from '@supabase/supabase-js'
import * as crypto from 'crypto'

const supabaseUrl = 'https://ehieczmqbhqrtnrtthob.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVoaWVjem1xYmhxcnRucnR0aG9iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTAwNjU4MCwiZXhwIjoyMDgwNTgyNTgwfQ.oIxZHe6C_9wV1kfXG9_vZAIot8EMRfbUaUtzW6-_MGg'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

// Password hashing function
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

async function createInitialData() {
  console.log('🌱 Creating initial data...\n')

  try {
    // Check if users table exists by trying to select from it
    const { error: checkError } = await supabase
      .from('users')
      .select('id')
      .limit(1)

    if (checkError) {
      console.log('❌ Database tables not found. Please run the SQL schema first!')
      console.log('\n📋 Instructions:')
      console.log('1. Open: https://supabase.com/dashboard/project/ehieczmqbhqrtnrtthob/sql')
      console.log('2. Create a new query')
      console.log('3. Copy the contents of supabase-schema.sql and paste it')
      console.log('4. Click Run')
      console.log('\n5. Get your database password from:')
      console.log('   https://supabase.com/dashboard/project/ehieczmqbhqrtnrtthob/settings/database')
      console.log('6. Update .env file with your database password')
      console.log('7. Run: bun run db:push')
      return
    }

    // Create admin user
    const adminPassword = await hashPassword('admin123')
    const { data: admin, error: adminError } = await supabase
      .from('users')
      .upsert({
        email: 'admin@luminvera.pk',
        password_hash: adminPassword,
        first_name: 'Admin',
        last_name: 'User',
        role: 'ADMIN',
        account_status: 'ACTIVE',
        email_verified: true,
        email_verified_at: new Date().toISOString(),
      }, { onConflict: 'email' })
      .select()
      .single()

    if (adminError) {
      console.log('⚠️ Admin user:', adminError.message)
    } else {
      console.log('✅ Admin user created:', admin?.email)
    }

    // Create seller user
    const sellerPassword = await hashPassword('seller123')
    const { data: sellerUser, error: sellerError } = await supabase
      .from('users')
      .upsert({
        email: 'seller@luminvera.pk',
        password_hash: sellerPassword,
        first_name: 'Tech',
        last_name: 'Seller',
        role: 'SELLER',
        account_status: 'ACTIVE',
        email_verified: true,
        email_verified_at: new Date().toISOString(),
      }, { onConflict: 'email' })
      .select()
      .single()

    if (sellerError) {
      console.log('⚠️ Seller user:', sellerError.message)
    } else {
      console.log('✅ Seller user created:', sellerUser?.email)

      // Create seller profile
      const { error: profileError } = await supabase
        .from('sellers')
        .upsert({
          user_id: sellerUser.id,
          store_name: 'TechZone Pakistan',
          store_slug: 'techzone-pakistan',
          store_description: 'Your trusted electronics store in Pakistan',
          status: 'VERIFIED',
          verified_at: new Date().toISOString(),
          commission_rate: 10,
          is_featured: true,
          is_top_seller: true,
        }, { onConflict: 'user_id' })

      if (profileError) {
        console.log('⚠️ Seller profile:', profileError.message)
      } else {
        console.log('✅ Seller profile created')
      }
    }

    // Create customer user
    const customerPassword = await hashPassword('customer123')
    const { data: customer, error: customerError } = await supabase
      .from('users')
      .upsert({
        email: 'customer@luminvera.pk',
        password_hash: customerPassword,
        first_name: 'Ali',
        last_name: 'Ahmed',
        phone: '+92-300-9876543',
        role: 'USER',
        account_status: 'ACTIVE',
        email_verified: true,
        email_verified_at: new Date().toISOString(),
      }, { onConflict: 'email' })
      .select()
      .single()

    if (customerError) {
      console.log('⚠️ Customer user:', customerError.message)
    } else {
      console.log('✅ Customer user created:', customer?.email)
    }

    // Create categories
    const categories = [
      { name: 'Electronics', slug: 'electronics', description: 'Electronic devices and accessories', default_commission: 8 },
      { name: 'Fashion', slug: 'fashion', description: 'Clothing, shoes, and accessories', default_commission: 12 },
      { name: 'Home & Living', slug: 'home-living', description: 'Furniture and home decor', default_commission: 10 },
      { name: 'Beauty', slug: 'beauty', description: 'Skincare, makeup, and personal care', default_commission: 15 },
      { name: 'Sports', slug: 'sports', description: 'Sports equipment and fitness gear', default_commission: 10 },
    ]

    for (const cat of categories) {
      const { error } = await supabase
        .from('categories')
        .upsert(cat, { onConflict: 'slug' })
      if (!error) {
        console.log(`✅ Category created: ${cat.name}`)
      }
    }

    // Create platform config
    const configs = [
      { key: 'site_name', value: 'Luminvera', description: 'Platform name' },
      { key: 'default_currency', value: 'PKR', description: 'Default currency' },
      { key: 'commission_rate', value: '10', description: 'Default platform commission rate (%)' },
    ]

    for (const config of configs) {
      await supabase.from('platform_config').upsert(config, { onConflict: 'key' })
    }
    console.log('✅ Platform config created')

    console.log('\n🎉 Setup completed!')
    console.log('\n📋 Test Accounts:')
    console.log('  Admin: admin@luminvera.pk / admin123')
    console.log('  Seller: seller@luminvera.pk / seller123')
    console.log('  Customer: customer@luminvera.pk / customer123')

  } catch (error) {
    console.error('❌ Setup error:', error)
  }
}

createInitialData()
