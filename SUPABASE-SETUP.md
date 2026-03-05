# LUMINVERA - Supabase Setup Guide

## 🚀 Quick Setup

### Step 1: Get Your Database Password

1. Go to [Supabase Dashboard > Database Settings](https://supabase.com/dashboard/project/ehieczmqbhqrtnrtthob/settings/database)
2. Find the **Database Password** section
3. Copy your password (or click "Reset database password" to create a new one)

### Step 2: Update Environment Variables

Edit the `.env` file and replace `[YOUR-PASSWORD]` with your actual database password:

```env
DATABASE_URL="postgresql://postgres.ehieczmqbhqrtnrtthob:YOUR_ACTUAL_PASSWORD@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.ehieczmqbhqrtnrtthob:YOUR_ACTUAL_PASSWORD@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"
```

**Note:** If your password contains special characters like `@`, `#`, `%`, etc., you need to URL-encode them:
- `@` → `%40`
- `#` → `%23`
- `%` → `%25`
- `&` → `%26`
- `+` → `%2B`

### Step 3: Create Database Schema

**Option A: Using Supabase SQL Editor (Recommended)**

1. Open [Supabase SQL Editor](https://supabase.com/dashboard/project/ehieczmqbhqrtnrtthob/sql)
2. Create a new query
3. Copy the entire contents of `supabase-schema.sql` from this project
4. Paste it into the editor
5. Click **Run**

**Option B: Using Prisma (After setting up password)**

```bash
bun run db:push
```

### Step 4: Seed Initial Data

After the schema is created, run:

```bash
bun run db:seed
```

Or use the Supabase setup script:

```bash
bunx tsx scripts/setup-supabase.ts
```

### Step 5: Test the Application

The application should now be running at the preview URL.

## 📋 Test Accounts

After seeding, you can log in with these accounts:

| Role | Email | Password |
|------|-------|----------|
| **Admin** | admin@luminvera.pk | admin123 |
| **Seller** | seller@luminvera.pk | seller123 |
| **Customer** | customer@luminvera.pk | customer123 |

## 🔧 Available Scripts

| Script | Description |
|--------|-------------|
| `bun run dev` | Start development server |
| `bun run lint` | Run ESLint |
| `bun run db:push` | Push Prisma schema to database |
| `bun run db:generate` | Generate Prisma client |
| `bun run db:seed` | Seed initial data |

## 🗄️ Database Schema

The schema includes 40+ tables covering:

- **Users & Auth**: Users, Sessions, Login History, Verification Tokens
- **Sellers**: Seller Profiles, Warnings, Payouts
- **Products**: Products, Variants, Attributes, Categories
- **Orders**: Orders, Order Items, Payments, Refunds
- **Finance**: Wallets, Transactions
- **Support**: Disputes, Support Tickets
- **Marketing**: Coupons, Flash Sales
- **Content**: Banners, Homepage Sections

## 🛡️ Security Features

- Row Level Security (RLS) policies
- Database-level role enforcement
- Brute force protection
- Session management
- Audit logging

## ❓ Troubleshooting

### "Can't reach database server"
- Check your DATABASE_URL is correct
- Make sure password is URL-encoded
- Verify your IP is allowed (Supabase Dashboard > Settings > Database > Connection Pooling)

### "Relation does not exist"
- Run the SQL schema first in Supabase SQL Editor
- Or run `bun run db:push`

### "Permission denied"
- Make sure you're using the correct connection string
- Check if RLS policies are properly set

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Prisma with Supabase](https://www.prisma.io/docs/guides/database/supabase)
- [Next.js Documentation](https://nextjs.org/docs)
