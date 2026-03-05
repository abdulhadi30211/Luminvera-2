#!/usr/bin/env bun
/**
 * Push SQL schema to Supabase using the Management API
 */

import * as fs from 'fs'
import * as path from 'path'

const SUPABASE_URL = 'https://ehieczmqbhqrtnrtthob.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVoaWVjem1xYmhxcnRucnR0aG9iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTAwNjU4MCwiZXhwIjoyMDgwNTgyNTgwfQ.oIxZHe6C_9wV1kfXG9_vZAIot8EMRfbUaUtzW6-_MGg'

async function executeSql(sql: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ sql }),
    })

    const data = await response.text()
    
    if (!response.ok) {
      return { success: false, error: data }
    }
    
    return { success: true }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

async function createTableDirectly(): Promise<void> {
  console.log('🚀 Creating tables directly via Supabase REST API...\n')

  // Create users table first
  const createUserTable = `
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) UNIQUE NOT NULL,
      email_verified BOOLEAN DEFAULT FALSE,
      email_verified_at TIMESTAMPTZ,
      password_hash VARCHAR(255) NOT NULL,
      first_name VARCHAR(100),
      last_name VARCHAR(100),
      phone VARCHAR(20),
      phone_verified BOOLEAN DEFAULT FALSE,
      phone_verified_at TIMESTAMPTZ,
      avatar_url TEXT,
      role VARCHAR(20) DEFAULT 'USER',
      account_status VARCHAR(30) DEFAULT 'PENDING_VERIFICATION',
      failed_login_attempts INT DEFAULT 0,
      locked_until TIMESTAMPTZ,
      last_login_at TIMESTAMPTZ,
      last_login_ip VARCHAR(45),
      data_deletion_requested BOOLEAN DEFAULT FALSE,
      data_deletion_requested_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `

  // We'll use the PostgREST API to create tables via raw SQL execution
  // But Supabase doesn't allow direct SQL execution via REST API
  // We need to use the SQL endpoint or Prisma with correct credentials
  
  console.log('⚠️ Direct SQL execution via REST API requires proper setup.')
  console.log('Please follow these steps:\n')
  console.log('1. Open: https://supabase.com/dashboard/project/ehieczmqbhqrtnrtthob/sql')
  console.log('2. Click "New Query"')
  console.log('3. Copy the contents of supabase-schema.sql')
  console.log('4. Paste and click Run\n')
}

async function main() {
  console.log('📋 LUMINVERA Database Setup\n')
  console.log('Supabase Project:', SUPABASE_URL)
  console.log('')

  // Read the SQL file
  const sqlPath = path.join(process.cwd(), 'supabase-schema.sql')
  
  if (!fs.existsSync(sqlPath)) {
    console.error('❌ supabase-schema.sql not found')
    return
  }

  const sql = fs.readFileSync(sqlPath, 'utf8')
  console.log(`📄 SQL Schema loaded (${sql.length} characters)\n`)

  await createTableDirectly()

  // Try Prisma approach with different connection string format
  console.log('🔄 Trying Prisma with direct connection...\n')
  
  // Try alternative connection string format
  const altUrl = 'postgresql://postgres:%40Rm112233%40Hadi@db.ehieczmqbhqrtnrtthob.supabase.co:5432/postgres'
  
  console.log('Alternative connection string format:')
  console.log('  postgresql://postgres:[PASSWORD]@db.ehieczmqbhqrtnrtthob.supabase.co:5432/postgres')
  console.log('')
  console.log('Run this command manually:')
  console.log('  DATABASE_URL="postgresql://postgres:%40Rm112233%40Hadi@db.ehieczmqbhqrtnrtthob.supabase.co:5432/postgres" bun prisma db push')
}

main()
