// Admin SEO API Route - Platform SEO Settings Management
// Using dedicated SeoSetting and PageSeo models
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Helper to hash token using SHA-256
async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(token)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// Helper to get user from session token
async function getUserFromToken(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value
  if (!token) return null

  const tokenHash = await hashToken(token)

  const session = await db.session.findFirst({
    where: {
      tokenHash,
      isActive: true,
      expiresAt: {
        gt: new Date(),
      },
    },
    include: {
      user: {
        select: {
          id: true,
          role: true,
        },
      },
    },
  })

  return session?.user
}

function isAdmin(user: { role: string } | null): boolean {
  return user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN'
}

// Default SEO settings
function getDefaultSeoSettings() {
  return {
    siteName: 'LUMINVERA',
    siteDescription: "Pakistan's #1 Multi-Vendor E-Commerce Marketplace - Shop electronics, fashion, home & more with verified sellers, secure payments & fast delivery.",
    defaultKeywords: 'ecommerce, online shopping, Pakistan, electronics, fashion, home appliances, mobile phones, laptops, clothing, shoes, beauty, health, marketplace, buy online',
    ogImage: '',
    twitterCard: 'summary_large_image',
    robotsTxt: `User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/
Disallow: /account/
Disallow: /cart/
Disallow: /checkout/

Sitemap: https://luminvera.pk/sitemap.xml`,
  }
}

// Default page SEO entries
function getDefaultPageSeo(): Array<{
  pagePath: string
  pageName: string
  metaTitle: string
  metaDescription: string
  metaKeywords: string
  noIndex: boolean
  noFollow: boolean
}> {
  return [
    {
      pagePath: '/',
      pageName: 'Home',
      metaTitle: 'LUMINVERA - Pakistan\'s #1 Online Marketplace',
      metaDescription: 'Shop millions of products from verified sellers. Electronics, fashion, home appliances & more. Secure payments, fast delivery & easy returns.',
      metaKeywords: 'online shopping, Pakistan marketplace, buy online, electronics, fashion',
      noIndex: false,
      noFollow: false,
    },
    {
      pagePath: '/products',
      pageName: 'Products',
      metaTitle: 'Products - LUMINVERA',
      metaDescription: 'Browse our wide selection of products across all categories. Find the best deals on electronics, fashion, home & more.',
      metaKeywords: 'products, shop, deals, electronics, fashion, home',
      noIndex: false,
      noFollow: false,
    },
    {
      pagePath: '/categories',
      pageName: 'Categories',
      metaTitle: 'Categories - LUMINVERA',
      metaDescription: 'Explore product categories on LUMINVERA. Electronics, Fashion, Home & Living, Beauty, and more.',
      metaKeywords: 'categories, electronics, fashion, home, beauty',
      noIndex: false,
      noFollow: false,
    },
    {
      pagePath: '/sellers',
      pageName: 'Sellers',
      metaTitle: 'Sellers - LUMINVERA',
      metaDescription: 'Discover trusted sellers on LUMINVERA. Browse verified stores and shop with confidence.',
      metaKeywords: 'sellers, verified stores, trusted sellers, shops',
      noIndex: false,
      noFollow: false,
    },
    {
      pagePath: '/about',
      pageName: 'About Us',
      metaTitle: 'About Us - LUMINVERA',
      metaDescription: 'Learn about LUMINVERA - Pakistan\'s leading multi-vendor e-commerce platform connecting millions of buyers with verified sellers.',
      metaKeywords: 'about luminvera, company, our story',
      noIndex: false,
      noFollow: false,
    },
    {
      pagePath: '/contact',
      pageName: 'Contact Us',
      metaTitle: 'Contact Us - LUMINVERA',
      metaDescription: 'Get in touch with LUMINVERA support. We\'re here to help with orders, returns, and any questions.',
      metaKeywords: 'contact, support, help, customer service',
      noIndex: false,
      noFollow: false,
    },
    {
      pagePath: '/privacy',
      pageName: 'Privacy Policy',
      metaTitle: 'Privacy Policy - LUMINVERA',
      metaDescription: 'Read our privacy policy to understand how LUMINVERA collects, uses, and protects your personal information.',
      metaKeywords: 'privacy policy, data protection, personal information',
      noIndex: false,
      noFollow: false,
    },
    {
      pagePath: '/terms',
      pageName: 'Terms of Service',
      metaTitle: 'Terms of Service - LUMINVERA',
      metaDescription: 'Read LUMINVERA\'s terms of service and user agreement for using our e-commerce platform.',
      metaKeywords: 'terms of service, user agreement, legal',
      noIndex: false,
      noFollow: false,
    },
    {
      pagePath: '/faq',
      pageName: 'FAQ',
      metaTitle: 'Frequently Asked Questions - LUMINVERA',
      metaDescription: 'Find answers to common questions about orders, shipping, returns, payments, and more on LUMINVERA.',
      metaKeywords: 'faq, help, questions, answers',
      noIndex: false,
      noFollow: false,
    },
    {
      pagePath: '/cart',
      pageName: 'Shopping Cart',
      metaTitle: 'Shopping Cart - LUMINVERA',
      metaDescription: 'Review your shopping cart and proceed to checkout.',
      metaKeywords: '',
      noIndex: true,
      noFollow: true,
    },
    {
      pagePath: '/checkout',
      pageName: 'Checkout',
      metaTitle: 'Checkout - LUMINVERA',
      metaDescription: 'Complete your purchase securely on LUMINVERA.',
      metaKeywords: '',
      noIndex: true,
      noFollow: true,
    },
    {
      pagePath: '/account',
      pageName: 'My Account',
      metaTitle: 'My Account - LUMINVERA',
      metaDescription: 'Manage your LUMINVERA account, orders, and preferences.',
      metaKeywords: '',
      noIndex: true,
      noFollow: true,
    },
  ]
}

