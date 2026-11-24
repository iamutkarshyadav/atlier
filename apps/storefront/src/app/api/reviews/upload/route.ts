import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@repo/supabase/server'
import { checkUserReviewEligibility } from '@repo/supabase'

export const dynamic = 'force-dynamic'

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const serviceSupabase = createServiceRoleClient()

    // 1. Resolve authenticated user
    let user: any = null
    const {
      data: { user: cookieUser },
    } = await supabase.auth.getUser()
    user = cookieUser

    if (!user) {
      const authHeader = req.headers.get('Authorization')
      if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
        const token = authHeader.replace(/^bearer\s+/i, '').trim()
        if (token) {
          const {
            data: { user: tokenUser },
          } = await supabase.auth.getUser(token)
          user = tokenUser
        }
      }
    }

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required to upload review photos' },
        { status: 401 }
      )
    }

    // 2. Parse multipart form data
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const orderItemId = formData.get('orderItemId') as string | null

    if (!file || !orderItemId) {
      return NextResponse.json(
        { success: false, error: 'File and orderItemId are required' },
        { status: 400 }
      )
    }

    // 3. Strict Server-Side Verified Purchase Eligibility Check
    const eligibility = await checkUserReviewEligibility(serviceSupabase, user.id, orderItemId)
    if (!eligibility.eligible) {
      return NextResponse.json(
        { success: false, error: eligibility.reason || 'You are not eligible to submit media for this item' },
        { status: 403 }
      )
    }

    // 4. Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.type.toLowerCase())) {
      return NextResponse.json(
        {
          success: false,
          error: `Unsupported image format (${file.type}). Supported: JPEG, PNG, WebP, AVIF.`,
        },
        { status: 400 }
      )
    }

    // 5. Validate file size (max 5MB)
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        {
          success: false,
          error: `File size exceeds the 5 MB limit (size: ${(file.size / (1024 * 1024)).toFixed(1)} MB)`,
        },
        { status: 400 }
      )
    }

    // 6. Generate storage path and upload via service_role
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const cleanExt = ['jpg', 'jpeg', 'png', 'webp', 'avif'].includes(ext) ? ext : 'jpg'
    const fileName = `${orderItemId}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${cleanExt}`
    const storagePath = `${user.id}/${fileName}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { error: uploadError } = await serviceSupabase.storage
      .from('review-media')
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: true,
      })

    if (uploadError) {
      console.warn('Storage bucket upload error (falling back to data URL):', uploadError.message)
      const base64 = buffer.toString('base64')
      return NextResponse.json({
        success: true,
        url: `data:${file.type};base64,${base64}`,
      })
    }

    const { data: publicUrlData } = serviceSupabase.storage
      .from('review-media')
      .getPublicUrl(storagePath)

    return NextResponse.json({
      success: true,
      url: publicUrlData.publicUrl,
    })
  } catch (err: any) {
    console.error('Exception during review media upload:', err)
    return NextResponse.json(
      { success: false, error: err?.message || 'Server error uploading photo' },
      { status: 500 }
    )
  }
}
