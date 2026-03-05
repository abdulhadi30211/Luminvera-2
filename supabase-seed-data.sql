-- LUMINVERA - Seed Data
-- Run this in Supabase SQL Editor after creating the tables
-- Go to: https://supabase.com/dashboard/project/ehieczmqbhqrtnrtthob/sql/new

-- First, create an admin user (password: admin123)
INSERT INTO users (id, email, password_hash, first_name, last_name, role, account_status, email_verified, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'admin@luminvera.pk',
  '240be518fabd2724ddb6f04eeb9d5b0b8e4e6b9e8c4e5a7b8c9d0e1f2a3b4c5d6',
  'Admin',
  'User',
  'ADMIN',
  'ACTIVE',
  true,
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Create a seller user (password: seller123)
INSERT INTO users (id, email, password_hash, first_name, last_name, phone, role, account_status, email_verified, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  'seller@luminvera.pk',
  '240be518fabd2724ddb6f04eeb9d5b0b8e4e6b9e8c4e5a7b8c9d0e1f2a3b4c5d6',
  'Ahmed',
  'Khan',
  '+92-300-1234567',
  'SELLER',
  'ACTIVE',
  true,
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Create a customer user (password: customer123)
INSERT INTO users (id, email, password_hash, first_name, last_name, phone, role, account_status, email_verified, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000003',
  'customer@luminvera.pk',
  '240be518fabd2724ddb6f04eeb9d5b0b8e4e6b9e8c4e5a7b8c9d0e1f2a3b4c5d6',
  'Ali',
  'Ahmed',
  '+92-300-9876543',
  'USER',
  'ACTIVE',
  true,
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Create seller profile
INSERT INTO sellers (id, user_id, store_name, store_slug, store_description, seller_status, verified_at, total_sales, total_orders, total_products, average_rating, total_reviews, commission_rate, total_earnings, available_balance, is_featured, is_top_seller, created_at)
VALUES (
  '10000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  'TechZone Pakistan',
  'techzone-pakistan',
  'Your trusted source for electronics and gadgets in Pakistan. Quality products with warranty.',
  'VERIFIED',
  NOW(),
  1250,
  890,
  45,
  4.8,
  256,
  10.0,
  1250000,
  450000,
  true,
  true,
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Create second seller
INSERT INTO sellers (id, user_id, store_name, store_slug, store_description, seller_status, verified_at, total_sales, total_orders, total_products, average_rating, total_reviews, commission_rate, total_earnings, available_balance, created_at)
SELECT 
  '10000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000003',
  'Fashion Hub',
  'fashion-hub',
  'Trendy fashion at affordable prices. Latest styles for men and women.',
  'VERIFIED',
  NOW(),
  850,
  620,
  120,
  4.6,
  189,
  12.0,
  780000,
  230000,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM sellers WHERE id = '10000000-0000-0000-0000-000000000002');

-- Update categories with more details
UPDATE categories SET description = 'Electronic devices, gadgets, and accessories', default_commission = 8.0 WHERE slug = 'electronics';
UPDATE categories SET description = 'Clothing, shoes, bags, and accessories', default_commission = 12.0 WHERE slug = 'fashion';
UPDATE categories SET description = 'Furniture, decor, and home essentials', default_commission = 10.0 WHERE slug = 'home-living';
UPDATE categories SET description = 'Skincare, makeup, and personal care', default_commission = 15.0 WHERE slug = 'beauty';
UPDATE categories SET description = 'Sports equipment and fitness gear', default_commission = 10.0 WHERE slug = 'sports';

-- Add more categories
INSERT INTO categories (id, name, slug, description, default_commission, is_active, created_at) VALUES
('20000000-0000-0000-0000-000000000001', 'Mobiles & Tablets', 'mobiles-tablets', 'Smartphones, tablets, and accessories', 8.0, true, NOW()),
('20000000-0000-0000-0000-000000000002', 'Appliances', 'appliances', 'Home and kitchen appliances', 10.0, true, NOW()),
('20000000-0000-0000-0000-000000000003', 'Grocery', 'grocery', 'Food items and everyday essentials', 5.0, true, NOW()),
('20000000-0000-0000-0000-000000000004', 'Books & Stationery', 'books-stationery', 'Books, notebooks, and office supplies', 8.0, true, NOW())
ON CONFLICT (slug) DO NOTHING;

-- Create sample products
INSERT INTO products (id, seller_id, sku, name, slug, description, category_id, product_status, base_price, compare_at_price, discount_percentage, stock_quantity, free_shipping, shipping_fee, average_rating, total_reviews, is_featured, is_new_arrival, is_best_seller, warranty_period, created_at) VALUES
-- Electronics
('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'SKU001', 'Wireless Bluetooth Headphones Pro Max', 'wireless-bluetooth-headphones-pro-max', 'High-quality wireless headphones with active noise cancellation, 40-hour battery life, premium sound quality, and comfortable over-ear design. Perfect for music lovers and professionals.', '20000000-0000-0000-0000-000000000001', 'LIVE', 8999, 14999, 40, 50, true, 0, 4.8, 256, true, true, true, '12 months', NOW()),

('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'SKU002', 'Smart Watch Series X Pro', 'smart-watch-series-x-pro', 'Advanced smartwatch with health monitoring, GPS tracking, 7-day battery life, and water resistance up to 50m. Track your fitness goals effortlessly.', '20000000-0000-0000-0000-000000000001', 'LIVE', 24999, 34999, 29, 30, true, 0, 4.6, 189, true, false, true, '12 months', NOW()),

('30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'SKU003', '20000mAh Power Bank Fast Charging', '20000mah-power-bank-fast-charging', 'High capacity power bank with 65W fast charging, dual USB-C ports, LED display. Charge multiple devices at once.', '20000000-0000-0000-0000-000000000001', 'LIVE', 5999, 8999, 33, 100, false, 150, 4.4, 234, false, false, true, '6 months', NOW()),

('30000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', 'SKU004', 'Mechanical Gaming Keyboard RGB', 'mechanical-gaming-keyboard-rgb', 'Mechanical keyboard with RGB backlight, Cherry MX switches, programmable keys. Built for gamers and professionals.', '20000000-0000-0000-0000-000000000001', 'LIVE', 7999, 12999, 38, 45, true, 0, 4.7, 145, true, true, false, '24 months', NOW()),

-- Fashion
('30000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000002', 'SKU005', 'Premium Cotton T-Shirt Pack (3 pcs)', 'premium-cotton-tshirt-pack', 'Set of 3 premium cotton t-shirts in classic colors. Breathable fabric, comfortable fit. Perfect for everyday wear.', (SELECT id FROM categories WHERE slug = 'fashion'), 'LIVE', 2499, 3999, 38, 200, false, 150, 4.5, 456, true, false, false, NULL, NOW()),

('30000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000002', 'SKU006', 'Men Casual Jeans Slim Fit', 'men-casual-jeans-slim-fit', 'Premium quality denim jeans with modern slim fit. Comfortable stretch fabric for all-day wear.', (SELECT id FROM categories WHERE slug = 'fashion'), 'LIVE', 3499, 4999, 30, 150, false, 200, 4.3, 89, false, true, false, NULL, NOW()),

-- Home & Living
('30000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000001', 'SKU007', 'Modern LED Table Lamp', 'modern-led-table-lamp', 'Minimalist LED table lamp with adjustable brightness and color temperature. USB charging port included.', (SELECT id FROM categories WHERE slug = 'home-living'), 'LIVE', 3499, 4999, 30, 75, false, 200, 4.7, 98, false, true, false, '6 months', NOW()),

-- Beauty
('30000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000002', 'SKU008', 'Organic Face Serum Collection', 'organic-face-serum-collection', 'Set of 3 organic face serums for hydration, brightening, and anti-aging. Natural ingredients for glowing skin.', (SELECT id FROM categories WHERE slug = 'beauty'), 'LIVE', 4999, 7999, 38, 40, true, 0, 4.9, 167, true, false, true, NULL, NOW()),

-- Sports
('30000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000001', 'SKU009', 'Yoga Mat Premium 6mm', 'yoga-mat-premium-6mm', 'Extra thick yoga mat with non-slip surface, eco-friendly material, carrying strap included. Perfect for home workouts.', (SELECT id FROM categories WHERE slug = 'sports'), 'LIVE', 2999, 4499, 33, 60, false, 200, 4.6, 89, false, true, false, NULL, NOW()),

-- Mobiles
('30000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000001', 'SKU010', 'Wireless Earbuds Pro ANC', 'wireless-earbuds-pro-anc', 'True wireless earbuds with active noise cancellation, 30-hour battery, IPX5 water resistance. Premium sound quality.', '20000000-0000-0000-0000-000000000001', 'LIVE', 12999, 18999, 32, 80, true, 0, 4.7, 234, true, true, true, '12 months', NOW())

ON CONFLICT (sku) DO NOTHING;

-- Create a sample order
INSERT INTO orders (id, order_number, user_id, status, subtotal, discount, delivery_fee, tax, total, payment_method, payment_status, shipping_recipient_name, shipping_phone, shipping_province, shipping_city, shipping_street_address, placed_at, created_at)
VALUES (
  '40000000-0000-0000-0000-000000000001',
  'ORD-2025-000001',
  '00000000-0000-0000-0000-000000000003',
  'DELIVERED',
  8999,
  0,
  0,
  0,
  8999,
  'COD',
  'COMPLETED',
  'Ali Ahmed',
  '+92-300-9876543',
  'Punjab',
  'Lahore',
  '123 Main Boulevard, Gulberg III',
  NOW() - INTERVAL '7 days',
  NOW() - INTERVAL '7 days'
) ON CONFLICT (order_number) DO NOTHING;

-- Create order item
INSERT INTO order_items (id, order_id, product_id, seller_id, product_name, product_sku, unit_price, quantity, total_price, commission_rate, commission_amount, seller_earnings, item_status, created_at)
VALUES (
  '50000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'Wireless Bluetooth Headphones Pro Max',
  'SKU001',
  8999,
  1,
  8999,
  10.0,
  899.9,
  8099.1,
  'DELIVERED',
  NOW() - INTERVAL '7 days'
) ON CONFLICT DO NOTHING;

-- Success message
SELECT '✅ LUMINVERA seed data inserted successfully!' as status;
SELECT '📧 Admin: admin@luminvera.pk / admin123' as admin_credentials;
SELECT '📧 Seller: seller@luminvera.pk / seller123' as seller_credentials;
SELECT '📧 Customer: customer@luminvera.pk / customer123' as customer_credentials;
