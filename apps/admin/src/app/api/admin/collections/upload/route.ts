import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@repo/supabase/server'

export const dynamic = 'force-dynamic'

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
const MAX_FILE_SIZE = 10 * 1024 * 1024

export async function POST(req: NextRequest) {
  try {
    const supabase = createServiceRoleClient()
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 })
    }

    const mime = (file.type || '').toLowerCase()
    if (!ALLOWED_MIME_TYPES.has(mime)) {
      return NextResponse.json(
        { success: false, error: `Invalid file format "${file.type}". Allowed: JPEG, PNG, WebP, AVIF` },
        { status: 400 }
      )
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: 'File size exceeds maximum limit of 10 MB' },
        { status: 400 }
      )
    }

    const bucketName = 'product-media'

    const { data: buckets } = await supabase.storage.listBuckets()
    const hasBucket = buckets?.some((b) => b.name === bucketName)
    if (!hasBucket) {
      await supabase.storage.createBucket(bucketName, { public: true })
    }

    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const filePath = `collections/${Date.now()}_${sanitizedName}`
    const buffer = Buffer.from(await file.arrayBuffer())

    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, buffer, {
        contentType: file.type || 'image/jpeg',
        cacheControl: '3600',
        upsert: true,
      })

    if (uploadError) {
      return NextResponse.json({ success: false, error: uploadError.message }, { status: 500 })
    }

    const { data: { publicUrl } } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath)

    return NextResponse.json({ success: true, publicUrl })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'File upload failed' }, { status: 500 })
  }
}
