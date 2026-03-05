-- LUMINVERA - Coupons and Flash Sales Tables Setup
-- Copy this and paste into: https://supabase.com/dashboard/project/ehieczmqbhqrtnrtthob/sql/new
-- Then click "Run"

-- ============================================
-- COUPONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  
  -- Coupon Type: PERCENTAGE, FIXED, FREE_SHIPPING, BUY_X_GET_Y
  type VARCHAR(20) NOT NULL DEFAULT 'PERCENTAGE',
  
  -- Discount Value (percentage or fixed amount)
  discount_value FLOAT NOT NULL DEFAULT 0,
  
  -- Max discount cap for percentage coupons
  max_discount_amount FLOAT,
  
  -- Minimum order value to apply coupon
  min_order_value FLOAT,
  
  -- Usage limits
  max_uses INT,
  max_uses_per_user INT,
  current_uses INT DEFAULT 0,
  
  -- Applicability (JSON arrays of IDs)
  applicable_categories TEXT, -- JSON array of category IDs
  applicable_products TEXT,   -- JSON array of product IDs
  applicable_sellers TEXT,    -- JSON array of seller IDs
  applicable_users TEXT,      -- JSON array of user IDs for targeted coupons
  
  -- First-time user only flag
  first_time_user_only BOOLEAN DEFAULT FALSE,
  
  -- Validity period
  valid_from TIMESTAMPTZ NOT NULL,
  valid_until TIMESTAMPTZ NOT NULL,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick code lookup
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON coupons(is_active);
CREATE INDEX IF NOT EXISTS idx_coupons_validity ON coupons(valid_from, valid_until);

-- ============================================
-- COUPON USAGES TABLE (Track usage per user)
-- ============================================

CREATE TABLE IF NOT EXISTS coupon_usages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  
  discount_applied FLOAT NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(coupon_id, user_id, order_id)
);

CREATE INDEX IF NOT EXISTS idx_coupon_usages_coupon ON coupon_usages(coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usages_user ON coupon_usages(user_id);

-- ============================================
-- FLASH SALES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS flash_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Sale period
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  
  -- Visual customization
  banner_url TEXT,
  theme VARCHAR(50) DEFAULT 'default', -- default, dark, festive, etc.
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_flash_sales_active ON flash_sales(is_active);
CREATE INDEX IF NOT EXISTS idx_flash_sales_period ON flash_sales(starts_at, ends_at);

-- ============================================
-- FLASH SALE ITEMS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS flash_sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flash_sale_id UUID NOT NULL REFERENCES flash_sales(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  
  -- Discount
  discount_percentage FLOAT NOT NULL CHECK (discount_percentage > 0 AND discount_percentage < 100),
  flash_price FLOAT NOT NULL, -- Pre-calculated sale price
  
  -- Stock limit for flash sale
  stock_limit INT,
  sold_count INT DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(flash_sale_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_flash_sale_items_sale ON flash_sale_items(flash_sale_id);
CREATE INDEX IF NOT EXISTS idx_flash_sale_items_product ON flash_sale_items(product_id);

-- ============================================
-- UPDATE PRODUCTS TABLE FOR FLASH SALE
-- ============================================

-- Add flash sale columns to products if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'is_flash_sale') THEN
    ALTER TABLE products ADD COLUMN is_flash_sale BOOLEAN DEFAULT FALSE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'discount_starts_at') THEN
    ALTER TABLE products ADD COLUMN discount_starts_at TIMESTAMPTZ;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'discount_ends_at') THEN
    ALTER TABLE products ADD COLUMN discount_ends_at TIMESTAMPTZ;
  END IF;
END $$;

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_coupons_updated_at BEFORE UPDATE ON coupons FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_flash_sales_updated_at BEFORE UPDATE ON flash_sales FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_flash_sale_items_updated_at BEFORE UPDATE ON flash_sale_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- FUNCTION TO INCREMENT COUPON USAGE
-- ============================================

CREATE OR REPLACE FUNCTION increment_coupon_usage(coupon_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE coupons 
  SET current_uses = current_uses + 1 
  WHERE id = coupon_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- SAMPLE DATA (Optional - Comment out if not needed)
-- ============================================

-- Insert sample coupons
INSERT INTO coupons (code, name, type, discount_value, max_discount_amount, min_order_value, max_uses, valid_from, valid_until, is_active) VALUES
('WELCOME10', 'Welcome Discount', 'PERCENTAGE', 10, 500, 1000, 1000, NOW(), NOW() + INTERVAL '30 days', true),
('FLAT200', 'Flat PKR 200 Off', 'FIXED', 200, NULL, 1500, 500, NOW(), NOW() + INTERVAL '15 days', true),
('FREESHIP', 'Free Shipping', 'FREE_SHIPPING', 0, NULL, 500, 2000, NOW(), NOW() + INTERVAL '7 days', true),
('SAVE20', '20% Off Electronics', 'PERCENTAGE', 20, 1000, 2000, 300, NOW(), NOW() + INTERVAL '20 days', true)
ON CONFLICT (code) DO NOTHING;

-- Insert sample flash sale
INSERT INTO flash_sales (name, description, starts_at, ends_at, theme, is_active) VALUES
('Summer Sale', 'Biggest discounts of the season!', NOW(), NOW() + INTERVAL '3 days', 'festive', true),
('Weekend Flash Deal', 'Limited time offers on top products', NOW() + INTERVAL '2 days', NOW() + INTERVAL '4 days', 'default', true)
ON CONFLICT DO NOTHING;

-- ============================================
-- VIEWS FOR EASY QUERYING
-- ============================================

-- Active coupons view
CREATE OR REPLACE VIEW active_coupons AS
SELECT * FROM coupons
WHERE is_active = true
  AND valid_from <= NOW()
  AND valid_until >= NOW();

-- Active flash sales view
CREATE OR REPLACE VIEW active_flash_sales AS
SELECT 
  fs.*,
  COUNT(fsi.id) as product_count,
  SUM(fsi.sold_count) as total_sold
FROM flash_sales fs
LEFT JOIN flash_sale_items fsi ON fs.id = fsi.flash_sale_id
WHERE fs.is_active = true
  AND fs.starts_at <= NOW()
  AND fs.ends_at >= NOW()
GROUP BY fs.id;

-- Upcoming flash sales view
CREATE OR REPLACE VIEW upcoming_flash_sales AS
SELECT * FROM flash_sales
WHERE is_active = true
  AND starts_at > NOW()
ORDER BY starts_at ASC;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

SELECT 'LUMINVERA Coupons & Flash Sales setup complete!' as status;
