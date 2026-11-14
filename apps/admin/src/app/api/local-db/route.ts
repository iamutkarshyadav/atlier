import { NextRequest, NextResponse } from 'next/server'
import { handleOfflineSupabaseRequest } from '@repo/supabase/clients/resilientFetch'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json()
    const { url, method, headers, body } = payload

    const init: RequestInit = {
      method: method || 'GET',
      headers: headers || {},
      body: body !== undefined ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
    }

    const response = await handleOfflineSupabaseRequest(url, init)
    const text = await response.text()
    const responseHeaders: Record<string, string> = {}
    response.headers.forEach((val, key) => {
      responseHeaders[key] = val
    })

    return new NextResponse(text, {
      status: response.status,
      headers: responseHeaders,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Local DB Bridge Error' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const targetUrl = url.searchParams.get('url') || 'http://127.0.0.1:54321/rest/v1/categories'
  const response = await handleOfflineSupabaseRequest(targetUrl, { method: 'GET' })
  const text = await response.text()
  return new NextResponse(text, {
    status: response.status,
    headers: { 'Content-Type': 'application/json' },
  })
}

