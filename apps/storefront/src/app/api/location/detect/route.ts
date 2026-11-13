import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@repo/supabase/server'

export const dynamic = 'force-dynamic'

const FALLBACK_METRO_PIN = '560038'
const FALLBACK_METRO_INFO = {
  city: 'Bengaluru',
  state: 'Karnataka',
  pincode: '560038',
}

export async function GET(req: NextRequest) {
  try {
    // 1. Inspect Edge / Proxy headers
    const vercelPostal = req.headers.get('x-vercel-ip-postal-code')?.trim()
    const vercelCity = req.headers.get('x-vercel-ip-city')?.trim()
    const vercelRegion = req.headers.get('x-vercel-ip-country-region')?.trim()
    const forwardedFor = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    const realIp = req.headers.get('x-real-ip')?.trim()

    let candidatePin: string | null = null
    let candidateCity: string | null = null
    let candidateState: string | null = null

    if (vercelPostal && /^\d{6}$/.test(vercelPostal)) {
      candidatePin = vercelPostal
      candidateCity = vercelCity ? decodeURIComponent(vercelCity) : null
      candidateState = vercelRegion || null
    }

    // 2. Local development fallback or private subnet fallback
    const clientIp = forwardedFor || realIp || ''
    const isLocalhost =
      !clientIp ||
      clientIp === '127.0.0.1' ||
      clientIp === '::1' ||
      clientIp.startsWith('192.168.') ||
      clientIp.startsWith('10.') ||
      clientIp === 'localhost'

    if (!candidatePin && isLocalhost) {
      // Default to premier flagship test zone (Indiranagar, Bengaluru)
      candidatePin = FALLBACK_METRO_PIN
      candidateCity = FALLBACK_METRO_INFO.city
      candidateState = FALLBACK_METRO_INFO.state
    }

    if (!candidatePin) {
      candidatePin = FALLBACK_METRO_PIN
      candidateCity = FALLBACK_METRO_INFO.city
      candidateState = FALLBACK_METRO_INFO.state
    }

    // 3. Verify PIN against Supabase bolt_pincodes table
    let isServiceable = false
    let resolvedCity = candidateCity || FALLBACK_METRO_INFO.city
    let resolvedState = candidateState || FALLBACK_METRO_INFO.state

    try {
      const supabase = await createServerSupabaseClient()
      const { data, error } = await supabase
        .from('bolt_pincodes')
        .select('pincode, city, state, is_active')
        .eq('pincode', candidatePin)
        .eq('is_active', true)
        .maybeSingle()

      if (!error && data && data.is_active) {
        isServiceable = true
        resolvedCity = data.city || resolvedCity
        resolvedState = data.state || resolvedState
      } else if (candidatePin === FALLBACK_METRO_PIN) {
        isServiceable = true
      }
    } catch {
      // Fallback
      if (candidatePin === FALLBACK_METRO_PIN) {
        isServiceable = true
      }
    }

    return NextResponse.json({
      success: true,
      pincode: candidatePin,
      city: resolvedCity,
      state: resolvedState,
      serviceable: isServiceable,
      source: isLocalhost ? 'local_dev_default' : 'edge_ip_detection',
    })
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err?.message || 'Location detection failed',
        pincode: FALLBACK_METRO_PIN,
        city: FALLBACK_METRO_INFO.city,
        state: FALLBACK_METRO_INFO.state,
        serviceable: true,
      },
      { status: 200 }
    )
  }
}

