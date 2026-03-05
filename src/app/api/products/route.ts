import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ProductStatus, UserRole } from '@prisma/client'

// Types for faceted search response
interface FacetOption {
  value: string
  label: string
  count: number
}

interface Facet {
  name: string
  label: string
  options: FacetOption[]
}

// ============================================
// GET /api/products - Advanced product search with facets
// Supports: variants lookup by SKU, product by ID
// ============================================
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Check for variant lookup by SKU
    const variantSku = searchParams.get('variantSku')
    if (variantSku) {
      return await getVariantBySku(variantSku)
    }
    
    // Check for product with variants lookup by product ID
    const productId = searchParams.get('productId')
    if (productId && searchParams.get('includeVariants') === 'true') {
      return await getProductWithVariants(productId)
    }
    
    // Pagination
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '20'), 100)
    const skip = (page - 1) * pageSize
    
    // Search parameters
    const search = searchParams.get('search') || ''
    const categoryIds = searchParams.get('categories')?.split(',').filter(Boolean) || []
    const brandIds = searchParams.get('brands')?.split(',').filter(Boolean) || []
    const minPrice = searchParams.get('minPrice') ? parseFloat(searchParams.get('minPrice')!) : null
    const maxPrice = searchParams.get('maxPrice') ? parseFloat(searchParams.get('maxPrice')!) : null
    const minRating = searchParams.get('minRating') ? parseFloat(searchParams.get('minRating')!) : null
    const sortBy = searchParams.get('sortBy') || 'relevance'
    const sellerId = searchParams.get('sellerId')
    const featured = searchParams.get('featured')
    const status = (searchParams.get('status') || 'LIVE') as ProductStatus
    const limit = searchParams.get('limit')
    const inStock = searchParams.get('inStock')
    const freeShipping = searchParams.get('freeShipping')
    const onSale = searchParams.get('onSale')
    const isBestSeller = searchParams.get('isBestSeller')
    const isNewArrival = searchParams.get('isNewArrival')
    const includeFacets = searchParams.get('includeFacets') !== 'false'
    const includeVariants = searchParams.get('includeVariants') === 'true'

    // Build where clause
    const where: Record<string, unknown> = {
      status,
    }

    // Full-text search with relevance ranking
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { shortDescription: { contains: search, mode: 'insensitive' } },
      ]
    }

    // Category filter (multiple)
    if (categoryIds.length > 0) {
      where.categoryId = { in: categoryIds }
    }

    // Brand/Seller filter (multiple)
    if (brandIds.length > 0) {
      where.sellerId = { in: brandIds }
    }

    // Single seller filter
    if (sellerId) {
      where.sellerId = sellerId
    }

    // Price range filter
    if (minPrice !== null || maxPrice !== null) {
      where.basePrice = {
        ...(minPrice !== null && { gte: minPrice }),
        ...(maxPrice !== null && { lte: maxPrice }),
      }
    }

    // Rating filter
    if (minRating !== null) {
      where.averageRating = { gte: minRating }
    }

    // In stock filter
    if (inStock === 'true') {
      where.stockQuantity = { gt: 0 }
    }

    // Free shipping filter
    if (freeShipping === 'true') {
      where.freeShipping = true
    }

    // On sale filter (has discount)
    if (onSale === 'true') {
      where.discountPercentage = { gt: 0 }
    }

    // Best seller filter
    if (isBestSeller === 'true') {
      where.isBestSeller = true
    }

    // New arrival filter
    if (isNewArrival === 'true') {
      where.isNewArrival = true
    }

    // Featured filter
    if (featured === 'true') {
      where.isFeatured = true
    }

    // Build orderBy clause
    let orderBy: Record<string, unknown>[] = []
    switch (sortBy) {
      case 'price-low':
        orderBy = [{ basePrice: 'asc' }]
        break
      case 'price-high':
        orderBy = [{ basePrice: 'desc' }]
        break
      case 'rating':
        orderBy = [{ averageRating: 'desc' }]
        break
      case 'newest':
        orderBy = [{ createdAt: 'desc' }]
        break
      case 'bestseller':
        orderBy = [{ purchaseCount: 'desc' }]
        break
      case 'relevance':
      default:
        if (search) {
          orderBy = [{ purchaseCount: 'desc' }]
        } else {
          orderBy = [{ createdAt: 'desc' }]
        }
        break
    }

    // Get total count
    const totalCount = await db.product.count({ where })

    // Build query options
    const queryOptions = {
      where,
      include: {
        seller: {
          select: {
            id: true,
            storeName: true,
            storeSlug: true,
            storeLogoUrl: true,
            averageRating: true,
            isTopSeller: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        ...(includeVariants && {
          variants: true,
        }),
      },
      orderBy,
      ...(limit ? { take: parseInt(limit) } : { skip, take: pageSize }),
    }

    // Fetch products
    const products = await db.product.findMany(queryOptions)

    // Calculate relevance score for each product when searching
    const calculateRelevanceScore = (product: { name: string; description: string | null; averageRating: number; purchaseCount: number }, searchQuery: string): number => {
      if (!searchQuery) return 0
      let score = 0
      const name = product.name?.toLowerCase() || ''
      const description = product.description?.toLowerCase() || ''
      const query = searchQuery.toLowerCase()
      
      if (name === query) score += 100
      else if (name.startsWith(query)) score += 80
      else if (name.includes(query)) score += 50
      if (description.includes(query)) score += 20
      
      score += (product.averageRating || 0) * 5
      score += Math.min((product.purchaseCount || 0) / 100, 10)
      
      return score
    }

    // Transform products
    let transformedProducts = products.map((p) => {
      // Process variants if included
      let variants = null
      if (includeVariants && p.variants) {
        variants = p.variants.map((v) => ({
          id: v.id,
          sku: v.sku,
          barcode: v.barcode,
          attributes: v.attributes ? JSON.parse(v.attributes) : {},
          priceAdjustment: v.priceAdjustment,
          compareAtPrice: v.compareAtPrice,
          stockQuantity: v.stockQuantity,
          stockReserved: v.stockReserved,
          imageUrl: v.imageUrl,
          isActive: v.isActive,
          createdAt: v.createdAt,
          updatedAt: v.updatedAt,
        }))
      }
      
      return {
        id: p.id,
        sellerId: p.sellerId,
        sku: p.sku,
        name: p.name,
        slug: p.slug,
        description: p.description,
        shortDescription: p.shortDescription,
        categoryId: p.categoryId,
        status: p.status,
        primaryImageUrl: p.primaryImageUrl,
        images: p.images ? JSON.parse(p.images) : null,
        basePrice: p.basePrice,
        costPrice: p.costPrice,
        compareAtPrice: p.compareAtPrice,
        currency: p.currency,
        discountPercentage: p.discountPercentage || 0,
        discountAmount: p.discountAmount,
        stockQuantity: p.stockQuantity,
        stockReserved: p.stockReserved,
        lowStockThreshold: p.lowStockThreshold,
        trackInventory: p.trackInventory,
        weight: p.weight,
        freeShipping: p.freeShipping,
        shippingFee: p.shippingFee || 0,
        hasVariants: p.hasVariants,
        variantAttributes: p.variantAttributes ? JSON.parse(p.variantAttributes) : null,
        viewCount: p.viewCount,
        purchaseCount: p.purchaseCount,
        wishlistCount: p.wishlistCount,
        averageRating: p.averageRating || 0,
        totalReviews: p.totalReviews || 0,
        isFeatured: p.isFeatured,
        isNewArrival: p.isNewArrival,
        isBestSeller: p.isBestSeller,
        warrantyPeriod: p.warrantyPeriod,
        relevanceScore: calculateRelevanceScore(p, search),
        variants,
        seller: p.seller ? {
          id: p.seller.id,
          storeName: p.seller.storeName,
          storeSlug: p.seller.storeSlug,
          storeLogoUrl: p.seller.storeLogoUrl,
          averageRating: p.seller.averageRating,
          isTopSeller: p.seller.isTopSeller,
        } : null,
        category: p.category ? {
          id: p.category.id,
          name: p.category.name,
          slug: p.category.slug,
        } : null,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      }
    })

    // Sort by relevance score if searching
    if (search && sortBy === 'relevance') {
      transformedProducts.sort((a, b) => b.relevanceScore - a.relevanceScore)
    }

    // Build facets if requested
    let facets: Facet[] = []
    
    if (includeFacets && products.length > 0) {
      // Get category counts
      const categoryCounts = await db.product.groupBy({
        by: ['categoryId'],
        where: { status, categoryId: { not: null } },
        _count: { id: true },
      })

      const categoryIdsList = categoryCounts.map(c => c.categoryId).filter(Boolean) as string[]
      const allCategories = categoryIdsList.length > 0 ? await db.category.findMany({
        where: { id: { in: categoryIdsList } },
        select: { id: true, name: true },
      }) : []

      const categoryFacet: Facet = {
        name: 'categories',
        label: 'Categories',
        options: allCategories.map(cat => ({
          value: cat.id,
          label: cat.name,
          count: categoryCounts.find(c => c.categoryId === cat.id)?._count.id || 0,
        })).sort((a, b) => b.count - a.count),
      }

      // Get seller/brand counts
      const sellerCounts = await db.product.groupBy({
        by: ['sellerId'],
        where: { status },
        _count: { id: true },
      })

      const sellerIdsList = sellerCounts.map(s => s.sellerId)
      const allSellers = sellerIdsList.length > 0 ? await db.seller.findMany({
        where: { id: { in: sellerIdsList } },
        select: { id: true, storeName: true },
      }) : []

      const brandFacet: Facet = {
        name: 'brands',
        label: 'Brands',
        options: allSellers.map(seller => ({
          value: seller.id,
          label: seller.storeName,
          count: sellerCounts.find(s => s.sellerId === seller.id)?._count.id || 0,
        })).sort((a, b) => b.count - a.count),
      }

      // Price range facet
      const priceProducts = await db.product.findMany({
        where: { status },
        select: { basePrice: true },
        orderBy: { basePrice: 'asc' },
      })

      const prices = priceProducts.map(p => p.basePrice).filter(Boolean)
      const priceFacet: Facet = {
        name: 'priceRange',
        label: 'Price Range',
        options: [
          { value: '0-500', label: 'Under PKR 500', count: prices.filter(p => p <= 500).length },
          { value: '500-1000', label: 'PKR 500 - 1,000', count: prices.filter(p => p > 500 && p <= 1000).length },
          { value: '1000-5000', label: 'PKR 1,000 - 5,000', count: prices.filter(p => p > 1000 && p <= 5000).length },
          { value: '5000-10000', label: 'PKR 5,000 - 10,000', count: prices.filter(p => p > 5000 && p <= 10000).length },
          { value: '10000-50000', label: 'PKR 10,000 - 50,000', count: prices.filter(p => p > 10000 && p <= 50000).length },
          { value: '50000-', label: 'Over PKR 50,000', count: prices.filter(p => p > 50000).length },
        ],
      }

      // Rating facet
      const ratingProducts = await db.product.findMany({
        where: { status },
        select: { averageRating: true },
      })

      const ratingFacet: Facet = {
        name: 'rating',
        label: 'Customer Rating',
        options: [
          { value: '4', label: '4 Stars & Up', count: ratingProducts.filter(p => p.averageRating >= 4).length },
          { value: '3', label: '3 Stars & Up', count: ratingProducts.filter(p => p.averageRating >= 3).length },
          { value: '2', label: '2 Stars & Up', count: ratingProducts.filter(p => p.averageRating >= 2).length },
          { value: '1', label: '1 Star & Up', count: ratingProducts.filter(p => p.averageRating >= 1).length },
        ],
      }

      // Availability facet
      const stockProducts = await db.product.findMany({
        where: { status },
        select: { stockQuantity: true },
      })

      const availabilityFacet: Facet = {
        name: 'availability',
        label: 'Availability',
        options: [
          { value: 'inStock', label: 'In Stock', count: stockProducts.filter(p => p.stockQuantity > 0).length },
          { value: 'outOfStock', label: 'Out of Stock', count: stockProducts.filter(p => p.stockQuantity <= 0).length },
        ],
      }

      // Special offers facet
      const offerProducts = await db.product.findMany({
        where: { status },
        select: { discountPercentage: true, freeShipping: true },
      })

      const specialOffersFacet: Facet = {
        name: 'specialOffers',
        label: 'Special Offers',
        options: [
          { value: 'onSale', label: 'On Sale', count: offerProducts.filter(p => p.discountPercentage > 0).length },
          { value: 'freeShipping', label: 'Free Shipping', count: offerProducts.filter(p => p.freeShipping).length },
        ],
      }

      facets = [categoryFacet, brandFacet, priceFacet, ratingFacet, availabilityFacet, specialOffersFacet]
    }

    return NextResponse.json({
      success: true,
      products: transformedProducts,
      data: transformedProducts,
      pagination: {
        total: totalCount,
        page,
        pageSize,
        totalPages: Math.ceil(totalCount / pageSize),
        hasMore: (page * pageSize) < totalCount,
      },
      facets,
      filters: {
        search,
        categories: categoryIds,
        brands: brandIds,
        minPrice,
        maxPrice,
        minRating,
        sortBy,
        inStock,
        freeShipping,
        onSale,
        isBestSeller,
        isNewArrival,
      },
    })
  } catch (error) {
    console.error('Products fetch error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch products' }, { status: 500 })
  }
}