// GET /api/admin/seo - Fetch SEO settings
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken(request)

    // Allow public access for reading SEO settings (for frontend meta tags)
    // But require admin for full details
    const isAdminUser = isAdmin(user)
    const { searchParams } = new URL(request.url)
    const publicOnly = searchParams.get('public') === 'true'

    // Fetch global SEO settings
    let seoSetting = await db.seoSetting.findFirst()

    // If no settings exist, create default
    if (!seoSetting) {
      const defaults = getDefaultSeoSettings()
      seoSetting = await db.seoSetting.create({
        data: {
          siteName: defaults.siteName,
          siteDescription: defaults.siteDescription,
          defaultKeywords: defaults.defaultKeywords,
          ogImage: defaults.ogImage,
          twitterCard: defaults.twitterCard,
          robotsTxt: defaults.robotsTxt,
        },
      })
    }

    // Fetch page-specific SEO settings
    let pageSeoRecords = await db.pageSeo.findMany({
      orderBy: { pagePath: 'asc' },
    })

    // If no page SEO records exist, create defaults
    if (pageSeoRecords.length === 0) {
      const defaultPages = getDefaultPageSeo()
      const createPromises = defaultPages.map((page) =>
        db.pageSeo.create({
          data: {
            pagePath: page.pagePath,
            pageName: page.pageName,
            metaTitle: page.metaTitle,
            metaDescription: page.metaDescription,
            metaKeywords: page.metaKeywords,
            noIndex: page.noIndex,
            noFollow: page.noFollow,
          },
        })
      )
      pageSeoRecords = await Promise.all(createPromises)
    }

    // Transform page SEO for response
    const pageSeo = pageSeoRecords.map((page) => ({
      id: page.id,
      pagePath: page.pagePath,
      pageName: page.pageName,
      metaTitle: page.metaTitle || '',
      metaDescription: page.metaDescription || '',
      metaKeywords: page.metaKeywords || '',
      ogTitle: page.ogTitle || '',
      ogDescription: page.ogDescription || '',
      ogImage: page.ogImage || '',
      twitterTitle: page.twitterTitle || '',
      twitterDescription: page.twitterDescription || '',
      twitterImage: page.twitterImage || '',
      noIndex: page.noIndex,
      noFollow: page.noFollow,
      canonicalUrl: page.canonicalUrl || '',
      structuredData: page.structuredData || '',
    }))

    // Public response (limited fields)
    if (publicOnly || !isAdminUser) {
      return NextResponse.json({
        success: true,
        seo: {
          siteName: seoSetting.siteName,
          siteDescription: seoSetting.siteDescription,
          defaultKeywords: seoSetting.defaultKeywords,
          ogImage: seoSetting.ogImage,
          twitterCard: seoSetting.twitterCard,
          robotsTxt: seoSetting.robotsTxt,
        },
        pageSeo: pageSeo.map((p) => ({
          pagePath: p.pagePath,
          metaTitle: p.metaTitle,
          metaDescription: p.metaDescription,
          noIndex: p.noIndex,
          noFollow: p.noFollow,
        })),
      })
    }

    // Full admin response
    return NextResponse.json({
      success: true,
      seo: {
        id: seoSetting.id,
        siteName: seoSetting.siteName,
        siteDescription: seoSetting.siteDescription || '',
        defaultKeywords: seoSetting.defaultKeywords || '',
        ogImage: seoSetting.ogImage || '',
        twitterCard: seoSetting.twitterCard,
        twitterSite: seoSetting.twitterSite || '',
        robotsTxt: seoSetting.robotsTxt || '',
        googleAnalyticsId: seoSetting.googleAnalyticsId || '',
        googleTagManagerId: seoSetting.googleTagManagerId || '',
        facebookPixelId: seoSetting.facebookPixelId || '',
        enableStructuredData: seoSetting.enableStructuredData,
        enableSitemap: seoSetting.enableSitemap,
        excludePages: seoSetting.excludePages || '',
        canonicalUrl: seoSetting.canonicalUrl || '',
        forceHttps: seoSetting.forceHttps,
        createdAt: seoSetting.createdAt,
        updatedAt: seoSetting.updatedAt,
      },
      pageSeo,
    })
  } catch (error) {
    console.error('Admin SEO GET error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/admin/seo - Save SEO settings
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request)

    if (!isAdmin(user)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { seo, pageSeo } = body

    // Validate input
    if (!seo && !pageSeo) {
      return NextResponse.json(
        { success: false, error: 'SEO settings or page SEO data is required' },
        { status: 400 }
      )
    }

    // Update global SEO settings
    if (seo) {
      // Validate field lengths
      if (seo.siteName && seo.siteName.length > 60) {
        return NextResponse.json(
          { success: false, error: 'Site name must be 60 characters or less' },
          { status: 400 }
        )
      }

      if (seo.siteDescription && seo.siteDescription.length > 160) {
        return NextResponse.json(
          { success: false, error: 'Site description must be 160 characters or less' },
          { status: 400 }
        )
      }

      // Get existing or create new
      const existing = await db.seoSetting.findFirst()

      if (existing) {
        await db.seoSetting.update({
          where: { id: existing.id },
          data: {
            siteName: seo.siteName,
            siteDescription: seo.siteDescription || null,
            defaultKeywords: seo.defaultKeywords || null,
            ogImage: seo.ogImage || null,
            twitterCard: seo.twitterCard || 'summary_large_image',
            twitterSite: seo.twitterSite || null,
            robotsTxt: seo.robotsTxt || null,
            googleAnalyticsId: seo.googleAnalyticsId || null,
            googleTagManagerId: seo.googleTagManagerId || null,
            facebookPixelId: seo.facebookPixelId || null,
            enableStructuredData: seo.enableStructuredData ?? true,
            enableSitemap: seo.enableSitemap ?? true,
            excludePages: seo.excludePages || null,
            canonicalUrl: seo.canonicalUrl || null,
            forceHttps: seo.forceHttps ?? true,
          },
        })
      } else {
        await db.seoSetting.create({
          data: {
            siteName: seo.siteName || 'LUMINVERA',
            siteDescription: seo.siteDescription || null,
            defaultKeywords: seo.defaultKeywords || null,
            ogImage: seo.ogImage || null,
            twitterCard: seo.twitterCard || 'summary_large_image',
            twitterSite: seo.twitterSite || null,
            robotsTxt: seo.robotsTxt || null,
            googleAnalyticsId: seo.googleAnalyticsId || null,
            googleTagManagerId: seo.googleTagManagerId || null,
            facebookPixelId: seo.facebookPixelId || null,
            enableStructuredData: seo.enableStructuredData ?? true,
            enableSitemap: seo.enableSitemap ?? true,
            excludePages: seo.excludePages || null,
            canonicalUrl: seo.canonicalUrl || null,
            forceHttps: seo.forceHttps ?? true,
          },
        })
      }
    }

    // Update page-specific SEO settings
    if (pageSeo && Array.isArray(pageSeo)) {
      for (const page of pageSeo) {
        if (!page.pagePath) continue

        // Validate meta title length
        if (page.metaTitle && page.metaTitle.length > 60) {
          return NextResponse.json(
            { success: false, error: `Meta title for ${page.pagePath} must be 60 characters or less` },
            { status: 400 }
          )
        }

        // Validate meta description length
        if (page.metaDescription && page.metaDescription.length > 160) {
          return NextResponse.json(
            { success: false, error: `Meta description for ${page.pagePath} must be 160 characters or less` },
            { status: 400 }
          )
        }

        // Validate structured data if provided
        if (page.structuredData) {
          try {
            JSON.parse(page.structuredData)
          } catch {
            return NextResponse.json(
              { success: false, error: `Invalid JSON-LD structured data for ${page.pagePath}` },
              { status: 400 }
            )
          }
        }

        // Upsert page SEO
        await db.pageSeo.upsert({
          where: { pagePath: page.pagePath },
          update: {
            pageName: page.pageName,
            metaTitle: page.metaTitle || null,
            metaDescription: page.metaDescription || null,
            metaKeywords: page.metaKeywords || null,
            ogTitle: page.ogTitle || null,
            ogDescription: page.ogDescription || null,
            ogImage: page.ogImage || null,
            twitterTitle: page.twitterTitle || null,
            twitterDescription: page.twitterDescription || null,
            twitterImage: page.twitterImage || null,
            noIndex: page.noIndex ?? false,
            noFollow: page.noFollow ?? false,
            canonicalUrl: page.canonicalUrl || null,
            structuredData: page.structuredData || null,
          },
          create: {
            pagePath: page.pagePath,
            pageName: page.pageName || page.pagePath,
            metaTitle: page.metaTitle || null,
            metaDescription: page.metaDescription || null,
            metaKeywords: page.metaKeywords || null,
            ogTitle: page.ogTitle || null,
            ogDescription: page.ogDescription || null,
            ogImage: page.ogImage || null,
            twitterTitle: page.twitterTitle || null,
            twitterDescription: page.twitterDescription || null,
            twitterImage: page.twitterImage || null,
            noIndex: page.noIndex ?? false,
            noFollow: page.noFollow ?? false,
            canonicalUrl: page.canonicalUrl || null,
            structuredData: page.structuredData || null,
          },
        })
      }
    }

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: user.id,
        userRole: user.role,
        action: 'UPDATE_SEO_SETTINGS',
        entityType: 'seo_settings',
        newValue: JSON.stringify({ seo, pageSeoCount: pageSeo?.length || 0 }),
      },
    })

    return NextResponse.json({
      success: true,
      message: 'SEO settings saved successfully',
    })
  } catch (error) {
    console.error('Admin SEO POST error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/admin/seo - Update single page SEO
export async function PUT(request: NextRequest) {
  try {
    const user = await getUserFromToken(request)

    if (!isAdmin(user)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { pagePath, pageSeo } = body

    if (!pagePath) {
      return NextResponse.json(
        { success: false, error: 'Page path is required' },
        { status: 400 }
      )
    }

    if (!pageSeo) {
      return NextResponse.json(
        { success: false, error: 'Page SEO data is required' },
        { status: 400 }
      )
    }

    // Validate meta title length
    if (pageSeo.metaTitle && pageSeo.metaTitle.length > 60) {
      return NextResponse.json(
        { success: false, error: 'Meta title must be 60 characters or less' },
        { status: 400 }
      )
    }

    // Validate meta description length
    if (pageSeo.metaDescription && pageSeo.metaDescription.length > 160) {
      return NextResponse.json(
        { success: false, error: 'Meta description must be 160 characters or less' },
        { status: 400 }
      )
    }

    // Validate structured data if provided
    if (pageSeo.structuredData) {
      try {
        JSON.parse(pageSeo.structuredData)
      } catch {
        return NextResponse.json(
          { success: false, error: 'Invalid JSON-LD structured data' },
          { status: 400 }
        )
      }
    }

    const updated = await db.pageSeo.upsert({
      where: { pagePath },
      update: {
        pageName: pageSeo.pageName,
        metaTitle: pageSeo.metaTitle || null,
        metaDescription: pageSeo.metaDescription || null,
        metaKeywords: pageSeo.metaKeywords || null,
        ogTitle: pageSeo.ogTitle || null,
        ogDescription: pageSeo.ogDescription || null,
        ogImage: pageSeo.ogImage || null,
        twitterTitle: pageSeo.twitterTitle || null,
        twitterDescription: pageSeo.twitterDescription || null,
        twitterImage: pageSeo.twitterImage || null,
        noIndex: pageSeo.noIndex ?? false,
        noFollow: pageSeo.noFollow ?? false,
        canonicalUrl: pageSeo.canonicalUrl || null,
        structuredData: pageSeo.structuredData || null,
      },
      create: {
        pagePath,
        pageName: pageSeo.pageName || pagePath,
        metaTitle: pageSeo.metaTitle || null,
        metaDescription: pageSeo.metaDescription || null,
        metaKeywords: pageSeo.metaKeywords || null,
        ogTitle: pageSeo.ogTitle || null,
        ogDescription: pageSeo.ogDescription || null,
        ogImage: pageSeo.ogImage || null,
        twitterTitle: pageSeo.twitterTitle || null,
        twitterDescription: pageSeo.twitterDescription || null,
        twitterImage: pageSeo.twitterImage || null,
        noIndex: pageSeo.noIndex ?? false,
        noFollow: pageSeo.noFollow ?? false,
        canonicalUrl: pageSeo.canonicalUrl || null,
        structuredData: pageSeo.structuredData || null,
      },
    })

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: user.id,
        userRole: user.role,
        action: 'UPDATE_PAGE_SEO',
        entityType: 'page_seo',
        entityId: updated.id,
        newValue: JSON.stringify(pageSeo),
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Page SEO updated successfully',
      pageSeo: updated,
    })
  } catch (error) {
    console.error('Admin SEO PUT error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/seo - Reset SEO to defaults or delete page SEO
export async function DELETE(request: NextRequest) {
  try {
    const user = await getUserFromToken(request)

    if (!isAdmin(user)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const pagePath = searchParams.get('pagePath')
    const resetAll = searchParams.get('resetAll') === 'true'

    if (resetAll) {
      // Reset all SEO settings to defaults
      const defaults = getDefaultSeoSettings()
      const defaultPages = getDefaultPageSeo()

      // Reset global settings
      const existing = await db.seoSetting.findFirst()
      if (existing) {
        await db.seoSetting.update({
          where: { id: existing.id },
          data: {
            siteName: defaults.siteName,
            siteDescription: defaults.siteDescription,
            defaultKeywords: defaults.defaultKeywords,
            ogImage: defaults.ogImage,
            twitterCard: defaults.twitterCard,
            robotsTxt: defaults.robotsTxt,
            twitterSite: null,
            googleAnalyticsId: null,
            googleTagManagerId: null,
            facebookPixelId: null,
            enableStructuredData: true,
            enableSitemap: true,
            excludePages: null,
            canonicalUrl: null,
            forceHttps: true,
          },
        })
      }

      // Reset page SEO
      await db.pageSeo.deleteMany()
      const createPromises = defaultPages.map((page) =>
        db.pageSeo.create({
          data: {
            pagePath: page.pagePath,
            pageName: page.pageName,
            metaTitle: page.metaTitle,
            metaDescription: page.metaDescription,
            metaKeywords: page.metaKeywords,
            noIndex: page.noIndex,
            noFollow: page.noFollow,
          },
        })
      )
      await Promise.all(createPromises)

      // Create audit log
      await db.auditLog.create({
        data: {
          userId: user.id,
          userRole: user.role,
          action: 'RESET_SEO_ALL',
          entityType: 'seo_settings',
          newValue: JSON.stringify({ action: 'reset_to_defaults' }),
        },
      })

      return NextResponse.json({
        success: true,
        message: 'All SEO settings reset to defaults',
        seo: defaults,
        pageSeo: defaultPages,
      })
    }

    if (pagePath) {
      // Delete specific page SEO
      const existing = await db.pageSeo.findUnique({
        where: { pagePath },
      })

      if (!existing) {
        return NextResponse.json(
          { success: false, error: 'Page SEO not found' },
          { status: 404 }
        )
      }

      await db.pageSeo.delete({
        where: { pagePath },
      })

      // Create audit log
      await db.auditLog.create({
        data: {
          userId: user.id,
          userRole: user.role,
          action: 'DELETE_PAGE_SEO',
          entityType: 'page_seo',
          entityId: existing.id,
          oldValue: JSON.stringify(existing),
        },
      })

      return NextResponse.json({
        success: true,
        message: `Page SEO for ${pagePath} deleted successfully`,
      })
    }

    return NextResponse.json(
      { success: false, error: 'Either pagePath or resetAll parameter is required' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Admin SEO DELETE error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
