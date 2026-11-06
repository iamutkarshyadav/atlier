import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@repo/supabase/server'

export const dynamic = 'force-dynamic'

// Fallback seed Indian Metro PIN codes for resilient local testing and offline modes
const FALLBACK_PINCODES: Record<string, { city: string; state: string }> = {
  '560001': { city: 'Bengaluru', state: 'Karnataka' },
  '560034': { city: 'Bengaluru', state: 'Karnataka' },
  '560038': { city: 'Bengaluru', state: 'Karnataka' },
  '560102': { city: 'Bengaluru', state: 'Karnataka' },
  '560103': { city: 'Bengaluru', state: 'Karnataka' },
  '400001': { city: 'Mumbai', state: 'Maharashtra' },
  '400050': { city: 'Mumbai', state: 'Maharashtra' },
  '400051': { city: 'Mumbai', state: 'Maharashtra' },
  '110001': { city: 'New Delhi', state: 'Delhi' },
  '122002': { city: 'Gurugram', state: 'Haryana' },
  '500081': { city: 'Hyderabad', state: 'Telangana' },
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const pin = searchParams.get('pin')?.trim()

    if (!pin) {
      return NextResponse.json(
        { serviceable: false, error: 'A PIN code parameter (?pin=...) is required' },
        { status: 400 }
      )
    }

    // Basic format check for 6-digit Indian PIN codes
    if (!/^\d{6}$/.test(pin)) {
      return NextResponse.json(
        {
          serviceable: false,
          pincode: pin,
          message: 'Invalid PIN code. Please enter a valid 6-digit Indian PIN code (e.g., 560001, 400001).',
        },
        { status: 400 }
      )
    }

    try {
      const supabase = await createServerSupabaseClient()
      const { data, error } = await supabase
        .from('bolt_pincodes')
        .select('id, pincode, city, state, is_active')
        .eq('pincode', pin)
        .eq('is_active', true)
        .maybeSingle()

      if (!error && data && data.is_active) {
        return NextResponse.json({
          serviceable: true,
          pincode: data.pincode,
          city: data.city,
          state: data.state,
        })
      }
    } catch {
      // Supabase network unreachable; smoothly fall back to local seed data
    }

    // Check against Indian Metro fallback directory
    const fallback = FALLBACK_PINCODES[pin]
    if (fallback) {
      return NextResponse.json({
        serviceable: true,
        pincode: pin,
        city: fallback.city,
        state: fallback.state,
      })
    }

    return NextResponse.json({
      serviceable: false,
      pincode: pin,
      message: `Bolt ⚡ Try-On is not yet serviceable in PIN ${pin}. Standard delivery is available.`,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json(
      { serviceable: false, error: message },
      { status: 200 }
    )
  }
}
