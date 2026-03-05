// Standalone seeding script - run with: bun run prisma/seed-platform.ts
import { PrismaClient, ServiceCategory, ToolCategory } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting platform data seeding...')

  let servicesCreated = 0
  let featuresCreated = 0
  let toolsCreated = 0
  let palettesCreated = 0

  // ========== SERVICES (100+ services) ==========

  const allServices = [
    // Payment Services (15)
    { name: 'JazzCash', slug: 'jazzcash', category: 'PAYMENT', provider: 'JazzCash', isEnabled: true },
    { name: 'EasyPaisa', slug: 'easypaisa', category: 'PAYMENT', provider: 'Telenor', isEnabled: true },
    { name: 'Raast', slug: 'raast', category: 'PAYMENT', provider: 'State Bank of Pakistan', isEnabled: true },
    { name: 'HBL Payment Gateway', slug: 'hbl-payment', category: 'PAYMENT', provider: 'HBL', isEnabled: false },
    { name: 'UBL Payment Gateway', slug: 'ubl-payment', category: 'PAYMENT', provider: 'UBL', isEnabled: false },
    { name: 'Bank Alfalah Payment', slug: 'alfalah-payment', category: 'PAYMENT', provider: 'Bank Alfalah', isEnabled: false },
    { name: 'Meezan Bank Payment', slug: 'meezan-payment', category: 'PAYMENT', provider: 'Meezan Bank', isEnabled: false },
    { name: 'Stripe Integration', slug: 'stripe', category: 'PAYMENT', provider: 'Stripe', isEnabled: false },
    { name: 'PayPal Integration', slug: 'paypal', category: 'PAYMENT', provider: 'PayPal', isEnabled: false },
    { name: 'Payoneer', slug: 'payoneer', category: 'PAYMENT', provider: 'Payoneer', isEnabled: false },
    { name: '2Checkout', slug: '2checkout', category: 'PAYMENT', provider: '2Checkout', isEnabled: false },
    { name: 'SadaPay Business', slug: 'sadapay', category: 'PAYMENT', provider: 'SadaPay', isEnabled: true },
    { name: 'NayaPay', slug: 'nayapay', category: 'PAYMENT', provider: 'NayaPay', isEnabled: true },
    { name: 'Keenu Wallet', slug: 'keenu', category: 'PAYMENT', provider: 'Keenu', isEnabled: false },
    { name: 'UPaisa', slug: 'upaisa', category: 'PAYMENT', provider: 'U Microfinance', isEnabled: false },

    // Shipping Services (15)
    { name: 'Leopards Courier', slug: 'leopards', category: 'SHIPPING', provider: 'Leopards', isEnabled: true },
    { name: 'TCS Express', slug: 'tcs', category: 'SHIPPING', provider: 'TCS', isEnabled: true },
    { name: 'M&P Express', slug: 'mnp', category: 'SHIPPING', provider: 'M&P', isEnabled: true },
    { name: 'Daewoo Express', slug: 'daewoo', category: 'SHIPPING', provider: 'Daewoo', isEnabled: true },
    { name: 'Pakistan Post', slug: 'pakpost', category: 'SHIPPING', provider: 'Pakistan Post', isEnabled: true },
    { name: 'Call Courier', slug: 'callcourier', category: 'SHIPPING', provider: 'Call Courier', isEnabled: true },
    { name: 'BlueEx', slug: 'blueex', category: 'SHIPPING', provider: 'BlueEx', isEnabled: true },
    { name: 'DHL Pakistan', slug: 'dhl', category: 'SHIPPING', provider: 'DHL', isEnabled: false },
    { name: 'FedEx Pakistan', slug: 'fedex', category: 'SHIPPING', provider: 'FedEx', isEnabled: false },
    { name: 'UPS Pakistan', slug: 'ups', category: 'SHIPPING', provider: 'UPS', isEnabled: false },
    { name: 'Bykea Delivery', slug: 'bykea', category: 'SHIPPING', provider: 'Bykea', isEnabled: true },
    { name: 'Careem Box', slug: 'careem-box', category: 'SHIPPING', provider: 'Careem', isEnabled: false },
    { name: 'PostEx', slug: 'postex', category: 'SHIPPING', provider: 'PostEx', isEnabled: true },
    { name: 'Trax', slug: 'trax', category: 'SHIPPING', provider: 'Trax', isEnabled: true },
    { name: 'Cheetay Logistics', slug: 'cheetay', category: 'SHIPPING', provider: 'Cheetay', isEnabled: false },

    // Communication Services (10)
    { name: 'Twilio SMS', slug: 'twilio-sms', category: 'COMMUNICATION', provider: 'Twilio', isEnabled: true },
    { name: 'SendGrid Email', slug: 'sendgrid', category: 'COMMUNICATION', provider: 'SendGrid', isEnabled: true },
    { name: 'Firebase Cloud Messaging', slug: 'fcm', category: 'COMMUNICATION', provider: 'Google', isEnabled: true },
    { name: 'WhatsApp Business API', slug: 'whatsapp', category: 'COMMUNICATION', provider: 'Meta', isEnabled: true },
    { name: 'SMS.to', slug: 'sms-to', category: 'COMMUNICATION', provider: 'SMS.to', isEnabled: false },
    { name: 'Mailgun', slug: 'mailgun', category: 'COMMUNICATION', provider: 'Mailgun', isEnabled: false },
    { name: 'Amazon SES', slug: 'amazon-ses', category: 'COMMUNICATION', provider: 'AWS', isEnabled: false },
    { name: 'MSG91', slug: 'msg91', category: 'COMMUNICATION', provider: 'MSG91', isEnabled: false },
    { name: 'Infobip', slug: 'infobip', category: 'COMMUNICATION', provider: 'Infobip', isEnabled: false },
    { name: 'Plivo', slug: 'plivo', category: 'COMMUNICATION', provider: 'Plivo', isEnabled: false },

    // Analytics Services (10)
    { name: 'Google Analytics', slug: 'google-analytics', category: 'ANALYTICS', provider: 'Google', isEnabled: true },
    { name: 'Mixpanel', slug: 'mixpanel', category: 'ANALYTICS', provider: 'Mixpanel', isEnabled: false },
    { name: 'Amplitude', slug: 'amplitude', category: 'ANALYTICS', provider: 'Amplitude', isEnabled: false },
    { name: 'Hotjar', slug: 'hotjar', category: 'ANALYTICS', provider: 'Hotjar', isEnabled: true },
    { name: 'Crazy Egg', slug: 'crazyegg', category: 'ANALYTICS', provider: 'Crazy Egg', isEnabled: false },
    { name: 'Heap Analytics', slug: 'heap', category: 'ANALYTICS', provider: 'Heap', isEnabled: false },
    { name: 'Segment', slug: 'segment', category: 'ANALYTICS', provider: 'Segment', isEnabled: false },
    { name: 'PostHog', slug: 'posthog', category: 'ANALYTICS', provider: 'PostHog', isEnabled: false },
    { name: 'Matomo', slug: 'matomo', category: 'ANALYTICS', provider: 'Matomo', isEnabled: false },
    { name: 'Plausible', slug: 'plausible', category: 'ANALYTICS', provider: 'Plausible', isEnabled: false },

    // Security Services (10)
    { name: 'Cloudflare WAF', slug: 'cloudflare-waf', category: 'SECURITY', provider: 'Cloudflare', isEnabled: true },
    { name: 'reCAPTCHA v3', slug: 'recaptcha', category: 'SECURITY', provider: 'Google', isEnabled: true },
    { name: 'hCaptcha', slug: 'hcaptcha', category: 'SECURITY', provider: 'hCaptcha', isEnabled: false },
    { name: 'AWS WAF', slug: 'aws-waf', category: 'SECURITY', provider: 'AWS', isEnabled: false },
    { name: 'Imperva', slug: 'imperva', category: 'SECURITY', provider: 'Imperva', isEnabled: false },
    { name: 'Akamai Security', slug: 'akamai', category: 'SECURITY', provider: 'Akamai', isEnabled: false },
    { name: 'Sucuri', slug: 'sucuri', category: 'SECURITY', provider: 'Sucuri', isEnabled: false },
    { name: 'Wordfence', slug: 'wordfence', category: 'SECURITY', provider: 'Wordfence', isEnabled: false },
    { name: 'SSL Labs', slug: 'ssllabs', category: 'SECURITY', provider: 'SSL Labs', isEnabled: true },
    { name: 'VirusTotal', slug: 'virustotal', category: 'SECURITY', provider: 'Google', isEnabled: false },

    // AI/ML Services (10)
    { name: 'OpenAI GPT-4', slug: 'openai-gpt4', category: 'AI_ML', provider: 'OpenAI', isEnabled: true, isPremium: true },
    { name: 'Google Gemini', slug: 'google-gemini', category: 'AI_ML', provider: 'Google', isEnabled: true },
    { name: 'Claude AI', slug: 'claude', category: 'AI_ML', provider: 'Anthropic', isEnabled: true },
    { name: 'Azure OpenAI', slug: 'azure-openai', category: 'AI_ML', provider: 'Microsoft', isEnabled: false },
    { name: 'AWS SageMaker', slug: 'sagemaker', category: 'AI_ML', provider: 'AWS', isEnabled: false },
    { name: 'Google Vision AI', slug: 'google-vision', category: 'AI_ML', provider: 'Google', isEnabled: true },
    { name: 'Amazon Rekognition', slug: 'rekognition', category: 'AI_ML', provider: 'AWS', isEnabled: false },
    { name: 'Hugging Face', slug: 'huggingface', category: 'AI_ML', provider: 'Hugging Face', isEnabled: false },
    { name: 'Stability AI', slug: 'stability', category: 'AI_ML', provider: 'Stability AI', isEnabled: false },
    { name: 'Replicate', slug: 'replicate', category: 'AI_ML', provider: 'Replicate', isEnabled: false },

    // Marketing Services (10)
    { name: 'Facebook Ads', slug: 'facebook-ads', category: 'MARKETING', provider: 'Meta', isEnabled: true },
    { name: 'Google Ads', slug: 'google-ads', category: 'MARKETING', provider: 'Google', isEnabled: true },
    { name: 'TikTok Ads', slug: 'tiktok-ads', category: 'MARKETING', provider: 'TikTok', isEnabled: true },
    { name: 'Mailchimp', slug: 'mailchimp', category: 'MARKETING', provider: 'Mailchimp', isEnabled: true },
    { name: 'HubSpot', slug: 'hubspot', category: 'MARKETING', provider: 'HubSpot', isEnabled: false },
    { name: 'Klaviyo', slug: 'klaviyo', category: 'MARKETING', provider: 'Klaviyo', isEnabled: false },
    { name: 'Braze', slug: 'braze', category: 'MARKETING', provider: 'Braze', isEnabled: false },
    { name: 'Iterable', slug: 'iterable', category: 'MARKETING', provider: 'Iterable', isEnabled: false },
    { name: 'Customer.io', slug: 'customerio', category: 'MARKETING', provider: 'Customer.io', isEnabled: false },
    { name: 'ActiveCampaign', slug: 'activecampaign', category: 'MARKETING', provider: 'ActiveCampaign', isEnabled: false },

    // Storage Services (8)
    { name: 'AWS S3', slug: 'aws-s3', category: 'STORAGE', provider: 'AWS', isEnabled: true },
    { name: 'Google Cloud Storage', slug: 'gcs', category: 'STORAGE', provider: 'Google', isEnabled: true },
    { name: 'Azure Blob Storage', slug: 'azure-blob', category: 'STORAGE', provider: 'Microsoft', isEnabled: false },
    { name: 'Cloudflare R2', slug: 'cloudflare-r2', category: 'STORAGE', provider: 'Cloudflare', isEnabled: true },
    { name: 'Backblaze B2', slug: 'backblaze', category: 'STORAGE', provider: 'Backblaze', isEnabled: false },
    { name: 'DigitalOcean Spaces', slug: 'do-spaces', category: 'STORAGE', provider: 'DigitalOcean', isEnabled: false },
    { name: 'Wasabi', slug: 'wasabi', category: 'STORAGE', provider: 'Wasabi', isEnabled: false },
    { name: 'MinIO', slug: 'minio', category: 'STORAGE', provider: 'MinIO', isEnabled: false },

    // Verification Services (6)
    { name: 'NADRA Verisys', slug: 'nadra-verisys', category: 'VERIFICATION', provider: 'NADRA', isEnabled: true },
    { name: 'Onfido', slug: 'onfido', category: 'VERIFICATION', provider: 'Onfido', isEnabled: false },
    { name: 'Jumio', slug: 'jumio', category: 'VERIFICATION', provider: 'Jumio', isEnabled: false },
    { name: 'Trulioo', slug: 'trulioo', category: 'VERIFICATION', provider: 'Trulioo', isEnabled: false },
    { name: 'IDenfy', slug: 'idenfy', category: 'VERIFICATION', provider: 'IDenfy', isEnabled: false },
    { name: 'Sumsub', slug: 'sumsub', category: 'VERIFICATION', provider: 'Sumsub', isEnabled: false },

    // Notification Services (6)
    { name: 'Pusher', slug: 'pusher', category: 'NOTIFICATION', provider: 'Pusher', isEnabled: true },
    { name: 'OneSignal', slug: 'onesignal', category: 'NOTIFICATION', provider: 'OneSignal', isEnabled: true },
    { name: 'Pushwoosh', slug: 'pushwoosh', category: 'NOTIFICATION', provider: 'Pushwoosh', isEnabled: false },
    { name: 'Airship', slug: 'airship', category: 'NOTIFICATION', provider: 'Airship', isEnabled: false },
    { name: 'CleverTap', slug: 'clevertap', category: 'NOTIFICATION', provider: 'CleverTap', isEnabled: false },
    { name: 'MoEngage', slug: 'moengage', category: 'NOTIFICATION', provider: 'MoEngage', isEnabled: false },

    // Social Services (6)
    { name: 'Facebook Login', slug: 'facebook-login', category: 'SOCIAL', provider: 'Meta', isEnabled: true },
    { name: 'Google Login', slug: 'google-login', category: 'SOCIAL', provider: 'Google', isEnabled: true },
    { name: 'Apple Login', slug: 'apple-login', category: 'SOCIAL', provider: 'Apple', isEnabled: false },
    { name: 'Twitter Login', slug: 'twitter-login', category: 'SOCIAL', provider: 'Twitter', isEnabled: false },
    { name: 'LinkedIn Login', slug: 'linkedin-login', category: 'SOCIAL', provider: 'LinkedIn', isEnabled: false },
    { name: 'Instagram Graph API', slug: 'instagram', category: 'SOCIAL', provider: 'Meta', isEnabled: true },

    // Search Services (5)
    { name: 'Algolia', slug: 'algolia', category: 'SEARCH', provider: 'Algolia', isEnabled: true },
    { name: 'Elasticsearch', slug: 'elasticsearch', category: 'SEARCH', provider: 'Elastic', isEnabled: false },
    { name: 'Meilisearch', slug: 'meilisearch', category: 'SEARCH', provider: 'Meilisearch', isEnabled: false },
    { name: 'Typesense', slug: 'typesense', category: 'SEARCH', provider: 'Typesense', isEnabled: false },
    { name: 'Solr', slug: 'solr', category: 'SEARCH', provider: 'Apache', isEnabled: false },

    // CDN Services (4)
    { name: 'Cloudflare CDN', slug: 'cloudflare-cdn', category: 'CDN', provider: 'Cloudflare', isEnabled: true },
    { name: 'AWS CloudFront', slug: 'cloudfront', category: 'CDN', provider: 'AWS', isEnabled: false },
    { name: 'Fastly', slug: 'fastly', category: 'CDN', provider: 'Fastly', isEnabled: false },
    { name: 'KeyCDN', slug: 'keycdn', category: 'CDN', provider: 'KeyCDN', isEnabled: false },

    // Fraud Detection Services (4)
    { name: 'Stripe Radar', slug: 'stripe-radar', category: 'FRAUD_DETECTION', provider: 'Stripe', isEnabled: false },
    { name: 'Sift', slug: 'sift', category: 'FRAUD_DETECTION', provider: 'Sift', isEnabled: false },
    { name: 'Riskified', slug: 'riskified', category: 'FRAUD_DETECTION', provider: 'Riskified', isEnabled: false },
    { name: 'Signifyd', slug: 'signifyd', category: 'FRAUD_DETECTION', provider: 'Signifyd', isEnabled: false },

    // Loyalty Services (3)
    { name: 'Antavo', slug: 'antavo', category: 'LOYALTY', provider: 'Antavo', isEnabled: false },
    { name: 'Yotpo', slug: 'yotpo', category: 'LOYALTY', provider: 'Yotpo', isEnabled: false },
    { name: 'Smile.io', slug: 'smile', category: 'LOYALTY', provider: 'Smile.io', isEnabled: false },

    // Cache Services (3)
    { name: 'Redis Cloud', slug: 'redis', category: 'CACHE', provider: 'Redis', isEnabled: true },
    { name: 'Memcached', slug: 'memcached', category: 'CACHE', provider: 'Memcached', isEnabled: false },
    { name: 'Varnish', slug: 'varnish', category: 'CACHE', provider: 'Varnish', isEnabled: false },

    // Support Services (3)
    { name: 'Zendesk', slug: 'zendesk', category: 'SUPPORT', provider: 'Zendesk', isEnabled: false },
    { name: 'Intercom', slug: 'intercom', category: 'SUPPORT', provider: 'Intercom', isEnabled: true },
    { name: 'Freshdesk', slug: 'freshdesk', category: 'SUPPORT', provider: 'Freshworks', isEnabled: false },
  ]

  // Create services
  for (const service of allServices) {
    try {
      await prisma.platformService.create({
        data: {
          name: service.name,
          slug: service.slug,
          category: service.category as ServiceCategory,
          provider: service.provider,
          isEnabled: service.isEnabled ?? false,
          isPremium: service.isPremium ?? false,
          status: 'ACTIVE',
        },
      })
      servicesCreated++
    } catch (e: any) {
      if (e.code !== 'P2002') console.log(`Skipped ${service.name}`)
    }
  }

  console.log(`Created ${servicesCreated} services`)

  // ========== FEATURES (60+ features) ==========

  const allFeatures = [
    // UI Features (15)
    { name: 'Dark Mode', key: 'dark_mode', category: 'UI', isEnabled: true },
    { name: 'RTL Support', key: 'rtl_support', category: 'UI', isEnabled: false },
    { name: 'Animations', key: 'animations', category: 'UI', isEnabled: true },
    { name: 'Infinite Scroll', key: 'infinite_scroll', category: 'UI', isEnabled: true },
    { name: 'Lazy Loading Images', key: 'lazy_loading', category: 'UI', isEnabled: true },
    { name: 'Skeleton Loading', key: 'skeleton_loading', category: 'UI', isEnabled: true },
    { name: 'Toast Notifications', key: 'toast_notifications', category: 'UI', isEnabled: true },
    { name: 'Modal Dialogs', key: 'modal_dialogs', category: 'UI', isEnabled: true },
    { name: 'Bottom Sheet', key: 'bottom_sheet', category: 'UI', isEnabled: true },
    { name: 'Pull to Refresh', key: 'pull_to_refresh', category: 'UI', isEnabled: false },
    { name: 'Swipe Actions', key: 'swipe_actions', category: 'UI', isEnabled: true },
    { name: 'Progressive Web App', key: 'pwa', category: 'UI', isEnabled: true },
    { name: 'Responsive Images', key: 'responsive_images', category: 'UI', isEnabled: true },
    { name: 'Virtual Keyboard', key: 'virtual_keyboard', category: 'UI', isEnabled: false },
    { name: 'Accessibility Mode', key: 'accessibility_mode', category: 'UI', isEnabled: true },

    // Commerce Features (15)
    { name: 'Product Reviews', key: 'product_reviews', category: 'Commerce', isEnabled: true },
    { name: 'Product Q&A', key: 'product_qa', category: 'Commerce', isEnabled: true },
    { name: 'Wishlist', key: 'wishlist', category: 'Commerce', isEnabled: true },
    { name: 'Price Alerts', key: 'price_alerts', category: 'Commerce', isEnabled: true },
    { name: 'Stock Alerts', key: 'stock_alerts', category: 'Commerce', isEnabled: true },
    { name: 'Flash Sales', key: 'flash_sales', category: 'Commerce', isEnabled: true },
    { name: 'Daily Deals', key: 'daily_deals', category: 'Commerce', isEnabled: true },
    { name: 'Bundle Products', key: 'bundle_products', category: 'Commerce', isEnabled: false },
    { name: 'Gift Cards', key: 'gift_cards', category: 'Commerce', isEnabled: false },
    { name: 'Loyalty Points', key: 'loyalty_points', category: 'Commerce', isEnabled: false },
    { name: 'Referral Program', key: 'referral_program', category: 'Commerce', isEnabled: true },
    { name: 'Product Comparison', key: 'product_comparison', category: 'Commerce', isEnabled: false },
    { name: 'Recently Viewed', key: 'recently_viewed', category: 'Commerce', isEnabled: true },
    { name: 'Recommended Products', key: 'recommended_products', category: 'Commerce', isEnabled: true },
    { name: 'Live Shopping', key: 'live_shopping', category: 'Commerce', isEnabled: false },

    // Security Features (10)
    { name: 'Two-Factor Auth', key: 'two_factor_auth', category: 'Security', isEnabled: true },
    { name: 'Biometric Login', key: 'biometric_login', category: 'Security', isEnabled: false },
    { name: 'Session Management', key: 'session_management', category: 'Security', isEnabled: true },
    { name: 'Login History', key: 'login_history', category: 'Security', isEnabled: true },
    { name: 'Device Management', key: 'device_management', category: 'Security', isEnabled: true },
    { name: 'Passwordless Login', key: 'passwordless_login', category: 'Security', isEnabled: false },
    { name: 'SSO Integration', key: 'sso_integration', category: 'Security', isEnabled: false },
    { name: 'CAPTCHA Protection', key: 'captcha_protection', category: 'Security', isEnabled: true },
    { name: 'Rate Limiting', key: 'rate_limiting', category: 'Security', isEnabled: true },
    { name: 'IP Whitelisting', key: 'ip_whitelisting', category: 'Security', isEnabled: false },

    // Communication Features (10)
    { name: 'Email Notifications', key: 'email_notifications', category: 'Communication', isEnabled: true },
    { name: 'SMS Notifications', key: 'sms_notifications', category: 'Communication', isEnabled: true },
    { name: 'Push Notifications', key: 'push_notifications', category: 'Communication', isEnabled: true },
    { name: 'WhatsApp Notifications', key: 'whatsapp_notifications', category: 'Communication', isEnabled: false },
    { name: 'In-App Chat', key: 'in_app_chat', category: 'Communication', isEnabled: true },
    { name: 'Live Chat Support', key: 'live_chat_support', category: 'Communication', isEnabled: true },
    { name: 'Chatbot', key: 'chatbot', category: 'Communication', isEnabled: true },
    { name: 'Help Center', key: 'help_center', category: 'Communication', isEnabled: true },
    { name: 'Ticket System', key: 'ticket_system', category: 'Communication', isEnabled: true },
    { name: 'Video Support', key: 'video_support', category: 'Communication', isEnabled: false },

    // Analytics Features (10)
    { name: 'User Analytics', key: 'user_analytics', category: 'Analytics', isEnabled: true },
    { name: 'Product Analytics', key: 'product_analytics', category: 'Analytics', isEnabled: true },
    { name: 'Sales Analytics', key: 'sales_analytics', category: 'Analytics', isEnabled: true },
    { name: 'Traffic Analytics', key: 'traffic_analytics', category: 'Analytics', isEnabled: true },
    { name: 'Heatmaps', key: 'heatmaps', category: 'Analytics', isEnabled: false },
    { name: 'Session Recording', key: 'session_recording', category: 'Analytics', isEnabled: false },
    { name: 'Funnel Analysis', key: 'funnel_analysis', category: 'Analytics', isEnabled: true },
    { name: 'Cohort Analysis', key: 'cohort_analysis', category: 'Analytics', isEnabled: false },
    { name: 'A/B Testing', key: 'ab_testing', category: 'Analytics', isEnabled: false },
    { name: 'Real-time Dashboard', key: 'realtime_dashboard', category: 'Analytics', isEnabled: true },
  ]

  // Create features
  for (const feature of allFeatures) {
    try {
      await prisma.platformFeature.create({
        data: {
          name: feature.name,
          key: feature.key,
          category: feature.category,
          isEnabled: feature.isEnabled,
          type: 'TOGGLE',
        },
      })
      featuresCreated++
    } catch (e: any) {
      if (e.code !== 'P2002') console.log(`Skipped feature ${feature.name}`)
    }
  }

  console.log(`Created ${featuresCreated} features`)

  // ========== TOOLS (40+ tools) ==========

  const allTools = [
    // Data Management (8)
    { name: 'Bulk Product Import', slug: 'bulk-import', category: 'DATA_MANAGEMENT', isDangerous: false },
    { name: 'Bulk Product Export', slug: 'bulk-export', category: 'DATA_MANAGEMENT', isDangerous: false },
    { name: 'CSV Product Upload', slug: 'csv-upload', category: 'DATA_MANAGEMENT', isDangerous: false },
    { name: 'Database Backup', slug: 'db-backup', category: 'DATA_MANAGEMENT', isDangerous: false },
    { name: 'Database Restore', slug: 'db-restore', category: 'DATA_MANAGEMENT', isDangerous: true },
    { name: 'Data Migration', slug: 'data-migration', category: 'DATA_MANAGEMENT', isDangerous: true },
    { name: 'Cache Clear', slug: 'cache-clear', category: 'DATA_MANAGEMENT', isDangerous: false },
    { name: 'Search Index Rebuild', slug: 'index-rebuild', category: 'DATA_MANAGEMENT', isDangerous: false },

    // User Management (6)
    { name: 'Bulk User Activation', slug: 'bulk-activate-users', category: 'USER_MANAGEMENT', isDangerous: false },
    { name: 'Bulk User Suspension', slug: 'bulk-suspend-users', category: 'USER_MANAGEMENT', isDangerous: true },
    { name: 'Role Assignment', slug: 'role-assignment', category: 'USER_MANAGEMENT', isDangerous: false },
    { name: 'Password Reset Tool', slug: 'password-reset', category: 'USER_MANAGEMENT', isDangerous: false },
    { name: 'Email Verification', slug: 'email-verification', category: 'USER_MANAGEMENT', isDangerous: false },
    { name: 'User Merge', slug: 'user-merge', category: 'USER_MANAGEMENT', isDangerous: true },

    // Product Management (6)
    { name: 'Bulk Price Update', slug: 'bulk-price-update', category: 'PRODUCT_MANAGEMENT', isDangerous: false },
    { name: 'Bulk Stock Update', slug: 'bulk-stock-update', category: 'PRODUCT_MANAGEMENT', isDangerous: false },
    { name: 'Product Approval Queue', slug: 'product-approval', category: 'PRODUCT_MANAGEMENT', isDangerous: false },
    { name: 'Category Assignment', slug: 'category-assignment', category: 'PRODUCT_MANAGEMENT', isDangerous: false },
    { name: 'Bulk Product Delete', slug: 'bulk-product-delete', category: 'PRODUCT_MANAGEMENT', isDangerous: true },
    { name: 'Image Optimization', slug: 'image-optimization', category: 'PRODUCT_MANAGEMENT', isDangerous: false },

    // Order Management (5)
    { name: 'Bulk Order Status', slug: 'bulk-order-status', category: 'ORDER_MANAGEMENT', isDangerous: false },
    { name: 'Order Export', slug: 'order-export', category: 'ORDER_MANAGEMENT', isDangerous: false },
    { name: 'Invoice Generator', slug: 'invoice-generator', category: 'ORDER_MANAGEMENT', isDangerous: false },
    { name: 'Shipping Label Print', slug: 'shipping-labels', category: 'ORDER_MANAGEMENT', isDangerous: false },
    { name: 'Bulk Refund Tool', slug: 'bulk-refund', category: 'ORDER_MANAGEMENT', isDangerous: true },

    // Financial Tools (4)
    { name: 'Commission Calculator', slug: 'commission-calc', category: 'FINANCIAL', isDangerous: false },
    { name: 'Payout Generator', slug: 'payout-generator', category: 'FINANCIAL', isDangerous: false },
    { name: 'Tax Report Generator', slug: 'tax-report', category: 'FINANCIAL', isDangerous: false },
    { name: 'Revenue Report', slug: 'revenue-report', category: 'FINANCIAL', isDangerous: false },

    // Marketing Tools (4)
    { name: 'Email Campaign Tool', slug: 'email-campaign', category: 'MARKETING', isDangerous: false },
    { name: 'SMS Campaign Tool', slug: 'sms-campaign', category: 'MARKETING', isDangerous: false },
    { name: 'Coupon Generator', slug: 'coupon-generator', category: 'MARKETING', isDangerous: false },
    { name: 'Banner Manager', slug: 'banner-manager', category: 'MARKETING', isDangerous: false },

    // Security Tools (4)
    { name: 'Security Audit', slug: 'security-audit', category: 'SECURITY', isDangerous: false },
    { name: 'API Key Generator', slug: 'api-key-gen', category: 'SECURITY', isDangerous: false },
    { name: 'Session Terminator', slug: 'session-terminator', category: 'SECURITY', isDangerous: true },
    { name: 'IP Blocker', slug: 'ip-blocker', category: 'SECURITY', isDangerous: false },

    // Automation Tools (4)
    { name: 'Task Scheduler', slug: 'task-scheduler', category: 'AUTOMATION', isDangerous: false },
    { name: 'Webhook Manager', slug: 'webhook-manager', category: 'AUTOMATION', isDangerous: false },
    { name: 'Auto Price Adjuster', slug: 'auto-price', category: 'AUTOMATION', isDangerous: false },
    { name: 'Stock Sync', slug: 'stock-sync', category: 'AUTOMATION', isDangerous: false },

    // Reporting Tools (3)
    { name: 'Custom Report Builder', slug: 'report-builder', category: 'REPORTING', isDangerous: false },
    { name: 'Scheduled Reports', slug: 'scheduled-reports', category: 'REPORTING', isDangerous: false },
    { name: 'Export All Data', slug: 'export-all', category: 'REPORTING', isDangerous: false },
  ]

  // Create tools
  for (const tool of allTools) {
    try {
      await prisma.adminTool.create({
        data: {
          name: tool.name,
          slug: tool.slug,
          category: tool.category as ToolCategory,
          isDangerous: tool.isDangerous,
          isEnabled: true,
          requiresConfirmation: tool.isDangerous,
        },
      })
      toolsCreated++
    } catch (e: any) {
      if (e.code !== 'P2002') console.log(`Skipped tool ${tool.name}`)
    }
  }

  console.log(`Created ${toolsCreated} tools`)

  // ========== COLOR PALETTES (5 default palettes) ==========

  const defaultPalettes = [
    {
      name: 'Emerald Default',
      slug: 'emerald-default',
      isDefault: true,
      isActive: true,
      primary: '#10b981',
    },
    {
      name: 'Ocean Blue',
      slug: 'ocean-blue',
      primary: '#0ea5e9',
      gradientFrom: '#0ea5e9',
      gradientTo: '#06b6d4',
    },
    {
      name: 'Royal Purple',
      slug: 'royal-purple',
      primary: '#8b5cf6',
      gradientFrom: '#8b5cf6',
      gradientTo: '#a855f7',
    },
    {
      name: 'Sunset Orange',
      slug: 'sunset-orange',
      primary: '#f97316',
      gradientFrom: '#f97316',
      gradientTo: '#ef4444',
    },
    {
      name: 'Rose Pink',
      slug: 'rose-pink',
      primary: '#ec4899',
      gradientFrom: '#ec4899',
      gradientTo: '#f43f5e',
    },
  ]

  for (const palette of defaultPalettes) {
    try {
      await prisma.colorPalette.create({
        data: {
          name: palette.name,
          slug: palette.slug,
          primary: palette.primary,
          gradientFrom: palette.gradientFrom || palette.primary,
          gradientTo: palette.gradientTo || palette.primary,
          isDefault: palette.isDefault ?? false,
          isActive: palette.isActive ?? false,
        },
      })
      palettesCreated++
    } catch (e: any) {
      if (e.code !== 'P2002') console.log(`Skipped palette ${palette.name}`)
    }
  }

  console.log(`Created ${palettesCreated} color palettes`)

  console.log('\n=== Seeding Complete ===')
  console.log(`Total Services: ${servicesCreated}`)
  console.log(`Total Features: ${featuresCreated}`)
  console.log(`Total Tools: ${toolsCreated}`)
  console.log(`Total Palettes: ${palettesCreated}`)
}

main()
  .catch((e) => {
    console.error('Seeding error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
