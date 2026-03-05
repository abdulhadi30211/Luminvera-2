-- ============================================
-- LUMINVERA Additional Tables
-- Run this SQL in Supabase SQL Editor
-- ============================================

-- 1. Banners Table
CREATE TABLE IF NOT EXISTS banners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    subtitle TEXT,
    image_url TEXT,
    link_url TEXT,
    position VARCHAR(50) DEFAULT 'hero', -- hero, promotional, category, sidebar
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Flash Sales Table
CREATE TABLE IF NOT EXISTS flash_sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    discount_percentage DECIMAL(5,2) DEFAULT 0,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    product_ids TEXT, -- JSON array of product IDs
    category_ids TEXT, -- JSON array of category IDs
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Coupons Table
CREATE TABLE IF NOT EXISTS coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- PERCENTAGE, FIXED, FREE_SHIPPING
    discount_value DECIMAL(10,2) NOT NULL,
    max_discount_amount DECIMAL(10,2),
    min_order_value DECIMAL(10,2),
    max_uses INTEGER,
    max_uses_per_user INTEGER DEFAULT 1,
    current_uses INTEGER DEFAULT 0,
    applicable_categories TEXT, -- JSON array
    applicable_products TEXT, -- JSON array
    first_time_user_only BOOLEAN DEFAULT false,
    valid_from TIMESTAMP WITH TIME ZONE NOT NULL,
    valid_until TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Seller Payouts Table
CREATE TABLE IF NOT EXISTS seller_payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, PROCESSING, COMPLETED, FAILED
    period_start TIMESTAMP WITH TIME ZONE,
    period_end TIMESTAMP WITH TIME ZONE,
    bank_name VARCHAR(255),
    bank_account_number VARCHAR(100),
    transaction_reference VARCHAR(255),
    processed_at TIMESTAMP WITH TIME ZONE,
    processed_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Product Approvals Table
CREATE TABLE IF NOT EXISTS product_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL,
    seller_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL, -- approved, rejected, requested_changes
    notes TEXT,
    reviewed_by UUID,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Audit Log Table
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    user_role VARCHAR(50),
    action VARCHAR(255) NOT NULL,
    entity_type VARCHAR(100),
    entity_id UUID,
    old_value TEXT, -- JSON
    new_value TEXT, -- JSON
    ip_address VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Platform Config Table (if not exists)
CREATE TABLE IF NOT EXISTS platform_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(255) UNIQUE NOT NULL,
    value TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default platform config if not exists
INSERT INTO platform_config (key, value, description)
VALUES 
    ('siteName', 'LUMINVERA', 'Website name'),
    ('siteTagline', 'Pakistan''s #1 Marketplace', 'Website tagline'),
    ('primaryColor', 'emerald', 'Primary theme color'),
    ('contactEmail', 'support@luminvera.pk', 'Contact email'),
    ('supportPhone', '+92 300 1234567', 'Support phone'),
    ('defaultCurrency', 'PKR', 'Default currency'),
    ('defaultCommissionRate', '10', 'Default seller commission rate'),
    ('freeShippingThreshold', '5000', 'Free shipping minimum order'),
    ('defaultShippingFee', '150', 'Default shipping fee'),
    ('codEnabled', 'true', 'COD enabled'),
    ('codFee', '100', 'COD fee amount'),
    ('jazzcashEnabled', 'false', 'JazzCash enabled'),
    ('easypaisaEnabled', 'false', 'EasyPaisa enabled'),
    ('stripeEnabled', 'false', 'Stripe enabled')
ON CONFLICT (key) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_banners_position ON banners(position);
CREATE INDEX IF NOT EXISTS idx_banners_active ON banners(is_active);
CREATE INDEX IF NOT EXISTS idx_flash_sales_active ON flash_sales(is_active);
CREATE INDEX IF NOT EXISTS idx_flash_sales_time ON flash_sales(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON coupons(is_active);
CREATE INDEX IF NOT EXISTS idx_seller_payouts_seller ON seller_payouts(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_payouts_status ON seller_payouts(status);
CREATE INDEX IF NOT EXISTS idx_product_approvals_product ON product_approvals(product_id);
CREATE INDEX IF NOT EXISTS idx_product_approvals_seller ON product_approvals(seller_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id);

-- Insert sample flash sale
INSERT INTO flash_sales (title, description, discount_percentage, start_time, end_time, is_active)
VALUES 
    ('Mega Flash Sale', 'Up to 50% off on Electronics & Fashion!', 50.00, NOW(), NOW() + INTERVAL '7 days', true)
ON CONFLICT DO NOTHING;

-- Insert sample banners
INSERT INTO banners (title, subtitle, position, is_active, sort_order)
VALUES 
    ('Welcome to LUMINVERA', 'Shop the best products from trusted sellers', 'hero', true, 1),
    ('Flash Sale!', 'Up to 70% off on selected items', 'promotional', true, 2)
ON CONFLICT DO NOTHING;

-- Insert sample coupon
INSERT INTO coupons (code, name, type, discount_value, min_order_value, valid_from, valid_until, is_active)
VALUES 
    ('WELCOME10', 'Welcome Discount', 'PERCENTAGE', 10.00, 500.00, NOW(), NOW() + INTERVAL '1 year', true),
    ('FLAT500', 'Flat Rs. 500 Off', 'FIXED', 500.00, 2000.00, NOW(), NOW() + INTERVAL '6 months', true)
ON CONFLICT (code) DO NOTHING;
