import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@repo/supabase/server'

export const dynamic = 'force-dynamic'

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
])

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB
const ALLOWED_FOLDERS = new Set(['products', 'categories', 'collections', 'banners'])

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const requestedFolder = ((formData.get('folder') as string | null) || 'products').toLowerCase().trim()

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided for upload' },
        { status: 400 }
      )
    }

    // 1. Validate MIME type
    const mimeType = (file.type || '').toLowerCase().trim()
    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid file type "${file.type || 'unknown'}". Allowed formats: JPEG, PNG, WebP, AVIF.`,
        },
        { status: 400 }
      )
    }

    // 2. Validate file size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        {
          success: false,
          error: `File size exceeds the 10 MB limit (${(file.size / (1024 * 1024)).toFixed(2)} MB uploaded).`,
        },
        { status: 400 }
      )
    }

    // 3. Validate folder partition
    const folder = ALLOWED_FOLDERS.has(requestedFolder) ? requestedFolder : 'products'

    const supabase = createServiceRoleClient()
    const bucketName = 'product-media'

    // 4. Ensure storage bucket exists
    const { data: buckets, error: bucketListError } = await supabase.storage.listBuckets()
    if (bucketListError) {
      console.warn('[Upload API] Could not list storage buckets:', bucketListError.message)
    } else {
      const bucketExists = buckets?.some((b) => b.name === bucketName)
      if (!bucketExists) {
        const { error: createError } = await supabase.storage.createBucket(bucketName, { public: true })
        if (createError) {
          console.warn('[Upload API] Could not create storage bucket:', createError.message)
        }
      }
    }

    // 5. Generate collision-resistant sanitized file path
    const sanitizedOriginalName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    const filePath = `${folder}/${uniqueSuffix}_${sanitizedOriginalName}`
    const buffer = Buffer.from(await file.arrayBuffer())

    // 6. Upload directly to Supabase Storage via Service Role Client
    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, buffer, {
        contentType: mimeType,
        cacheControl: '3600',
        upsert: true,
      })

    if (uploadError) {
      return NextResponse.json(
        { success: false, error: `Supabase Storage upload failed: ${uploadError.message}` },
        { status: 500 }
      )
    }

    // 7. Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath)

    return NextResponse.json({
      success: true,
      publicUrl,
      url: publicUrl,
      path: filePath,
      bucket: bucketName,
    })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Server error during file upload' },
      { status: 500 }
    )
  }
}