// Helper: Get variant by SKU
async function getVariantBySku(sku: string) {
  try {
    const variant = await db.productVariant.findUnique({
      where: { sku },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            basePrice: true,
            sellerId: true,
            status: true,
            primaryImageUrl: true,
          },
        },
      },
    })

    if (!variant) {
      return NextResponse.json({ success: false, error: 'Variant not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      variant: {
        id: variant.id,
        sku: variant.sku,
        barcode: variant.barcode,
        attributes: variant.attributes ? JSON.parse(variant.attributes) : {},
        priceAdjustment: variant.priceAdjustment,
        compareAtPrice: variant.compareAtPrice,
        stockQuantity: variant.stockQuantity,
        stockReserved: variant.stockReserved,
        imageUrl: variant.imageUrl,
        isActive: variant.isActive,
        product: variant.product ? {
          id: variant.product.id,
          name: variant.product.name,
          slug: variant.product.slug,
          basePrice: variant.product.basePrice,
          sellerId: variant.product.sellerId,
          status: variant.product.status,
          primaryImageUrl: variant.product.primaryImageUrl,
        } : null,
      },
    })
  } catch (error) {
    console.error('Variant fetch error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch variant' }, { status: 500 })
  }
}

// Helper: Get product with full variant details
async function getProductWithVariants(productId: string) {
  try {
    const product = await db.product.findUnique({
      where: { id: productId },
      include: {
        variants: true,
        seller: {
          select: {
            id: true,
            storeName: true,
            storeSlug: true,
            storeLogoUrl: true,
            averageRating: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    })

    if (!product) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      product: {
        id: product.id,
        sku: product.sku,
        name: product.name,
        slug: product.slug,
        description: product.description,
        shortDescription: product.shortDescription,
        status: product.status,
        basePrice: product.basePrice,
        compareAtPrice: product.compareAtPrice,
        stockQuantity: product.stockQuantity,
        hasVariants: product.hasVariants,
        variantAttributes: product.variantAttributes ? JSON.parse(product.variantAttributes) : null,
        primaryImageUrl: product.primaryImageUrl,
        images: product.images ? JSON.parse(product.images) : null,
        variants: product.variants.map((v) => ({
          id: v.id,
          sku: v.sku,
          barcode: v.barcode,
          attributes: v.attributes ? JSON.parse(v.attributes) : {},
          priceAdjustment: v.priceAdjustment,
          compareAtPrice: v.compareAtPrice,
          stockQuantity: v.stockQuantity,
          stockReserved: v.stockReserved,
          imageUrl: v.imageUrl,
          isActive: v.isActive,
        })),
        seller: product.seller ? {
          id: product.seller.id,
          storeName: product.seller.storeName,
          storeSlug: product.seller.storeSlug,
          storeLogoUrl: product.seller.storeLogoUrl,
          averageRating: product.seller.averageRating,
        } : null,
        category: product.category ? {
          id: product.category.id,
          name: product.category.name,
          slug: product.category.slug,
        } : null,
      },
    })
  } catch (error) {
    console.error('Product fetch error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch product' }, { status: 500 })
  }
}

