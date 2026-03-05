// Admin Categories API Route - Full CRUD for categories
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashToken } from '@/lib/auth'

// Helper to get authenticated admin user
async function getAdminUser(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value
  if (!token) return null

  const tokenHash = hashToken(token)
  const session = await db.session.findFirst({
    where: {
      tokenHash,
      isActive: true,
      expiresAt: { gt: new Date() }
    },
    include: { user: true }
  })

  const user = session?.user
  if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
    return null
  }

  return user
}

// GET /api/admin/categories - Fetch all categories with product counts
export async function GET(request: NextRequest) {
  try {
    const adminUser = await getAdminUser(request)
    if (!adminUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      )
    }

    const categories = await db.category.findMany({
      include: {
        _count: {
          select: { products: true, children: true }
        },
        parent: {
          select: { id: true, name: true }
        }
      },
      orderBy: { sortOrder: 'asc' }
    })

    // Get total counts
    const totalCategories = await db.category.count()
    const activeCategories = await db.category.count({ where: { isActive: true } })
    const featuredCategories = await db.category.count({ where: { isFeatured: true } })

    return NextResponse.json({
      success: true,
      categories,
      stats: {
        total: totalCategories,
        active: activeCategories,
        inactive: totalCategories - activeCategories,
        featured: featuredCategories
      }
    })
  } catch (error) {
    console.error('Admin Categories GET error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/admin/categories - Create new category
export async function POST(request: NextRequest) {
  try {
    const adminUser = await getAdminUser(request)
    if (!adminUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      name,
      description,
      imageUrl,
      iconUrl,
      parentId,
      sortOrder,
      isActive,
      isFeatured,
      defaultCommission,
      metaTitle,
      metaDescription
    } = body

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Category name is required' },
        { status: 400 }
      )
    }

    // Generate slug
    const slug = name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')

    // Check if slug already exists
    const existingCategory = await db.category.findUnique({
      where: { slug }
    })

    if (existingCategory) {
      return NextResponse.json(
        { success: false, error: 'Category with this name already exists' },
        { status: 400 }
      )
    }

    // Create category
    const category = await db.category.create({
      data: {
        name,
        slug,
        description,
        imageUrl,
        iconUrl,
        parentId: parentId || null,
        sortOrder: sortOrder || 0,
        isActive: isActive !== false,
        isFeatured: isFeatured || false,
        defaultCommission: defaultCommission || 10,
        metaTitle,
        metaDescription
      }
    })

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: adminUser.id,
        userRole: adminUser.role,
        action: 'CREATE_CATEGORY',
        entityType: 'category',
        entityId: category.id,
        newValue: JSON.stringify({ name, slug })
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Category created successfully',
      category
    })
  } catch (error) {
    console.error('Admin Categories POST error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/admin/categories - Update category
export async function PUT(request: NextRequest) {
  try {
    const adminUser = await getAdminUser(request)
    if (!adminUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      categoryId,
      name,
      description,
      imageUrl,
      iconUrl,
      parentId,
      sortOrder,
      isActive,
      isFeatured,
      defaultCommission,
      metaTitle,
      metaDescription
    } = body

    if (!categoryId) {
      return NextResponse.json(
        { success: false, error: 'Category ID is required' },
        { status: 400 }
      )
    }

    // Check if category exists
    const existingCategory = await db.category.findUnique({
      where: { id: categoryId }
    })

    if (!existingCategory) {
      return NextResponse.json(
        { success: false, error: 'Category not found' },
        { status: 404 }
      )
    }

    // Build update data
    const updateData: Record<string, unknown> = {}
    if (name !== undefined) {
      updateData.name = name
      updateData.slug = name.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
    }
    if (description !== undefined) updateData.description = description
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl
    if (iconUrl !== undefined) updateData.iconUrl = iconUrl
    if (parentId !== undefined) updateData.parentId = parentId || null
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder
    if (isActive !== undefined) updateData.isActive = isActive
    if (isFeatured !== undefined) updateData.isFeatured = isFeatured
    if (defaultCommission !== undefined) updateData.defaultCommission = defaultCommission
    if (metaTitle !== undefined) updateData.metaTitle = metaTitle
    if (metaDescription !== undefined) updateData.metaDescription = metaDescription

    // Update category
    const category = await db.category.update({
      where: { id: categoryId },
      data: updateData
    })

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: adminUser.id,
        userRole: adminUser.role,
        action: 'UPDATE_CATEGORY',
        entityType: 'category',
        entityId: categoryId,
        oldValue: JSON.stringify(existingCategory),
        newValue: JSON.stringify(updateData)
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Category updated successfully',
      category
    })
  } catch (error) {
    console.error('Admin Categories PUT error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/categories - Delete category
export async function DELETE(request: NextRequest) {
  try {
    const adminUser = await getAdminUser(request)
    if (!adminUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get('categoryId')

    if (!categoryId) {
      return NextResponse.json(
        { success: false, error: 'Category ID is required' },
        { status: 400 }
      )
    }

    // Check if category exists
    const existingCategory = await db.category.findUnique({
      where: { id: categoryId },
      include: {
        _count: {
          select: { products: true, children: true }
        }
      }
    })

    if (!existingCategory) {
      return NextResponse.json(
        { success: false, error: 'Category not found' },
        { status: 404 }
      )
    }

    // Check if category has products
    if (existingCategory._count.products > 0) {
      return NextResponse.json(
        { success: false, error: `Cannot delete category with ${existingCategory._count.products} products. Move or delete products first.` },
        { status: 400 }
      )
    }

    // Check if category has children
    if (existingCategory._count.children > 0) {
      return NextResponse.json(
        { success: false, error: `Cannot delete category with ${existingCategory._count.children} subcategories. Delete subcategories first.` },
        { status: 400 }
      )
    }

    // Delete category
    await db.category.delete({
      where: { id: categoryId }
    })

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: adminUser.id,
        userRole: adminUser.role,
        action: 'DELETE_CATEGORY',
        entityType: 'category',
        entityId: categoryId,
        oldValue: JSON.stringify(existingCategory)
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Category deleted successfully'
    })
  } catch (error) {
    console.error('Admin Categories DELETE error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
