import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../src/lib/auth'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting seed...')

  // Create admin user
  const adminPassword = await hashPassword('admin123')
  const admin = await prisma.user.upsert({
    where: { email: 'admin@luminvera.pk' },
    update: {},
    create: {
      email: 'admin@luminvera.pk',
      passwordHash: adminPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
      accountStatus: 'ACTIVE',
      emailVerified: true,
      emailVerifiedAt: new Date(),
    },
  })
  console.log('✅ Created admin user:', admin.email)

  // Create seller user
  const sellerPassword = await hashPassword('seller123')
  const sellerUser = await prisma.user.upsert({
    where: { email: 'seller@luminvera.pk' },
    update: {},
    create: {
      email: 'seller@luminvera.pk',
      passwordHash: sellerPassword,
      firstName: 'Tech',
      lastName: 'Seller',
      role: 'SELLER',
      accountStatus: 'ACTIVE',
      emailVerified: true,
      emailVerifiedAt: new Date(),
    },
  })
  console.log('✅ Created seller user:', sellerUser.email)

  // Create seller profile
  const seller = await prisma.seller.upsert({
    where: { userId: sellerUser.id },
    update: {},
    create: {
      userId: sellerUser.id,
      storeName: 'TechZone Pakistan',
      storeSlug: 'techzone-pakistan',
      storeDescription: 'Your trusted electronics store in Pakistan',
      status: 'VERIFIED',
      verifiedAt: new Date(),
      businessPhone: '+92-300-1234567',
      businessEmail: 'contact@techzone.pk',
      bankName: 'HBL',
      bankAccountTitle: 'TechZone Pakistan',
      bankAccountNumber: '1234567890123',
      commissionRate: 10,
      totalSales: 150,
      totalOrders: 89,
      totalProducts: 5,
      averageRating: 4.8,
      totalReviews: 67,
      isFeatured: true,
      isTopSeller: true,
    },
  })
  console.log('✅ Created seller profile:', seller.storeName)

  // Create customer user
  const customerPassword = await hashPassword('customer123')
  const customer = await prisma.user.upsert({
    where: { email: 'customer@luminvera.pk' },
    update: {},
    create: {
      email: 'customer@luminvera.pk',
      passwordHash: customerPassword,
      firstName: 'Ali',
      lastName: 'Ahmed',
      phone: '+92-300-9876543',
      role: 'USER',
      accountStatus: 'ACTIVE',
      emailVerified: true,
      emailVerifiedAt: new Date(),
    },
  })
  console.log('✅ Created customer user:', customer.email)

  // Create categories
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { slug: 'electronics' },
      update: {},
      create: {
        name: 'Electronics',
        slug: 'electronics',
        description: 'Electronic devices and accessories',
        defaultCommission: 8,
      },
    }),
    prisma.category.upsert({
      where: { slug: 'fashion' },
      update: {},
      create: {
        name: 'Fashion',
        slug: 'fashion',
        description: 'Clothing, shoes, and accessories',
        defaultCommission: 12,
      },
    }),
    prisma.category.upsert({
      where: { slug: 'home-living' },
      update: {},
      create: {
        name: 'Home & Living',
        slug: 'home-living',
        description: 'Furniture and home decor',
        defaultCommission: 10,
      },
    }),
    prisma.category.upsert({
      where: { slug: 'beauty' },
      update: {},
      create: {
        name: 'Beauty',
        slug: 'beauty',
        description: 'Skincare, makeup, and personal care',
        defaultCommission: 15,
      },
    }),
    prisma.category.upsert({
      where: { slug: 'sports' },
      update: {},
      create: {
        name: 'Sports & Fitness',
        slug: 'sports',
        description: 'Sports equipment and fitness gear',
        defaultCommission: 10,
      },
    }),
  ])
  console.log('✅ Created categories:', categories.length)

  // Create products
  const electronicsCategory = categories.find(c => c.slug === 'electronics')!
  const fashionCategory = categories.find(c => c.slug === 'fashion')!
  const homeCategory = categories.find(c => c.slug === 'home-living')!

  const products = await Promise.all([
    prisma.product.upsert({
      where: { sku: 'SKU-HEADPHONES-001' },
      update: {},
      create: {
        sellerId: seller.id,
        sku: 'SKU-HEADPHONES-001',
        name: 'Wireless Bluetooth Headphones Pro',
        slug: 'wireless-bluetooth-headphones-pro',
        description: 'High-quality wireless headphones with active noise cancellation, 30-hour battery life, and premium sound quality.',
        shortDescription: 'Premium wireless headphones with ANC',
        categoryId: electronicsCategory.id,
        status: 'LIVE',
        basePrice: 8999,
        costPrice: 6000,
        compareAtPrice: 12999,
        discountPercentage: 30,
        stockQuantity: 50,
        lowStockThreshold: 10,
        trackInventory: true,
        weight: 0.3,
        freeShipping: true,
        warrantyPeriod: '12 months',
        isFeatured: true,
        isNewArrival: true,
        isBestSeller: true,
      },
    }),
    prisma.product.upsert({
      where: { sku: 'SKU-SWATCH-001' },
      update: {},
      create: {
        sellerId: seller.id,
        sku: 'SKU-SWATCH-001',
        name: 'Smart Watch Series X',
        slug: 'smart-watch-series-x',
        description: 'Advanced smartwatch with health monitoring, GPS tracking, and 7-day battery life.',
        shortDescription: 'Feature-packed smartwatch',
        categoryId: electronicsCategory.id,
        status: 'LIVE',
        basePrice: 24999,
        costPrice: 18000,
        compareAtPrice: 34999,
        discountPercentage: 28,
        stockQuantity: 30,
        lowStockThreshold: 5,
        trackInventory: true,
        weight: 0.1,
        freeShipping: true,
        hasVariants: true,
        variantAttributes: JSON.stringify(['color']),
        warrantyPeriod: '12 months',
        isFeatured: true,
        isBestSeller: true,
      },
    }),
    prisma.product.upsert({
      where: { sku: 'SKU-TSHIRT-001' },
      update: {},
      create: {
        sellerId: seller.id,
        sku: 'SKU-TSHIRT-001',
        name: 'Premium Cotton T-Shirt Pack (3 pcs)',
        slug: 'premium-cotton-tshirt-pack',
        description: 'Set of 3 premium cotton t-shirts in classic colors. Breathable fabric, comfortable fit.',
        shortDescription: '3-pack premium cotton t-shirts',
        categoryId: fashionCategory.id,
        status: 'LIVE',
        basePrice: 2499,
        costPrice: 1500,
        compareAtPrice: 3999,
        discountPercentage: 37,
        stockQuantity: 200,
        lowStockThreshold: 20,
        trackInventory: true,
        weight: 0.4,
        freeShipping: false,
        shippingFee: 150,
        hasVariants: true,
        variantAttributes: JSON.stringify(['size', 'color']),
        isFeatured: true,
      },
    }),
    prisma.product.upsert({
      where: { sku: 'SKU-LAMP-001' },
      update: {},
      create: {
        sellerId: seller.id,
        sku: 'SKU-LAMP-001',
        name: 'Modern LED Table Lamp',
        slug: 'modern-led-table-lamp',
        description: 'Minimalist LED table lamp with adjustable brightness and color temperature.',
        shortDescription: 'Minimalist LED table lamp',
        categoryId: homeCategory.id,
        status: 'LIVE',
        basePrice: 3499,
        costPrice: 2200,
        compareAtPrice: 4999,
        discountPercentage: 30,
        stockQuantity: 75,
        lowStockThreshold: 15,
        trackInventory: true,
        weight: 0.8,
        freeShipping: false,
        shippingFee: 200,
        warrantyPeriod: '6 months',
        isNewArrival: true,
      },
    }),
    prisma.product.upsert({
      where: { sku: 'SKU-POWERBANK-001' },
      update: {},
      create: {
        sellerId: seller.id,
        sku: 'SKU-POWERBANK-001',
        name: '20000mAh Power Bank Fast Charging',
        slug: '20000mah-power-bank-fast-charging',
        description: 'High capacity power bank with fast charging support. Dual USB output, LED indicator.',
        shortDescription: '20000mAh fast charging power bank',
        categoryId: electronicsCategory.id,
        status: 'LIVE',
        basePrice: 3999,
        costPrice: 2500,
        compareAtPrice: 5999,
        discountPercentage: 33,
        stockQuantity: 100,
        lowStockThreshold: 20,
        trackInventory: true,
        weight: 0.35,
        freeShipping: false,
        shippingFee: 100,
        warrantyPeriod: '6 months',
        isBestSeller: true,
      },
    }),
  ])
  console.log('✅ Created products:', products.length)

  // Create address for customer
  const address = await prisma.address.upsert({
    where: { id: 'seed-address-1' },
    update: {},
    create: {
      id: 'seed-address-1',
      userId: customer.id,
      label: 'Home',
      recipientName: 'Ali Ahmed',
      recipientPhone: '+92-300-9876543',
      country: 'Pakistan',
      province: 'Punjab',
      city: 'Lahore',
      area: 'Gulberg III',
      streetAddress: '123 Main Boulevard, Gulberg III',
      postalCode: '54000',
      isDefault: true,
    },
  })
  console.log('✅ Created address')

  // Create platform config
  await prisma.platformConfig.upsert({
    where: { key: 'site_name' },
    update: {},
    create: { key: 'site_name', value: 'LUMINVERA', description: 'Platform name' },
  })

  await prisma.platformConfig.upsert({
    where: { key: 'default_currency' },
    update: {},
    create: { key: 'default_currency', value: 'PKR', description: 'Default currency' },
  })

  await prisma.platformConfig.upsert({
    where: { key: 'commission_rate' },
    update: {},
    create: { key: 'commission_rate', value: '10', description: 'Default platform commission rate (%)' },
  })

  await prisma.platformConfig.upsert({
    where: { key: 'site_tagline' },
    update: {},
    create: { key: 'site_tagline', value: "Pakistan's #1 Marketplace", description: 'Site tagline' },
  })

  await prisma.platformConfig.upsert({
    where: { key: 'contact_email' },
    update: {},
    create: { key: 'contact_email', value: 'support@luminvera.pk', description: 'Contact email' },
  })

  await prisma.platformConfig.upsert({
    where: { key: 'support_phone' },
    update: {},
    create: { key: 'support_phone', value: '+92 300 1234567', description: 'Support phone' },
  })

  await prisma.platformConfig.upsert({
    where: { key: 'free_shipping_threshold' },
    update: {},
    create: { key: 'free_shipping_threshold', value: '5000', description: 'Free shipping minimum order' },
  })

  await prisma.platformConfig.upsert({
    where: { key: 'default_shipping_fee' },
    update: {},
    create: { key: 'default_shipping_fee', value: '150', description: 'Default shipping fee' },
  })
  console.log('✅ Created platform config')

  // Create Flash Sale
  const flashSale = await prisma.flashSale.upsert({
    where: { id: 'seed-flash-sale-1' },
    update: {},
    create: {
      id: 'seed-flash-sale-1',
      name: 'Mega Flash Sale',
      description: 'Up to 50% off on Electronics & Fashion!',
      discountPercentage: 50,
      startTime: new Date(),
      endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      isActive: true,
    },
  })
  console.log('✅ Created flash sale:', flashSale.name)

  // Create Flash Sale Items
  const headphonesProduct = products.find(p => p.sku === 'SKU-HEADPHONES-001')!
  const smartWatchProduct = products.find(p => p.sku === 'SKU-SWATCH-001')!

  await prisma.flashSaleItem.upsert({
    where: { id: 'seed-fsi-1' },
    update: {},
    create: {
      id: 'seed-fsi-1',
      flashSaleId: flashSale.id,
      productId: headphonesProduct.id,
      flashPrice: 6999,
      quantity: 20,
      quantitySold: 5,
      maxPerUser: 2,
      isActive: true,
    },
  })

  await prisma.flashSaleItem.upsert({
    where: { id: 'seed-fsi-2' },
    update: {},
    create: {
      id: 'seed-fsi-2',
      flashSaleId: flashSale.id,
      productId: smartWatchProduct.id,
      flashPrice: 19999,
      quantity: 15,
      quantitySold: 3,
      maxPerUser: 1,
      isActive: true,
    },
  })
  console.log('✅ Created flash sale items')

  // Create Banners
  await prisma.banner.upsert({
    where: { id: 'seed-banner-1' },
    update: {},
    create: {
      id: 'seed-banner-1',
      title: 'Welcome to LUMINVERA',
      subtitle: "Pakistan's #1 Marketplace - Shop the best products from trusted sellers",
      imageUrl: '/banners/hero-1.jpg',
      linkUrl: '/products',
      position: 'hero',
      sortOrder: 1,
      isActive: true,
    },
  })

  await prisma.banner.upsert({
    where: { id: 'seed-banner-2' },
    update: {},
    create: {
      id: 'seed-banner-2',
      title: 'Flash Sale!',
      subtitle: 'Up to 70% off on selected items - Limited time only!',
      imageUrl: '/banners/promo-1.jpg',
      linkUrl: '/products?onSale=true',
      position: 'promotional',
      sortOrder: 1,
      isActive: true,
    },
  })

  await prisma.banner.upsert({
    where: { id: 'seed-banner-3' },
    update: {},
    create: {
      id: 'seed-banner-3',
      title: 'Electronics',
      subtitle: 'Latest gadgets at best prices',
      imageUrl: '/banners/electronics.jpg',
      linkUrl: '/products?category=electronics',
      position: 'category',
      sortOrder: 1,
      isActive: true,
    },
  })
  console.log('✅ Created banners')

  // Create Coupons
  await prisma.coupon.upsert({
    where: { code: 'WELCOME10' },
    update: {},
    create: {
      code: 'WELCOME10',
      name: 'Welcome Discount',
      type: 'PERCENTAGE',
      discountValue: 10,
      maxDiscountAmount: 1000,
      minOrderValue: 500,
      maxUses: 1000,
      maxUsesPerUser: 1,
      currentUses: 0,
      firstTimeUserOnly: true,
      validFrom: new Date(),
      validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      isActive: true,
    },
  })

  await prisma.coupon.upsert({
    where: { code: 'FLAT500' },
    update: {},
    create: {
      code: 'FLAT500',
      name: 'Flat Rs. 500 Off',
      type: 'FIXED',
      discountValue: 500,
      minOrderValue: 2000,
      maxUses: 500,
      maxUsesPerUser: 2,
      currentUses: 0,
      firstTimeUserOnly: false,
      validFrom: new Date(),
      validUntil: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 6 months
      isActive: true,
    },
  })

  await prisma.coupon.upsert({
    where: { code: 'FREESHIP' },
    update: {},
    create: {
      code: 'FREESHIP',
      name: 'Free Shipping',
      type: 'FREE_SHIPPING',
      discountValue: 0,
      minOrderValue: 1000,
      maxUses: 100,
      maxUsesPerUser: 1,
      currentUses: 0,
      firstTimeUserOnly: false,
      validFrom: new Date(),
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 1 month
      isActive: true,
    },
  })
  console.log('✅ Created coupons')

  // Create Wallet for customer
  await prisma.wallet.upsert({
    where: { userId: customer.id },
    update: {},
    create: {
      userId: customer.id,
      balance: 5000,
    },
  })
  console.log('✅ Created customer wallet with PKR 5,000 balance')

  // Create delivery zones
  await prisma.deliveryZone.upsert({
    where: { id: 'seed-zone-1' },
    update: {},
    create: {
      id: 'seed-zone-1',
      name: 'Major Cities',
      provinces: JSON.stringify(['Punjab', 'Sindh', 'Islamabad Capital Territory']),
      cities: JSON.stringify(['Karachi', 'Lahore', 'Islamabad', 'Rawalpindi', 'Faisalabad']),
      baseFee: 150,
      perKgFee: 20,
      freeDeliveryMinimum: 5000,
      estimatedDays: 2,
      isActive: true,
    },
  })

  await prisma.deliveryZone.upsert({
    where: { id: 'seed-zone-2' },
    update: {},
    create: {
      id: 'seed-zone-2',
      name: 'Standard Delivery',
      provinces: JSON.stringify(['Khyber Pakhtunkhwa', 'Balochistan']),
      baseFee: 250,
      perKgFee: 30,
      freeDeliveryMinimum: 10000,
      estimatedDays: 4,
      isActive: true,
    },
  })

  await prisma.deliveryZone.upsert({
    where: { id: 'seed-zone-3' },
    update: {},
    create: {
      id: 'seed-zone-3',
      name: 'Remote Areas',
      provinces: JSON.stringify(['Gilgit-Baltistan', 'Azad Kashmir']),
      baseFee: 400,
      perKgFee: 50,
      freeDeliveryMinimum: 15000,
      estimatedDays: 7,
      isActive: true,
    },
  })
  console.log('✅ Created delivery zones')

  // Create couriers
  await prisma.courier.upsert({
    where: { code: 'LEOPARDS' },
    update: {},
    create: {
      name: 'Leopards Courier',
      code: 'LEOPARDS',
      phone: '+92-21-111-300-300',
      email: 'info@leopardscourier.com',
      hasTracking: true,
      hasCod: true,
      isActive: true,
    },
  })

  await prisma.courier.upsert({
    where: { code: 'TCS' },
    update: {},
    create: {
      name: 'TCS Express',
      code: 'TCS',
      phone: '+92-21-111-827-111',
      email: 'info@tcs.com.pk',
      hasTracking: true,
      hasCod: true,
      isActive: true,
    },
  })

  await prisma.courier.upsert({
    where: { code: 'M&P' },
    update: {},
    create: {
      name: 'M&P Express',
      code: 'M&P',
      phone: '+92-21-111-132-132',
      email: 'info@mpex.pk',
      hasTracking: true,
      hasCod: true,
      isActive: true,
    },
  })
  console.log('✅ Created couriers')

  console.log('\n🎉 Seed completed successfully!')
  console.log('\n📋 Test Accounts:')
  console.log('  Admin: admin@luminvera.pk / admin123')
  console.log('  Seller: seller@luminvera.pk / seller123')
  console.log('  Customer: customer@luminvera.pk / customer123')
  console.log('\n🎁 Available Coupons: WELCOME10, FLAT500, FREESHIP')
  console.log('💰 Customer Wallet Balance: PKR 5,000')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
