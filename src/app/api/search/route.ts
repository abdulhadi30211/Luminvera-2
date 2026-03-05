import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ProductStatus, SellerStatus } from '@prisma/client'

// Types
interface SearchResult {
  type: 'product' | 'category' | 'seller'
  id: string
  name: string
  slug?: string
  imageUrl?: string
  price?: number
  rating?: number
  reviewCount?: number
  storeName?: string
  productCount?: number
  description?: string
  relevanceScore: number
}

interface SearchHistoryItem {
  id: string
  query: string
  resultsCount: number
  createdAt: Date
}

// GET /api/search - Global search with multiple entity types
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'search'
    
    // Handle different GET actions
    switch (action) {
      case 'popular':
        return await getPopularSearches()
      case 'suggestions':
        return await getSearchSuggestions(searchParams)
      case 'history':
        return await getSearchHistory(request)
      default:
        return await globalSearch(searchParams)
    }
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json({ success: false, error: 'Search failed' }, { status: 500 })
  }
}

// Global search across products, categories, and sellers
async function globalSearch(searchParams: URLSearchParams) {
  const query = searchParams.get('q') || searchParams.get('query') || ''
  const type = searchParams.get('type') || 'all' // all, products, categories, sellers
  const limit = parseInt(searchParams.get('limit') || '20')
  const includeFacets = searchParams.get('includeFacets') !== 'false'
  
  if (!query.trim()) {
    return NextResponse.json({
      success: true,
      results: { products: [], categories: [], sellers: [] },
      total: 0,
      query: ''
    })
  }

  const searchTerms = query.toLowerCase().trim()
  const results: {
    products: SearchResult[]
    categories: SearchResult[]
    sellers: SearchResult[]
  } = {
    products: [],
    categories: [],
    sellers: []
  }

  // Search products
  if (type === 'all' || type === 'products') {
    const products = await db.product.findMany({
      where: {
        status: ProductStatus.LIVE,
        OR: [
          { name: { contains: searchTerms, mode: 'insensitive' } },
          { description: { contains: searchTerms, mode: 'insensitive' } }
        ]
      },
      select: {
        id: true,
        name: true,
        slug: true,
        basePrice: true,
        primaryImageUrl: true,
        averageRating: true,
        totalReviews: true,
        sellerId: true,
        discountPercentage: true,
        purchaseCount: true
      },
      orderBy: { purchaseCount: 'desc' },
      take: limit
    })

    // Get seller info separately
    const sellerIds = [...new Set(products.map(p => p.sellerId).filter(Boolean))]
    const sellers = sellerIds.length > 0 ? await db.seller.findMany({
      where: { id: { in: sellerIds } },
      select: { id: true, storeName: true, storeSlug: true }
    }) : []
    
    const sellerMap = new Map(sellers.map(s => [s.id, s]))

    results.products = products.map(p => ({
      type: 'product' as const,
      id: p.id,
      name: p.name,
      slug: p.slug,
      imageUrl: p.primaryImageUrl || undefined,
      price: p.basePrice,
      rating: p.averageRating || 0,
      reviewCount: p.totalReviews || 0,
      storeName: sellerMap.get(p.sellerId)?.storeName,
      relevanceScore: calculateRelevance(p.name, searchTerms)
    })).sort((a, b) => b.relevanceScore - a.relevanceScore)
  }

  // Search categories
  if (type === 'all' || type === 'categories') {
    const categories = await db.category.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: searchTerms, mode: 'insensitive' } },
          { description: { contains: searchTerms, mode: 'insensitive' } }
        ]
      },
      select: {
        id: true,
        name: true,
        slug: true,
        imageUrl: true,
        description: true
      },
      take: 10
    })

    // Get product counts for categories
    const categoryIds = categories.map(c => c.id)
    const productCounts = await db.product.groupBy({
      by: ['categoryId'],
      where: {
        status: ProductStatus.LIVE,
        categoryId: { in: categoryIds }
      },
      _count: true
    })

    const countMap = new Map<string, number>()
    productCounts.forEach(p => {
      if (p.categoryId) {
        countMap.set(p.categoryId, p._count)
      }
    })

    results.categories = categories.map(c => ({
      type: 'category' as const,
      id: c.id,
      name: c.name,
      slug: c.slug,
      imageUrl: c.imageUrl || undefined,
      description: c.description || undefined,
      productCount: countMap.get(c.id) || 0,
      relevanceScore: calculateRelevance(c.name, searchTerms)
    })).sort((a, b) => b.relevanceScore - a.relevanceScore)
  }

  // Search sellers
  if (type === 'all' || type === 'sellers') {
    const sellers = await db.seller.findMany({
      where: {
        status: SellerStatus.VERIFIED,
        OR: [
          { storeName: { contains: searchTerms, mode: 'insensitive' } },
          { storeDescription: { contains: searchTerms, mode: 'insensitive' } }
        ]
      },
      select: {
        id: true,
        storeName: true,
        storeSlug: true,
        storeLogoUrl: true,
        averageRating: true,
        totalReviews: true,
        totalProducts: true
      },
      take: 10
    })

    results.sellers = sellers.map(s => ({
      type: 'seller' as const,
      id: s.id,
      name: s.storeName,
      slug: s.storeSlug,
      imageUrl: s.storeLogoUrl || undefined,
      rating: s.averageRating || 0,
      reviewCount: s.totalReviews || 0,
      productCount: s.totalProducts || 0,
      relevanceScore: calculateRelevance(s.storeName, searchTerms)
    })).sort((a, b) => b.relevanceScore - a.relevanceScore)
  }

  // Build facets
  let facets = null
  if (includeFacets) {
    facets = {
      types: [
        { value: 'products', label: 'Products', count: results.products.length },
        { value: 'categories', label: 'Categories', count: results.categories.length },
        { value: 'sellers', label: 'Sellers', count: results.sellers.length }
      ]
    }
  }

  const total = results.products.length + results.categories.length + results.sellers.length

  return NextResponse.json({
    success: true,
    query,
    results,
    total,
    facets
  })
}

