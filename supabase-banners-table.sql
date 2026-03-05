-- Run this SQL to add the banners table
-- Go to: https://supabase.com/dashboard/project/ehieczmqbhqrtnrtthob/sql/new

CREATE TABLE IF NOT EXISTS banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  subtitle VARCHAR(500),
  image_url TEXT NOT NULL,
  link_url TEXT,
  button_text VARCHAR(100),
  position VARCHAR(20) DEFAULT 'hero',
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert sample banner
INSERT INTO banners (title, subtitle, image_url, position, is_active, sort_order) VALUES
('Flash Sale!', 'Up to 70% off on Electronics', 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1200', 'hero', true, 1),
('New Arrivals', 'Check out the latest products', 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200', 'hero', true, 2);

SELECT 'Banners table created successfully!' as status;
