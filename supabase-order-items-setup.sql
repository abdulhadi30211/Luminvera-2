-- ============================================
-- LUMINVERA - Order Items Table Setup
-- Run this SQL in Supabase SQL Editor
-- ============================================

-- Check if order_items table exists, create if not
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Order reference
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    
    -- Product reference
    product_id UUID NOT NULL REFERENCES products(id),
    variant_id UUID REFERENCES product_variants(id),
    
    -- Seller reference
    seller_id UUID NOT NULL REFERENCES sellers(id),
    
    -- Product snapshot (at time of order)
    product_name VARCHAR(255) NOT NULL,
    product_sku VARCHAR(100) NOT NULL,
    product_image_url TEXT,
    variant_attributes JSONB,
    
    -- Pricing
    unit_price DECIMAL(12, 2) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    total_price DECIMAL(12, 2) NOT NULL,
    
    -- Commission
    commission_rate DECIMAL(5, 2) DEFAULT 10.00,
    commission_amount DECIMAL(12, 2) DEFAULT 0.00,
    seller_earnings DECIMAL(12, 2) DEFAULT 0.00,
    
    -- Status
    item_status VARCHAR(50) DEFAULT 'PLACED',
    
    -- Delivery
    delivered_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT positive_quantity CHECK (quantity > 0),
    CONSTRAINT positive_price CHECK (unit_price >= 0),
    CONSTRAINT positive_total CHECK (total_price >= 0)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_order_items_seller_id ON order_items(seller_id);
CREATE INDEX IF NOT EXISTS idx_order_items_status ON order_items(item_status);
CREATE INDEX IF NOT EXISTS idx_order_items_variant_id ON order_items(variant_id);

-- Create composite index for common queries
CREATE INDEX IF NOT EXISTS idx_order_items_seller_status ON order_items(seller_id, item_status);
CREATE INDEX IF NOT EXISTS idx_order_items_order_product ON order_items(order_id, product_id);

-- Add comments to columns
COMMENT ON TABLE order_items IS 'Order line items - each product in an order';
COMMENT ON COLUMN order_items.id IS 'Unique identifier for the order item';
COMMENT ON COLUMN order_items.order_id IS 'Reference to the parent order';
COMMENT ON COLUMN order_items.product_id IS 'Reference to the product';
COMMENT ON COLUMN order_items.variant_id IS 'Reference to product variant if applicable';
COMMENT ON COLUMN order_items.seller_id IS 'Reference to the seller of this product';
COMMENT ON COLUMN order_items.product_name IS 'Snapshot of product name at order time';
COMMENT ON COLUMN order_items.product_sku IS 'Snapshot of product SKU at order time';
COMMENT ON COLUMN order_items.product_image_url IS 'Product image URL';
COMMENT ON COLUMN order_items.variant_attributes IS 'JSON of variant attributes like color, size';
COMMENT ON COLUMN order_items.unit_price IS 'Price per unit at order time';
COMMENT ON COLUMN order_items.quantity IS 'Quantity ordered';
COMMENT ON COLUMN order_items.total_price IS 'Total price (unit_price * quantity)';
COMMENT ON COLUMN order_items.commission_rate IS 'Commission percentage for this item';
COMMENT ON COLUMN order_items.commission_amount IS 'Commission amount in PKR';
COMMENT ON COLUMN order_items.seller_earnings IS 'Seller earnings after commission';
COMMENT ON COLUMN order_items.item_status IS 'Status of this line item (PLACED, SHIPPED, DELIVERED, etc.)';
COMMENT ON COLUMN order_items.delivered_at IS 'When this item was delivered';

-- Enable RLS (Row Level Security)
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own order items
CREATE POLICY "Users can view their own order items" ON order_items
    FOR SELECT
    USING (
        order_id IN (
            SELECT id FROM orders WHERE user_id = auth.uid()
        )
    );

-- RLS Policy: Sellers can view items from their orders
CREATE POLICY "Sellers can view their order items" ON order_items
    FOR SELECT
    USING (
        seller_id IN (
            SELECT id FROM sellers WHERE user_id = auth.uid()
        )
    );

-- RLS Policy: Admins can view all order items
CREATE POLICY "Admins can view all order items" ON order_items
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('ADMIN', 'SUPER_ADMIN')
        )
    );

-- RLS Policy: Service role has full access
CREATE POLICY "Service role has full access" ON order_items
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Trigger to update seller earnings when order item is delivered
CREATE OR REPLACE FUNCTION update_seller_earnings_on_delivery()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.item_status = 'DELIVERED' AND (OLD.item_status IS NULL OR OLD.item_status != 'DELIVERED') THEN
        UPDATE sellers
        SET 
            total_earnings = total_earnings + NEW.seller_earnings,
            available_balance = available_balance + NEW.seller_earnings,
            total_sales = total_sales + NEW.quantity
        WHERE id = NEW.seller_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_seller_earnings ON order_items;
CREATE TRIGGER trigger_update_seller_earnings
    AFTER UPDATE ON order_items
    FOR EACH ROW
    EXECUTE FUNCTION update_seller_earnings_on_delivery();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON order_items TO service_role;
GRANT SELECT ON order_items TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Verify the table was created
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'order_items' 
ORDER BY ordinal_position;
