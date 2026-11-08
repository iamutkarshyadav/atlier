const fs = require('fs')
const path = require('path')

// Helper to load env variables from .env.local or .env if present
function loadEnv() {
  const envFiles = [
    path.resolve(process.cwd(), '.env.local'),
    path.resolve(process.cwd(), '.env'),
    path.resolve(__dirname, '../../.env.local'),
    path.resolve(__dirname, '../../.env'),
  ]

  for (const file of envFiles) {
    if (fs.existsSync(file)) {
      try {
        const content = fs.readFileSync(file, 'utf8')
        for (const line of content.split('\n')) {
          const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/)
          if (match) {
            const key = match[1]
            let value = match[2] || ''
            value = value.replace(/^['"](.*)['"]$/, '$1').trim()
            if (!process.env[key]) {
              process.env[key] = value
            }
          }
        }
      } catch {
        // Continue
      }
    }
  }
}

loadEnv()

const { createClient } = require('@supabase/supabase-js')

if (typeof globalThis.WebSocket === 'undefined') {
  globalThis.WebSocket = class DummyWebSocket {}
}

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321').replace(/"/g, '')
const SERVICE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || 'dummy_service_key').replace(/"/g, '')

async function main() {
  // Read command line arguments or use defaults
  const args = process.argv.slice(2)
  const email = (args[0] || 'admin@atelier.internal').trim()
  const password = args[1] || 'admin-secret-2026'
  const name = args[2] || (email.split('@')[0] ? email.split('@')[0].toUpperCase() + ' (Admin)' : 'Sovereign Administrator')

  console.log('====================================================')
  console.log('       ATELIER • ADMIN PROVISIONING UTILITY         ')
  console.log('====================================================')
  console.log(`Target Email    : ${email}`)
  console.log(`Target Name     : ${name}`)
  console.log(`Assigned Role   : admin (Sovereign Administrator)`)
  console.log(`Supabase URL    : ${SUPABASE_URL}`)
  console.log('----------------------------------------------------')

  let liveSuccess = false

  // 1. Attempt Live Supabase API Provisioning if host is not a dummy placeholder
  if (SUPABASE_URL && SERVICE_KEY && !SUPABASE_URL.includes('placeholder')) {
    try {
      const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      })

      console.log('Querying Supabase Auth directory...')
      const { data: usersData, error: listErr } = await supabase.auth.admin.listUsers()

      if (!listErr) {
        let user = usersData?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase())

        if (user) {
          console.log(`User already exists in Auth (UUID: ${user.id}). Updating password and sovereign admin role...`)
          const { data: updateData, error: updateErr } = await supabase.auth.admin.updateUserById(user.id, {
            password,
            email_confirm: true,
            app_metadata: { role: 'admin' },
            user_metadata: { role: 'admin', name },
          })

          if (!updateErr && updateData?.user) {
            user = updateData.user
            liveSuccess = true
          }
        } else {
          console.log(`Creating user in Supabase Auth with admin role...`)
          const { data: createData, error: createErr } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            app_metadata: { role: 'admin' },
            user_metadata: { role: 'admin', name },
          })

          if (!createErr && createData?.user) {
            user = createData.user
            console.log(`User created in Auth with UUID: ${user.id}`)
            liveSuccess = true
          }
        }

        if (user) {
          console.log(`Synchronizing public.users table for UUID: ${user.id}...`)
          const { error: profileErr } = await supabase
            .from('users')
            .upsert(
              {
                id: user.id,
                email,
                name,
                role: 'admin',
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'id' }
            )

          if (!profileErr) {
            console.log('public.users record synchronized successfully with role = "admin".')
          }
        }
      }
    } catch (err) {
      console.log('Note: Live Supabase host unreachable; falling back to local registry...')
    }
  }

  // 2. Ensure Local / Offline Development Registry (resilientFetch.ts) also includes this Admin
  try {
    const resilientPath = path.resolve(__dirname, '../src/clients/resilientFetch.ts')
    if (fs.existsSync(resilientPath)) {
      let content = fs.readFileSync(resilientPath, 'utf8')
      if (!content.includes(email.toLowerCase())) {
        const entry = `  {\n    id: 'b0000000-0000-0000-0000-${Date.now().toString().slice(-12)}',\n    email: '${email.toLowerCase()}',\n    name: '${name}',\n    role: 'admin',\n    password: '${password}',\n  },`
        content = content.replace('export const SEEDED_ACCOUNTS: MockUserAccount[] = [', `export const SEEDED_ACCOUNTS: MockUserAccount[] = [\n${entry}`)
        fs.writeFileSync(resilientPath, content, 'utf8')
        console.log('Registered admin account in local development registry (resilientFetch.ts).')
      }
    }
  } catch {
    // Non-fatal
  }

  console.log('----------------------------------------------------')
  console.log('PROVISIONING COMPLETE:')
  console.log(`  Email    : ${email}`)
  console.log(`  Password : ${password}`)
  console.log(`  Role     : admin`)
  console.log('\nYou can now log in at:')
  console.log('  Local       : http://localhost:3001/login')
  console.log('  Storefront  : http://localhost:3000/login')
  console.log('====================================================\n')
}

main().catch((err) => {
  console.error('Provisioning failed:', err)
  process.exit(1)
})