// ============================================
// POST /api/products - Create product (Seller only)
// Supports variant creation
// ============================================
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value
    
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Hash the token
    const encoder = new TextEncoder()
    const data = encoder.encode(token)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const tokenHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    // Verify session and get user
    const session = await db.session.findFirst({
      where: {
        tokenHash,
        isActive: true,
        expiresAt: { gte: new Date() },
      },
      include: { user: true },
    })

    const user = session?.user

    if (!user || (user.role !== UserRole.SELLER && user.role !== UserRole.ADMIN)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Get seller profile
    const seller = await db.seller.findUnique({
      where: { userId: user.id },
    })

    if (!seller) {
      return NextResponse.json({ success: false, error: 'Seller profile not found' }, { status: 404 })
    }

    const body = await request.json()
    
    // Check if this is a variant creation request
    if (body.action === 'create-variant') {
      return await createVariant(body, seller.id)
    }
    
    const {
      name,
      description,
      shortDescription,
      categoryId,
      basePrice,
      compareAtPrice,
      stockQuantity,
      sku,
      primaryImageUrl,
      images,
      weight,
      freeShipping,
      shippingFee,
      warrantyPeriod,
      hasVariants,
      variantAttributes,
      variants,
    } = body

    // Generate slug from name
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now()

    // Create product
    const product = await db.product.create({
      data: {
        sellerId: seller.id,
        sku: sku || `SKU-${Date.now()}`,
        name,
        slug,
        description,
        shortDescription,
        categoryId,
        status: ProductStatus.DRAFT,
        primaryImageUrl,
        images: images ? JSON.stringify(images) : null,
        basePrice: parseFloat(basePrice),
        compareAtPrice: compareAtPrice ? parseFloat(compareAtPrice) : null,
        stockQuantity: parseInt(stockQuantity) || 0,
        weight: weight ? parseFloat(weight) : null,
        freeShipping: freeShipping || false,
        shippingFee: parseFloat(shippingFee) || 0,
        warrantyPeriod,
        hasVariants: hasVariants || false,
        variantAttributes: variantAttributes ? JSON.stringify(variantAttributes) : null,
      },
    })

    // Create variants if provided
    if (hasVariants && variants && Array.isArray(variants) && variants.length > 0) {
      await db.productVariant.createMany({
        data: variants.map((v: Record<string, unknown>, index: number) => ({
          productId: product.id,
          sku: (v.sku as string) || `${product.sku}-V${index + 1}`,
          barcode: v.barcode as string || null,
          attributes: JSON.stringify(v.attributes || {}),
          priceAdjustment: parseFloat((v.priceAdjustment as string) || '0'),
          compareAtPrice: v.compareAtPrice ? parseFloat(v.compareAtPrice as string) : null,
          stockQuantity: parseInt((v.stockQuantity as string) || '0'),
          stockReserved: 0,
          imageUrl: v.imageUrl as string || null,
          isActive: v.isActive !== false,
        })),
      })
    }

    // Update seller product count
    await db.seller.update({
      where: { id: seller.id },
      data: { totalProducts: { increment: 1 } },
    })

    return NextResponse.json({ success: true, data: product, productId: product.id })
  } catch (error) {
    console.error('Product creation error:', error)
    return NextResponse.json({ success: false, error: 'Failed to create product' }, { status: 500 })
  }
}

