import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@repo/supabase/server'
import { normalizeCategoryRow } from '@repo/supabase/utils'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = createServiceRoleClient()
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('display_order', { ascending: true })

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    const normalized = (data || []).map(normalizeCategoryRow)
    return NextResponse.json({ success: true, categories: normalized })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Failed to list categories' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createServiceRoleClient()
    const body = await req.json()
    const { id, name, slug, parent_id, description, image_url, display_order } = body

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ success: false, error: 'Category name is required' }, { status: 400 })
    }

    const cleanSlug =
      slug?.trim() ||
      name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

    const targetParentId = parent_id && typeof parent_id === 'string' && parent_id.trim() ? parent_id.trim() : null
    const cleanDesc = (description || '').replace(/<!--parent_id:[a-zA-Z0-9_-]+-->/g, '').trim()

    // If a parent_id is specified, embed it into description so remote Supabase
    // seamlessly persists the hierarchy without requiring 'parent_id' column in schema cache
    const effectiveDescription = targetParentId
      ? `${cleanDesc ? cleanDesc + ' ' : ''}<!--parent_id:${targetParentId}-->`
      : cleanDesc || null

    const payload: any = {
      name: name.trim(),
      slug: cleanSlug,
      description: effectiveDescription,
      image_url: image_url && image_url.trim() ? image_url.trim() : null,
      display_order: typeof display_order === 'number' ? display_order : parseInt(display_order, 10) || 1,
      updated_at: new Date().toISOString(),
    }

    if (id) {
      // Guard: Cannot be own parent
      if (targetParentId === id) {
        return NextResponse.json({ success: false, error: 'Category cannot be its own parent' }, { status: 400 })
      }

      const { data, error } = await supabase
        .from('categories')
        .update(payload)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
      }
      return NextResponse.json({ success: true, category: normalizeCategoryRow(data) })
    } else {
      const { data, error } = await supabase
        .from('categories')
        .insert(payload)
        .select()
        .single()

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
      }
      return NextResponse.json({ success: true, category: normalizeCategoryRow(data) })
    }
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Failed to save category' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = createServiceRoleClient()
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ success: false, error: 'Category ID is required' }, { status: 400 })
    }

    const { error } = await supabase.from('categories').delete().eq('id', id)
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Failed to delete category' }, { status: 500 })
  }
}