// Get popular searches
async function getPopularSearches() {
  try {
    // Get recent search history aggregated by query
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    
    const searchHistory = await db.searchHistory.findMany({
      where: {
        createdAt: { gte: sevenDaysAgo }
      },
      select: { query: true },
      take: 1000
    })

    // Count queries
    const queryCounts = new Map<string, number>()
    searchHistory.forEach(item => {
      const normalized = item.query.toLowerCase().trim()
      if (normalized.length > 0) {
        queryCounts.set(normalized, (queryCounts.get(normalized) || 0) + 1)
      }
    })

    // Sort by count and get top 20
    const popularSearches = Array.from(queryCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([query, count]) => ({ query, count }))

    // If no search history, return default popular searches
    const defaultSearches = [
      { query: 'iPhone', count: 0 },
      { query: 'Samsung Galaxy', count: 0 },
      { query: 'Laptop', count: 0 },
      { query: 'Headphones', count: 0 },
      { query: 'Smart Watch', count: 0 },
      { query: 'Men Shoes', count: 0 },
      { query: 'Women Dress', count: 0 },
      { query: 'Kitchen Appliances', count: 0 },
      { query: 'Mobile Accessories', count: 0 },
      { query: 'Gaming', count: 0 },
    ]

    return NextResponse.json({
      success: true,
      popularSearches: popularSearches.length > 0 ? popularSearches : defaultSearches
    })
  } catch (error) {
    console.error('Popular searches error:', error)
    return NextResponse.json({ success: false, error: 'Failed to get popular searches' }, { status: 500 })
  }
}

