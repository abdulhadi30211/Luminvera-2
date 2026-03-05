import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { UserRole } from '@prisma/client'

// Helper function to generate slug from name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-')     // Replace spaces with hyphens
    .replace(/-+/g, '-')      // Replace multiple hyphens with single
    .replace(/^-+|-+$/g, '')  // Remove leading/trailing hyphens
}

// Helper function to verify admin role
async function verifyAdmin(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true }
  })
  
  if (!user) {
    return { authorized: false, error: 'User not found' }
  }
  
  if (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPER_ADMIN) {
    return { authorized: false, error: 'Unauthorized. Admin access required.' }
  }
  
  return { authorized: true }
}

// GET /api/categories - List all categories with hierarchy support
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const flat = searchParams.get('flat') === 'true'
    const includeInactive = searchParams.get('includeInactive') === 'true'
    const parentId = searchParams.get('parentId')
    const categoryId = searchParams.get('id')
    
    // Fetch single category by ID
    if (categoryId) {
      const category = await db.category.findUnique({
        where: { id: categoryId },
        include: {
          children: true,
          parent: true
        }
      })
      
      if (!category) {
        return NextResponse.json({ success: false, error: 'Category not found' }, { status: 404 })
      }
      
      return NextResponse.json({ success: true, category })
    }
    
    // Build where clause
    const where: any = {}
    
    // Filter by parentId if specified
    if (parentId) {
      where.parentId = parentId === 'null' ? null : parentId
    }
    
    // Only show active categories unless requested
    if (!includeInactive) {
      where.isActive = true
    }
    
    // Fetch categories
    const categories = await db.category.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
      include: {
        children: true,
        _count: {
          select: {
            products: {
              where: { status: 'LIVE' }
            }
          }
        }
      }
    })
    
    // Get product counts for each category
    const productCounts = await db.product.groupBy({
      by: ['categoryId'],
      where: {
        status: 'LIVE',
        categoryId: { not: null }
      },
      _count: true
    })
    
    // Count products per category
    const countMap: Record<string, number> = {}
    productCounts.forEach(p => {
      if (p.categoryId) {
        countMap[p.categoryId] = p._count
      }
    })
    
    // Return flat list if requested
    if (flat) {
      const flatCategories = categories.map(cat => ({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        imageUrl: cat.imageUrl,
        iconUrl: cat.iconUrl,
        parentId: cat.parentId,
        isActive: cat.isActive,
        isFeatured: cat.isFeatured,
        sortOrder: cat.sortOrder,
        defaultCommission: cat.defaultCommission,
        productCount: countMap[cat.id] || cat._count.products || 0,
        createdAt: cat.createdAt,
        updatedAt: cat.updatedAt,
      }))
      
      return NextResponse.json({
        success: true,
        categories: flatCategories,
        data: flatCategories,
        count: flatCategories.length
      })
    }
    
    // Build category tree
    const categoryMap = new Map()
    const rootCategories: any[] = []
    
    categories.forEach(cat => {
      categoryMap.set(cat.id, {
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        imageUrl: cat.imageUrl,
        iconUrl: cat.iconUrl,
        parentId: cat.parentId,
        isActive: cat.isActive,
        isFeatured: cat.isFeatured,
        sortOrder: cat.sortOrder,
        defaultCommission: cat.defaultCommission,
        productCount: countMap[cat.id] || cat._count.products || 0,
        children: [],
        createdAt: cat.createdAt,
        updatedAt: cat.updatedAt,
      })
    })
    
    // Link children to parents
    categories.forEach(cat => {
      const node = categoryMap.get(cat.id)
      if (cat.parentId && categoryMap.has(cat.parentId)) {
        categoryMap.get(cat.parentId).children.push(node)
      } else if (!cat.parentId) {
        rootCategories.push(node)
      }
    })
    
    return NextResponse.json({
      success: true,
      categories: rootCategories,
      data: rootCategories,
      flatCategories: Array.from(categoryMap.values()),
      count: categoryMap.size
    })
  } catch (error) {
    console.error('Categories fetch error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch categories' }, { status: 500 })
  }
}

