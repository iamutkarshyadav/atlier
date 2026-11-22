import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@repo/supabase/server'
import { DEFAULT_COLLECTIONS } from '@repo/supabase/utils'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = createServiceRoleClient()

    // 1. Fetch collections with relations
    const { data: collections, error: collError } = await supabase
      .from('collections')
      .select('*, collection_categories(category_id), collection_products(product_id)')
      .order('display_order', { ascending: true })

    if (collError || !collections) {
      return NextResponse.json({
        success: true,
        collections: DEFAULT_COLLECTIONS,
      })
    }

    // 2. Fetch categories and products to compute live resolved product counts
    const [{ data: categories }, { data: products }] = await Promise.all([
      supabase.from('categories').select('id, parent_id, name, slug'),
      supabase.from('products').select('id, category_id, category').eq('is_archived', false),
    ])

    const allCats = categories || []
    const allProds = products || []

    const normalizedCollections = collections.map((col: any) => {
      const rawCategoryIds: string[] = Array.isArray(col.collection_categories)
        ? col.collection_categories.map((c: any) => c.category_id).filter(Boolean)
        : []
      const rawProductIds: string[] = Array.isArray(col.collection_products)
        ? col.collection_products.map((p: any) => p.product_id).filter(Boolean)
        : []

      // Expand parent categories to also include all child subcategories
      const resolvedCategoryIds = new Set<string>(rawCategoryIds)
      const mappedCatObjects = allCats.filter((c) => resolvedCategoryIds.has(c.id))
      const mappedNamesOrSlugs = new Set<string>()

      mappedCatObjects.forEach((c) => {
        mappedNamesOrSlugs.add(c.name.toLowerCase())
        mappedNamesOrSlugs.add(c.slug.toLowerCase())
        // If parent, add children
        allCats.forEach((child) => {
          if (child.parent_id === c.id) {
            resolvedCategoryIds.add(child.id)
            mappedNamesOrSlugs.add(child.name.toLowerCase())
            mappedNamesOrSlugs.add(child.slug.toLowerCase())
          }
        })
      })

      const pinnedProductIds = new Set<string>(rawProductIds)

      // Calculate total resolved matching garments
      const matchingCount = allProds.filter((p) => {
        if (pinnedProductIds.has(p.id)) return true
        if (p.category_id && resolvedCategoryIds.has(p.category_id)) return true
        if (p.category && mappedNamesOrSlugs.has(p.category.toLowerCase())) return true
        return false
      }).length

      return {
        id: col.id,
        name: col.name,
        slug: col.slug,
        group_type: col.group_type || 'occasion',
        description: col.description,
        image_url: col.image_url,
        display_order: col.display_order ?? 1,
        is_active: col.is_active ?? true,
        show_in_navbar: col.show_in_navbar ?? true,
        show_on_home: col.show_on_home ?? true,
        created_at: col.created_at,
        updated_at: col.updated_at,
        category_ids: rawCategoryIds,
        product_ids: rawProductIds,
        product_count: matchingCount,
      }
    })

    return NextResponse.json({ success: true, collections: normalizedCollections })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to list collections' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createServiceRoleClient()
    const body = await req.json()
    const {
      id,
      name,
      slug,
      group_type,
      description,
      image_url,
      display_order,
      is_active,
      show_in_navbar,
      show_on_home,
      category_ids,
      product_ids,
    } = body

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Collection/Occasion name is required' },
        { status: 400 }
      )
    }

    const cleanSlug =
      slug?.trim() ||
      name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

    const payload: any = {
      name: name.trim(),
      slug: cleanSlug,
      group_type: group_type || 'occasion',
      description: description?.trim() || null,
      image_url: image_url?.trim() || null,
      display_order: typeof display_order === 'number' ? display_order : parseInt(display_order, 10) || 1,
      is_active: is_active ?? true,
      show_in_navbar: show_in_navbar ?? true,
      show_on_home: show_on_home ?? true,
      updated_at: new Date().toISOString(),
    }

    let savedId = id

    if (id) {
      const { data, error } = await supabase
        .from('collections')
        .update(payload)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
      }
      savedId = data.id
    } else {
      const { data, error } = await supabase
        .from('collections')
        .insert(payload)
        .select()
        .single()

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
      }
      savedId = data.id
    }

    // Synchronize category mappings (Many-to-Many)
    if (Array.isArray(category_ids) && savedId) {
      await supabase.from('collection_categories').delete().eq('collection_id', savedId)
      if (category_ids.length > 0) {
        const catRows = category_ids.map((catId: string) => ({
          collection_id: savedId,
          category_id: catId,
        }))
        await supabase.from('collection_categories').insert(catRows)
      }
    }

    // Synchronize pinned product mappings
    if (Array.isArray(product_ids) && savedId) {
      await supabase.from('collection_products').delete().eq('collection_id', savedId)
      if (product_ids.length > 0) {
        const prodRows = product_ids.map((prodId: string, idx: number) => ({
          collection_id: savedId,
          product_id: prodId,
          display_order: idx + 1,
        }))
        await supabase.from('collection_products').insert(prodRows)
      }
    }

    return NextResponse.json({
      success: true,
      collection: { ...payload, id: savedId, category_ids: category_ids || [], product_ids: product_ids || [] },
    })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to save collection' },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = createServiceRoleClient()
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ success: false, error: 'Collection ID is required' }, { status: 400 })
    }

    const { error } = await supabase.from('collections').delete().eq('id', id)
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to delete collection' },
      { status: 500 }
    )
  }
}
