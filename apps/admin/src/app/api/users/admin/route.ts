import { NextRequest, NextResponse } from 'next/server'
import { prisma, UserRole } from '@repo/db'
import { SEEDED_ACCOUNTS } from '@repo/supabase'

export const dynamic = 'force-dynamic'

interface CreateAdminPayload {
  email?: string
  name?: string
  password?: string
}

export async function POST(req: NextRequest) {
  try {
    let body: CreateAdminPayload
    try {
      body = await req.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON request body' },
        { status: 400 }
      )
    }

    const { email, name, password = 'asdfghjkl' } = body

    if (!email || typeof email !== 'string' || !name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Name and a valid email address are required' },
        { status: 400 }
      )
    }

    const trimmedEmail = email.trim().toLowerCase()
    const trimmedName = name.trim()

    if (!trimmedName) {
      return NextResponse.json(
        { error: 'Name cannot be empty' },
        { status: 400 }
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(trimmedEmail)) {
      return NextResponse.json(
        { error: `Invalid email format: "${email}"` },
        { status: 400 }
      )
    }

    // 1. Sync into SEEDED_ACCOUNTS for Supabase / in-memory Auth provider
    const existingSeeded = SEEDED_ACCOUNTS.find(
      (a) => a.email.toLowerCase() === trimmedEmail
    )
    if (existingSeeded) {
      existingSeeded.role = 'admin'
      existingSeeded.name = trimmedName
      existingSeeded.password = password
    } else {
      SEEDED_ACCOUNTS.push({
        id: `admin-${Date.now()}`,
        email: trimmedEmail,
        name: trimmedName,
        role: 'admin',
        password,
      })
    }

    // 2. Persist to PostgreSQL via Prisma
    let dbUser = null
    let isNew = !existingSeeded
    try {
      const existing = await prisma.user.findUnique({
        where: { email: trimmedEmail },
      })
      isNew = !existing
      dbUser = await prisma.user.upsert({
        where: { email: trimmedEmail },
        update: {
          name: trimmedName,
          role: UserRole.ADMIN,
        },
        create: {
          email: trimmedEmail,
          name: trimmedName,
          role: UserRole.ADMIN,
        },
      })
    } catch (dbErr: any) {
      console.warn(
        'Database warning: Postgres unreachable, provisioned in authoritative auth registry:',
        dbErr?.message || dbErr
      )
    }

    const userId = dbUser?.id || existingSeeded?.id || `admin-${Date.now()}`

    return NextResponse.json(
      {
        success: true,
        isNew,
        user: {
          id: userId,
          email: trimmedEmail,
          name: trimmedName,
          role: 'ADMIN',
          createdAt: dbUser?.createdAt || new Date().toISOString(),
          updatedAt: dbUser?.updatedAt || new Date().toISOString(),
        },
        message: isNew
          ? `Administrator "${trimmedName}" (${trimmedEmail}) successfully created.`
          : `User "${trimmedName}" (${trimmedEmail}) updated and elevated to ADMIN role.`,
        credentials: {
          email: trimmedEmail,
          role: 'ADMIN',
        },
      },
      { status: isNew ? 201 : 200 }
    )
  } catch (error: any) {
    console.error('Error in /api/users/admin route:', error)
    return NextResponse.json(
      {
        error: 'Internal Server Error while provisioning admin user',
        details: error?.message || String(error),
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  const admins = SEEDED_ACCOUNTS.filter((a) => a.role === 'admin')
  return NextResponse.json({ admins }, { status: 200 })
}