// Helper: Create variant for existing product
async function createVariant(body: Record<string, unknown>, sellerId: string) {
  const { productId, sku, barcode, attributes, priceAdjustment, compareAtPrice, stockQuantity, imageUrl, isActive } = body

  if (!productId) {
    return NextResponse.json({ success: false, error: 'Product ID is required' }, { status: 400 })
  }

  // Verify product belongs to seller
  const product = await db.product.findUnique({
    where: { id: productId as string },
    select: { id: true, sellerId: true, sku: true, hasVariants: true },
  })

  if (!product) {
    return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 })
  }

  if (product.sellerId !== sellerId) {
    return NextResponse.json({ success: false, error: 'Not authorized' }, { status: 403 })
  }

  // Count existing variants
  const variantCount = await db.productVariant.count({
    where: { productId: productId as string },
  })

  const variantIndex = variantCount + 1

  // Create variant
  const variant = await db.productVariant.create({
    data: {
      productId,
      sku: (sku as string) || `${product.sku}-V${variantIndex}`,
      barcode: barcode as string || null,
      attributes: JSON.stringify(attributes || {}),
      priceAdjustment: parseFloat((priceAdjustment as string) || '0'),
      compareAtPrice: compareAtPrice ? parseFloat(compareAtPrice as string) : null,
      stockQuantity: parseInt((stockQuantity as string) || '0'),
      stockReserved: 0,
      imageUrl: imageUrl as string || null,
      isActive: isActive !== false,
    },
  })

  // Update product to indicate it has variants
  if (!product.hasVariants) {
    await db.product.update({
      where: { id: productId },
      data: { hasVariants: true },
    })
  }

  return NextResponse.json({ success: true, data: variant, variantId: variant.id })
}