// POST /api/categories - Create new category (admin only)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      userId, name, slug, description, imageUrl, iconUrl,
      parentId, isActive, isFeatured, sortOrder, defaultCommission,
      metaTitle, metaDescription
    } = body
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 401 })
    }
    
    if (!name) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 })
    }
    
    // Verify admin role
    const authCheck = await verifyAdmin(userId)
    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: 403 })
    }
    
    // Generate slug if not provided
    const categorySlug = slug || generateSlug(name)
    
    // Check if slug already exists
    const existingCategory = await db.category.findUnique({
      where: { slug: categorySlug }
    })
    
    if (existingCategory) {
      return NextResponse.json({ 
        error: 'Category with this slug already exists' 
      }, { status: 400 })
    }
    
    // Validate parentId if provided
    if (parentId) {
      const parentCategory = await db.category.findUnique({
        where: { id: parentId }
      })
      
      if (!parentCategory) {
        return NextResponse.json({ error: 'Parent category not found' }, { status: 400 })
      }
    }
    
    // Get max sort order if not provided
    let categorySortOrder = sortOrder
    if (categorySortOrder === undefined) {
      const existingCategories = await db.category.findMany({
        where: { parentId: parentId || null },
        select: { sortOrder: true },
        orderBy: { sortOrder: 'desc' },
        take: 1
      })
      
      categorySortOrder = (existingCategories[0]?.sortOrder || 0) + 1
    }
    
    const category = await db.category.create({
      data: {
        name,
        slug: categorySlug,
        description,
        imageUrl,
        iconUrl,
        parentId: parentId || null,
        isActive: isActive ?? true,
        isFeatured: isFeatured ?? false,
        sortOrder: categorySortOrder,
        defaultCommission: defaultCommission ?? 10,
        metaTitle,
        metaDescription,
      }
    })
    
    return NextResponse.json({ 
      success: true, 
      category: {
        id: category.id,
        name: category.name,
        slug: category.slug,
        description: category.description,
        imageUrl: category.imageUrl,
        iconUrl: category.iconUrl,
        parentId: category.parentId,
        isActive: category.isActive,
        isFeatured: category.isFeatured,
        sortOrder: category.sortOrder,
        defaultCommission: category.defaultCommission,
        createdAt: category.createdAt
      },
      message: 'Category created successfully'
    })
  } catch (error) {
    console.error('Categories POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/categories - Update category (admin only)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      categoryId, userId, name, slug, description, imageUrl, iconUrl,
      parentId, isActive, isFeatured, sortOrder, defaultCommission,
      metaTitle, metaDescription
    } = body
    
    if (!categoryId || !userId) {
      return NextResponse.json({ error: 'Category ID and User ID are required' }, { status: 400 })
    }
    
    // Verify admin role
    const authCheck = await verifyAdmin(userId)
    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: 403 })
    }
    
    // Check if category exists
    const existingCategory = await db.category.findUnique({
      where: { id: categoryId }
    })
    
    if (!existingCategory) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }
    
    // If slug is being changed, check for duplicates
    if (slug && slug !== existingCategory.slug) {
      const duplicateSlug = await db.category.findUnique({
        where: { slug }
      })
      
      if (duplicateSlug) {
        return NextResponse.json({ error: 'Category with this slug already exists' }, { status: 400 })
      }
    }
    
    // Validate parentId if being changed
    if (parentId !== undefined) {
      // Cannot set parent to self
      if (parentId === categoryId) {
        return NextResponse.json({ error: 'Category cannot be its own parent' }, { status: 400 })
      }
      
      // Check if parent exists
      if (parentId) {
        const parentCategory = await db.category.findUnique({
          where: { id: parentId },
          select: { id: true, parentId: true }
        })
        
        if (!parentCategory) {
          return NextResponse.json({ error: 'Parent category not found' }, { status: 400 })
        }
        
        // Check for circular reference (parent's ancestors shouldn't include current category)
        let checkParentId: string | null = parentCategory.parentId
        while (checkParentId) {
          if (checkParentId === categoryId) {
            return NextResponse.json({ error: 'Circular reference detected in category hierarchy' }, { status: 400 })
          }
          const ancestor = await db.category.findUnique({
            where: { id: checkParentId },
            select: { parentId: true }
          })
          checkParentId = ancestor?.parentId || null
        }
      }
    }
    
    // Build updates object
    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (slug !== undefined) updateData.slug = slug
    if (description !== undefined) updateData.description = description
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl
    if (iconUrl !== undefined) updateData.iconUrl = iconUrl
    if (parentId !== undefined) updateData.parentId = parentId || null
    if (isActive !== undefined) updateData.isActive = isActive
    if (isFeatured !== undefined) updateData.isFeatured = isFeatured
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder
    if (defaultCommission !== undefined) updateData.defaultCommission = defaultCommission
    if (metaTitle !== undefined) updateData.metaTitle = metaTitle
    if (metaDescription !== undefined) updateData.metaDescription = metaDescription
    
    const category = await db.category.update({
      where: { id: categoryId },
      data: updateData
    })
    
    return NextResponse.json({ 
      success: true, 
      category: {
        id: category.id,
        name: category.name,
        slug: category.slug,
        description: category.description,
        imageUrl: category.imageUrl,
        iconUrl: category.iconUrl,
        parentId: category.parentId,
        isActive: category.isActive,
        isFeatured: category.isFeatured,
        sortOrder: category.sortOrder,
        defaultCommission: category.defaultCommission,
        updatedAt: category.updatedAt
      },
      message: 'Category updated successfully'
    })
  } catch (error) {
    console.error('Categories PUT error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/categories - Delete category (admin only)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get('categoryId')
    const userId = searchParams.get('userId')
    const force = searchParams.get('force') === 'true'
    
    if (!categoryId || !userId) {
      return NextResponse.json({ error: 'Category ID and User ID are required' }, { status: 400 })
    }
    
    // Verify admin role
    const authCheck = await verifyAdmin(userId)
    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: 403 })
    }
    
    // Check if category exists
    const existingCategory = await db.category.findUnique({
      where: { id: categoryId },
      select: { id: true, name: true }
    })
    
    if (!existingCategory) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }
    
    // Check for child categories
    const childCategories = await db.category.findMany({
      where: { parentId: categoryId },
      select: { id: true, name: true }
    })
    
    if (childCategories.length > 0 && !force) {
      return NextResponse.json({ 
        error: 'Cannot delete category with child categories',
        children: childCategories,
        hint: 'Move or delete child categories first, or use force=true to delete all children'
      }, { status: 400 })
    }
    
    // Check for products in this category
    const productsInCategory = await db.product.findMany({
      where: { categoryId },
      select: { id: true, name: true },
      take: 5
    })
    
    if (productsInCategory.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete category with associated products',
        productCount: productsInCategory.length,
        hint: 'Move products to another category before deleting'
      }, { status: 400 })
    }
    
    // If force delete, delete all child categories recursively
    if (force && childCategories.length > 0) {
      const deleteChildren = async (parentCategoryId: string) => {
        const children = await db.category.findMany({
          where: { parentId: parentCategoryId },
          select: { id: true }
        })
        
        for (const child of children) {
          await deleteChildren(child.id)
          await db.category.delete({ where: { id: child.id } })
        }
      }
      await deleteChildren(categoryId)
    }
    
    // Delete the category
    await db.category.delete({
      where: { id: categoryId }
    })
    
    return NextResponse.json({ 
      success: true, 
      message: `Category "${existingCategory.name}" deleted successfully` 
    })
  } catch (error) {
    console.error('Categories DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
