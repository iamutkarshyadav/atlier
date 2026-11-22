import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@repo/supabase/server'
import { getCategories } from '@repo/supabase/utils'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const categories = await getCategories(supabase)
    return NextResponse.json({ success: true, categories: categories || [] })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to fetch categories' },
      { status: 500 }
    )
  }
}