// ============================================
// PUT /api/products - Update product
// Supports variant updates
// ============================================
export async function PUT(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value
    
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Hash the token
    const encoder = new TextEncoder()
    const data = encoder.encode(token)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const tokenHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    // Verify session and get user
    const session = await db.session.findFirst({
      where: {
        tokenHash,
        isActive: true,
        expiresAt: { gte: new Date() },
      },
      include: { user: true },
    })

    const user = session?.user

    if (!user || (user.role !== UserRole.SELLER && user.role !== UserRole.ADMIN)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Get seller profile
    const seller = await db.seller.findUnique({
      where: { userId: user.id },
      select: { id: true },
    })

    if (!seller) {
      return NextResponse.json({ success: false, error: 'Seller profile not found' }, { status: 404 })
    }

    const body = await request.json()

    // Check if this is a variant update request
    if (body.action === 'update-variant') {
      return await updateVariant(body, seller.id, user.role)
    }

    const {
      productId,
      name,
      description,
      shortDescription,
      categoryId,
      basePrice,
      compareAtPrice,
      stockQuantity,
      sku,
      primaryImageUrl,
      images,
      weight,
      freeShipping,
      shippingFee,
      warrantyPeriod,
      status,
      variantAttributes,
      variants,
    } = body

    if (!productId) {
      return NextResponse.json({ success: false, error: 'Product ID is required' }, { status: 400 })
    }

    // Check if product belongs to seller
    const existingProduct = await db.product.findUnique({
      where: { id: productId },
      select: { id: true, sellerId: true },
    })

    if (!existingProduct) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 })
    }

    if (existingProduct.sellerId !== seller.id && user.role !== UserRole.ADMIN) {
      return NextResponse.json({ success: false, error: 'Not authorized to update this product' }, { status: 403 })
    }

    // Build update object
    const updateData: Record<string, unknown> = {}

    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (shortDescription !== undefined) updateData.shortDescription = shortDescription
    if (categoryId !== undefined) updateData.categoryId = categoryId
    if (basePrice !== undefined) updateData.basePrice = parseFloat(basePrice)
    if (compareAtPrice !== undefined) updateData.compareAtPrice = compareAtPrice ? parseFloat(compareAtPrice) : null
    if (stockQuantity !== undefined) updateData.stockQuantity = parseInt(stockQuantity)
    if (sku !== undefined) updateData.sku = sku
    if (primaryImageUrl !== undefined) updateData.primaryImageUrl = primaryImageUrl
    if (images !== undefined) updateData.images = images ? JSON.stringify(images) : null
    if (weight !== undefined) updateData.weight = weight ? parseFloat(weight) : null
    if (freeShipping !== undefined) updateData.freeShipping = freeShipping
    if (shippingFee !== undefined) updateData.shippingFee = parseFloat(shippingFee) || 0
    if (warrantyPeriod !== undefined) updateData.warrantyPeriod = warrantyPeriod
    if (status !== undefined) updateData.status = status
    if (variantAttributes !== undefined) updateData.variantAttributes = variantAttributes ? JSON.stringify(variantAttributes) : null

    // Update product
    const product = await db.product.update({
      where: { id: productId },
      data: updateData,
    })

    // Update variants if provided
    if (variants && Array.isArray(variants)) {
      for (const variant of variants) {
        const variantData = variant as Record<string, unknown>
        if (variantData.id) {
          // Update existing variant
          await db.productVariant.update({
            where: { id: variantData.id as string },
            data: {
              sku: variantData.sku,
              barcode: variantData.barcode,
              attributes: JSON.stringify(variantData.attributes || {}),
              priceAdjustment: parseFloat((variantData.priceAdjustment as string) || '0'),
              compareAtPrice: variantData.compareAtPrice ? parseFloat(variantData.compareAtPrice as string) : null,
              stockQuantity: parseInt((variantData.stockQuantity as string) || '0'),
              imageUrl: variantData.imageUrl,
              isActive: variantData.isActive !== false,
            },
          })
        }
      }
    }

    return NextResponse.json({ success: true, data: product })
  } catch (error) {
    console.error('Product update error:', error)
    return NextResponse.json({ success: false, error: 'Failed to update product' }, { status: 500 })
  }
}

