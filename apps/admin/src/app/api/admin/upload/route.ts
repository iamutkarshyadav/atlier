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

    // 4. Generate collision-resistant sanitized file path
    const sanitizedOriginalName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    const filePath = `${folder}/${uniqueSuffix}_${sanitizedOriginalName}`
    const buffer = Buffer.from(await file.arrayBuffer())

    // 5. Try Supabase Storage upload across candidate buckets with automatic fallback
    const candidateBuckets = folder === 'banners' 
      ? ['promotional-banners', 'product-media'] 
      : ['product-media', 'promotional-banners']

    let uploadedUrl: string | null = null
    let chosenBucket: string | null = null
    let lastStorageError: string | null = null

    try {
      const supabase = createServiceRoleClient()

      for (const bucketName of candidateBuckets) {
        try {
          const { error: uploadError } = await supabase.storage
            .from(bucketName)
            .upload(filePath, buffer, {
              contentType: mimeType,
              cacheControl: '3600',
              upsert: true,
            })

          if (!uploadError) {
            const { data: { publicUrl } } = supabase.storage
              .from(bucketName)
              .getPublicUrl(filePath)

            if (publicUrl) {
              uploadedUrl = publicUrl
              chosenBucket = bucketName
              break
            }
          } else {
            lastStorageError = uploadError.message
            // If bucket not found, try to auto-create it and retry once
            if (uploadError.message?.toLowerCase().includes('not found')) {
              await supabase.storage.createBucket(bucketName, { public: true }).catch(() => {})
              const retry = await supabase.storage
                .from(bucketName)
                .upload(filePath, buffer, {
                  contentType: mimeType,
                  cacheControl: '3600',
                  upsert: true,
                })
              if (!retry.error) {
                const { data: { publicUrl } } = supabase.storage.getPublicUrl ? supabase.storage.from(bucketName).getPublicUrl(filePath) : { data: { publicUrl: null } }
                if (publicUrl) {
                  uploadedUrl = publicUrl
                  chosenBucket = bucketName
                  break
                }
              }
            }
          }
        } catch (bErr: any) {
          lastStorageError = bErr?.message || String(bErr)
        }
      }
    } catch (clientErr: any) {
      console.warn('[Upload API] Supabase client error:', clientErr?.message)
    }

    // 6. Graceful local filesystem fallback if remote storage buckets fail or are unreachable
    if (!uploadedUrl) {
      try {
        const fs = await import('fs/promises')
        const path = await import('path')

        const adminUploadDir = path.join(process.cwd(), 'public', 'uploads', folder)
        await fs.mkdir(adminUploadDir, { recursive: true })
        const localFileName = `${uniqueSuffix}_${sanitizedOriginalName}`
        await fs.writeFile(path.join(adminUploadDir, localFileName), buffer)

        // Also sync to storefront public directory if it exists
        try {
          const storefrontUploadDir = path.resolve(process.cwd(), '..', 'storefront', 'public', 'uploads', folder)
          await fs.mkdir(storefrontUploadDir, { recursive: true })
          await fs.writeFile(path.join(storefrontUploadDir, localFileName), buffer)
        } catch {
          // Storefront sync is best-effort
        }

        uploadedUrl = `/uploads/${folder}/${localFileName}`
        chosenBucket = 'local_fallback'
      } catch (localErr: any) {
        console.error('[Upload API] Local filesystem fallback error:', localErr?.message)
      }
    }

    if (!uploadedUrl) {
      return NextResponse.json(
        {
          success: false,
          error: `Storage upload failed: ${lastStorageError || 'Could not save file to cloud or local storage.'}`,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      publicUrl: uploadedUrl,
      url: uploadedUrl,
      path: filePath,
      bucket: chosenBucket,
    })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Server error during file upload' },
      { status: 500 }
    )
  }
}