// Get search suggestions (autocomplete)
async function getSearchSuggestions(searchParams: URLSearchParams) {
  const query = searchParams.get('q') || ''
  const limit = parseInt(searchParams.get('limit') || '10')
  
  if (!query.trim() || query.length < 2) {
    return NextResponse.json({
      success: true,
      suggestions: []
    })
  }

  const searchTerms = query.toLowerCase().trim()
  const suggestions: { text: string; type: 'product' | 'category' | 'seller' | 'query'; count?: number }[] = []

  // Get product name suggestions
  const products = await db.product.findMany({
    where: {
      status: ProductStatus.LIVE,
      name: { contains: searchTerms, mode: 'insensitive' }
    },
    select: { name: true },
    take: limit
  })

  const uniqueProductNames = new Set<string>()
  products.forEach(p => {
    // Extract words that match
    const words = p.name.toLowerCase().split(/\s+/)
    words.forEach(word => {
      if (word.includes(searchTerms) && !uniqueProductNames.has(word)) {
        uniqueProductNames.add(word)
      }
    })
    // Also add full name if it starts with search term
    if (p.name.toLowerCase().startsWith(searchTerms)) {
      uniqueProductNames.add(p.name.toLowerCase())
    }
  })

  uniqueProductNames.forEach(name => {
    suggestions.push({ text: name, type: 'query' })
  })

  // Get category suggestions
  const categories = await db.category.findMany({
    where: {
      isActive: true,
      name: { contains: searchTerms, mode: 'insensitive' }
    },
    select: { name: true },
    take: 5
  })

  categories.forEach(c => {
    suggestions.push({ text: c.name, type: 'category' })
  })

  // Get seller/store suggestions
  const sellers = await db.seller.findMany({
    where: {
      status: SellerStatus.VERIFIED,
      storeName: { contains: searchTerms, mode: 'insensitive' }
    },
    select: { storeName: true },
    take: 5
  })

  sellers.forEach(s => {
    suggestions.push({ text: s.storeName, type: 'seller' })
  })

  // Get popular searches that match
  const popularQueries = await db.searchHistory.findMany({
    where: {
      query: { contains: searchTerms, mode: 'insensitive' }
    },
    select: { query: true },
    take: 20
  })

  const queryCounts = new Map<string, number>()
  popularQueries.forEach(item => {
    const normalized = item.query.toLowerCase().trim()
    if (normalized.includes(searchTerms)) {
      queryCounts.set(normalized, (queryCounts.get(normalized) || 0) + 1)
    }
  })

  Array.from(queryCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .forEach(([q, count]) => {
      if (!suggestions.find(s => s.text.toLowerCase() === q)) {
        suggestions.push({ text: q, type: 'query', count })
      }
    })

  // Limit and sort by relevance
  const sortedSuggestions = suggestions
    .sort((a, b) => {
      // Prioritize items that start with the query
      const aStartsWith = a.text.toLowerCase().startsWith(searchTerms) ? 1 : 0
      const bStartsWith = b.text.toLowerCase().startsWith(searchTerms) ? 1 : 0
      return bStartsWith - aStartsWith || (b.count || 0) - (a.count || 0)
    })
    .slice(0, limit)

  return NextResponse.json({
    success: true,
    query,
    suggestions: sortedSuggestions
  })
}

// Get user's search history
async function getSearchHistory(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')

    if (!token) {
      return NextResponse.json({
        success: true,
        history: []
      })
    }

    // Verify session
    const encoder = new TextEncoder()
    const data = encoder.encode(token)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const tokenHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    const session = await db.session.findFirst({
      where: {
        tokenHash,
        isActive: true
      },
      select: { userId: true }
    })

    const userId = session?.userId
    if (!userId) {
      return NextResponse.json({
        success: true,
        history: []
      })
    }

    const history = await db.searchHistory.findMany({
      where: { userId },
      select: {
        id: true,
        query: true,
        resultsCount: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    })

    return NextResponse.json({
      success: true,
      history: history.map(h => ({
        id: h.id,
        query: h.query,
        resultsCount: h.resultsCount,
        createdAt: h.createdAt.toISOString()
      }))
    })
  } catch (error) {
    console.error('Search history error:', error)
    return NextResponse.json({ success: false, error: 'Failed to get search history' }, { status: 500 })
  }
}

// POST /api/search - Save search to history
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value
    const body = await request.json()
    const { query, resultsCount = 0 } = body

    if (!query || !query.trim()) {
      return NextResponse.json({ success: true, message: 'Empty query, not saved' })
    }

    // Try to save to user's history if authenticated
    if (token) {
      const encoder = new TextEncoder()
      const data = encoder.encode(token)
      const hashBuffer = await crypto.subtle.digest('SHA-256', data)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      const tokenHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

      const session = await db.session.findFirst({
        where: {
          tokenHash,
          isActive: true
        },
        select: { userId: true }
      })

      const userId = session?.userId
      if (userId) {
        await db.searchHistory.create({
          data: {
            userId,
            query: query.trim(),
            resultsCount
          }
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Search saved to history'
    })
  } catch (error) {
    console.error('Save search error:', error)
    // Don't fail the request if saving history fails
    return NextResponse.json({ success: true, message: 'Search completed (history not saved)' })
  }
}

// DELETE /api/search - Clear search history
export async function DELETE(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value
    const { searchParams } = new URL(request.url)
    const historyId = searchParams.get('id') // Delete specific item
    const clearAll = searchParams.get('all') === 'true'

    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Verify session
    const encoder = new TextEncoder()
    const data = encoder.encode(token)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const tokenHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    const session = await db.session.findFirst({
      where: {
        tokenHash,
        isActive: true
      },
      select: { userId: true }
    })

    const userId = session?.userId
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    if (clearAll) {
      await db.searchHistory.deleteMany({
        where: { userId }
      })
    } else if (historyId) {
      await db.searchHistory.deleteMany({
        where: {
          id: historyId,
          userId
        }
      })
    }

    return NextResponse.json({
      success: true,
      message: clearAll ? 'All search history cleared' : 'Search history item deleted'
    })
  } catch (error) {
    console.error('Delete search history error:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete search history' }, { status: 500 })
  }
}

// Helper function to calculate relevance score
function calculateRelevance(text: string, query: string): number {
  const textLower = text.toLowerCase()
  const queryLower = query.toLowerCase()
  
  let score = 0
  
  // Exact match
  if (textLower === queryLower) {
    score += 100
  }
  // Starts with query
  else if (textLower.startsWith(queryLower)) {
    score += 80
  }
  // Contains query as word
  else if (textLower.includes(` ${queryLower} `)) {
    score += 60
  }
  // Contains query
  else if (textLower.includes(queryLower)) {
    score += 40
  }
  
  // Bonus for shorter text (more precise match)
  score += Math.max(0, 20 - text.length / 10)
  
  return score
}