// Helper: Update variant
async function updateVariant(body: Record<string, unknown>, sellerId: string, userRole: UserRole) {
  const { variantId, sku, barcode, attributes, priceAdjustment, compareAtPrice, stockQuantity, imageUrl, isActive } = body

  if (!variantId) {
    return NextResponse.json({ success: false, error: 'Variant ID is required' }, { status: 400 })
  }

  // Get variant and verify ownership
  const variant = await db.productVariant.findUnique({
    where: { id: variantId as string },
    include: {
      product: {
        select: { sellerId: true },
      },
    },
  })

  if (!variant) {
    return NextResponse.json({ success: false, error: 'Variant not found' }, { status: 404 })
  }

  if (variant.product?.sellerId !== sellerId && userRole !== UserRole.ADMIN) {
    return NextResponse.json({ success: false, error: 'Not authorized' }, { status: 403 })
  }

  // Build update object
  const updateData: Record<string, unknown> = {}
  
  if (sku !== undefined) updateData.sku = sku
  if (barcode !== undefined) updateData.barcode = barcode
  if (attributes !== undefined) updateData.attributes = JSON.stringify(attributes)
  if (priceAdjustment !== undefined) updateData.priceAdjustment = parseFloat(priceAdjustment as string)
  if (compareAtPrice !== undefined) updateData.compareAtPrice = compareAtPrice ? parseFloat(compareAtPrice as string) : null
  if (stockQuantity !== undefined) updateData.stockQuantity = parseInt(stockQuantity as string)
  if (imageUrl !== undefined) updateData.imageUrl = imageUrl
  if (isActive !== undefined) updateData.isActive = isActive

  const updatedVariant = await db.productVariant.update({
    where: { id: variantId },
    data: updateData,
  })

  return NextResponse.json({ success: true, data: updatedVariant })
}

