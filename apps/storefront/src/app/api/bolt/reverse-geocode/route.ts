import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const latStr = searchParams.get('lat') || searchParams.get('latitude')
    const lngStr = searchParams.get('lng') || searchParams.get('longitude') || searchParams.get('lon')

    if (!latStr || !lngStr) {
      return NextResponse.json(
        { success: false, error: 'Latitude and longitude query parameters are required.' },
        { status: 400 }
      )
    }

    const lat = parseFloat(latStr)
    const lng = parseFloat(lngStr)

    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return NextResponse.json(
        { success: false, error: 'Invalid latitude or longitude values.' },
        { status: 400 }
      )
    }

    // Call OpenStreetMap Nominatim reverse geocoding with strict User-Agent
    const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(
      lat
    )}&lon=${encodeURIComponent(lng)}&zoom=18&addressdetails=1`

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 4500)

    try {
      const response = await fetch(nominatimUrl, {
        headers: {
          'User-Agent': 'MaisonTG-Storefront/1.0 (retail@maisontg.com; Indian eCommerce Storefront)',
          Accept: 'application/json',
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        return NextResponse.json(
          { success: false, error: `Reverse geocoding provider responded with status ${response.status}` },
          { status: 200 }
        )
      }

      const data = await response.json()
      const address = data?.address || {}

      // Clean postcode (remove whitespace e.g. "560 001" -> "560001")
      const rawPostcode = (address.postcode || '').toString().trim().replace(/\s+/g, '')

      // Strictly verify real 6-digit Indian PIN (Rule 1: Never guess or fallback to a fake metro PIN)
      if (/^\d{6}$/.test(rawPostcode)) {
        const city =
          address.city ||
          address.town ||
          address.city_district ||
          address.suburb ||
          address.village ||
          address.state_district ||
          address.county ||
          null

        const state = address.state || null

        return NextResponse.json({
          success: true,
          pincode: rawPostcode,
          city,
          state,
        })
      }

      return NextResponse.json({
        success: false,
        error: 'No valid 6-digit Indian postal code found for the detected coordinates.',
      })
    } catch (fetchErr: unknown) {
      clearTimeout(timeoutId)
      const errMessage = fetchErr instanceof Error ? fetchErr.message : 'Timeout or network failure'
      return NextResponse.json({
        success: false,
        error: `Reverse geocode request failed: ${errMessage}`,
      })
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected server error'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
