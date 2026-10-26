import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'

const EXPECTED_SECRET = process.env.REVALIDATION_SECRET || 'atelier-isr-secret-2026'

/**
 * On-Demand Cache Revalidation Route Handler (ISR)
 * Secured with secret token (x-revalidation-secret header or ?secret= query).
 * Called by Admin Portal PIM/CMS actions when products, banners, or CMS layouts change.
 */
export async function POST(request: NextRequest) {
  try {
    const headerSecret = request.headers.get('x-revalidation-secret')
    const querySecret = request.nextUrl.searchParams.get('secret')
    const secret = headerSecret || querySecret

    if (secret !== EXPECTED_SECRET) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid or missing revalidation secret token' },
        { status: 401 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const tag = body.tag || request.nextUrl.searchParams.get('tag')
    const path = body.path || request.nextUrl.searchParams.get('path') || '/'

    if (tag) {
      revalidateTag(tag)
    }

    if (path) {
      revalidatePath(path)
      if (path === '/') {
        revalidatePath('/shop')
      }
    }

    return NextResponse.json({
      revalidated: true,
      path,
      tag: tag || null,
      timestamp: new Date().toISOString(),
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Error executing on-demand cache revalidation' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret') || request.headers.get('x-revalidation-secret')
  if (secret !== EXPECTED_SECRET) {
    return NextResponse.json(
      { error: 'Unauthorized: Invalid or missing revalidation secret token' },
      { status: 401 }
    )
  }

  const path = request.nextUrl.searchParams.get('path') || '/'
  const tag = request.nextUrl.searchParams.get('tag')

  if (tag) {
    revalidateTag(tag)
  }
  revalidatePath(path)

  return NextResponse.json({
    revalidated: true,
    path,
    tag: tag || null,
    timestamp: new Date().toISOString(),
  })
}