// ============================================
// DELETE /api/products - Delete product or variant
// ============================================
export async function DELETE(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value
    
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Hash the token
    const encoder = new TextEncoder()
    const data = encoder.encode(token)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const tokenHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    // Verify session and get user
    const session = await db.session.findFirst({
      where: {
        tokenHash,
        isActive: true,
        expiresAt: { gte: new Date() },
      },
      include: { user: true },
    })

    const user = session?.user

    if (!user || (user.role !== UserRole.SELLER && user.role !== UserRole.ADMIN)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Get seller profile
    const seller = await db.seller.findUnique({
      where: { userId: user.id },
      select: { id: true, totalProducts: true },
    })

    if (!seller) {
      return NextResponse.json({ success: false, error: 'Seller profile not found' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    
    // Check if this is a variant deletion
    const variantId = searchParams.get('variantId')
    if (variantId) {
      return await deleteVariant(variantId, seller.id, user.role)
    }

    const productId = searchParams.get('id')

    if (!productId) {
      return NextResponse.json({ success: false, error: 'Product ID is required' }, { status: 400 })
    }

    // Check if product belongs to seller
    const existingProduct = await db.product.findUnique({
      where: { id: productId },
      select: { id: true, sellerId: true },
    })

    if (!existingProduct) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 })
    }

    if (existingProduct.sellerId !== seller.id && user.role !== UserRole.ADMIN) {
      return NextResponse.json({ success: false, error: 'Not authorized to delete this product' }, { status: 403 })
    }

    // Delete product (variants will cascade delete)
    await db.product.delete({
      where: { id: productId },
    })

    // Update seller product count
    await db.seller.update({
      where: { id: seller.id },
      data: { totalProducts: Math.max(0, (seller.totalProducts || 1) - 1) },
    })

    return NextResponse.json({ success: true, message: 'Product deleted successfully' })
  } catch (error) {
    console.error('Product delete error:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete product' }, { status: 500 })
  }
}

// Helper: Delete variant
async function deleteVariant(variantId: string, sellerId: string, userRole: UserRole) {
  // Get variant and verify ownership
  const variant = await db.productVariant.findUnique({
    where: { id: variantId },
    include: {
      product: {
        select: { sellerId: true },
      },
    },
  })

  if (!variant) {
    return NextResponse.json({ success: false, error: 'Variant not found' }, { status: 404 })
  }

  if (variant.product?.sellerId !== sellerId && userRole !== UserRole.ADMIN) {
    return NextResponse.json({ success: false, error: 'Not authorized' }, { status: 403 })
  }

  // Delete variant
  await db.productVariant.delete({
    where: { id: variantId },
  })

  return NextResponse.json({ success: true, message: 'Variant deleted successfully' })
}
