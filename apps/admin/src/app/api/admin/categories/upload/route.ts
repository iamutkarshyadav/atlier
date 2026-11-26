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

    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    const filePath = `categories/${uniqueSuffix}_${sanitizedName}`
    const buffer = Buffer.from(await file.arrayBuffer())

    let uploadedUrl: string | null = null
    const candidateBuckets = ['product-media', 'promotional-banners']

    for (const bName of candidateBuckets) {
      try {
        const { error: uploadError } = await supabase.storage
          .from(bName)
          .upload(filePath, buffer, {
            contentType: file.type || 'image/jpeg',
            cacheControl: '3600',
            upsert: true,
          })

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from(bName)
            .getPublicUrl(filePath)
          if (publicUrl) {
            uploadedUrl = publicUrl
            break
          }
        }
      } catch {}
    }

    if (!uploadedUrl) {
      try {
        const fs = await import('fs/promises')
        const path = await import('path')
        const adminUploadDir = path.join(process.cwd(), 'public', 'uploads', 'categories')
        await fs.mkdir(adminUploadDir, { recursive: true })
        const localFileName = `${uniqueSuffix}_${sanitizedName}`
        await fs.writeFile(path.join(adminUploadDir, localFileName), buffer)
        uploadedUrl = `/uploads/categories/${localFileName}`
      } catch {}
    }

    if (!uploadedUrl) {
      return NextResponse.json({ success: false, error: 'Could not upload image' }, { status: 500 })
    }

    return NextResponse.json({ success: true, publicUrl: uploadedUrl })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'File upload failed' }, { status: 500 })
  }
}
