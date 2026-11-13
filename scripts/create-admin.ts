import fs from 'node:fs'
import path from 'node:path'
import { prisma, UserRole } from '@repo/db'

// Load environment variables from .env.local / .env if not present
function loadEnv() {
  if (!process.env.DATABASE_URL) {
    const envFiles = ['.env.local', '.env']
    for (const file of envFiles) {
      const fullPath = path.resolve(process.cwd(), file)
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf-8')
        for (const line of content.split('\n')) {
          const trimmed = line.trim()
          if (trimmed && !trimmed.startsWith('#')) {
            const eqIdx = trimmed.indexOf('=')
            if (eqIdx !== -1) {
              const key = trimmed.slice(0, eqIdx).trim()
              let val = trimmed.slice(eqIdx + 1).trim()
              if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1)
              else if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1)
              if (!process.env[key]) {
                process.env[key] = val
              }
            }
          }
        }
        break
      }
    }
  }
}

async function main() {
  loadEnv()

  const args = process.argv.slice(2)
  const email = args[0]?.trim()
  const name = args[1]?.trim() || 'Horizon Lord'
  const password = args[2]?.trim() || 'asdfghjkl'

  if (!email) {
    console.error('\n❌ Error: Missing required email argument.')
    console.error('Usage: pnpm tsx scripts/create-admin.ts <email> [name] [password]')
    console.error('Example: pnpm tsx scripts/create-admin.ts horizonlord1@gmail.com "Horizon Lord" asdfghjkl\n')
    process.exit(1)
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    console.error(`\n❌ Error: Invalid email format: "${email}"\n`)
    process.exit(1)
  }

  const normalizedEmail = email.toLowerCase()

  try {
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    })

    let user
    let action: string

    if (existing) {
      user = await prisma.user.update({
        where: { email: normalizedEmail },
        data: {
          name,
          role: UserRole.ADMIN,
        },
      })
      action = 'UPDATED (Role elevated to ADMIN)'
    } else {
      user = await prisma.user.create({
        data: {
          email: normalizedEmail,
          name,
          role: UserRole.ADMIN,
        },
      })
      action = 'CREATED'
    }

    console.log('\n======================================================')
    console.log('  SOVEREIGN OMNICHANNEL - SYSTEM ADMIN PROVISIONED')
    console.log('======================================================')
    console.log(`Action:    ${action}`)
    console.log(`User ID:   ${user.id}`)
    console.log(`Email:     ${user.email}`)
    console.log(`Name:      ${user.name}`)
    console.log(`Role:      ${user.role}`)
    console.log(`Password:  ${password}`)
    console.log(`Created:   ${user.createdAt.toISOString()}`)
    console.log('======================================================')
    console.log(`\n✅ Ready to authenticate in Admin Terminal at:`)
    console.log(`   URL:      http://localhost:3001/login`)
    console.log(`   Email:    ${user.email}`)
    console.log(`   Password: ${password}\n`)
  } catch (error: any) {
    console.error('❌ Failed to provision admin user in PostgreSQL:', error?.message || error)
    console.log('\n💡 Note: Ensure PostgreSQL is running on localhost:5432 or use the API route:')
    console.log(`   POST http://localhost:3001/api/users/admin`)
    console.log(`   Body: { "email": "${normalizedEmail}", "name": "${name}", "password": "${password}" }\n`)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((err) => {
  console.error('Fatal error in create-admin:', err)
  process.exit(1)
})
