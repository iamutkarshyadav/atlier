import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json(
    { error: 'Forbidden: Demo administration backdoors are permanently decommissioned.' },
    { status: 403 }
  )
}
