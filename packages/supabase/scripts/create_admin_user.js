const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://bmjbzupilwbzdimowgnd.supabase.co'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (typeof globalThis.WebSocket === 'undefined') {
  globalThis.WebSocket = class DummyWebSocket {}
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function main() {
  const email = 'iamutkarshyadav1@gmail.com'
  const password = 'asdfghjkl'
  const name = 'Utkarsh Yadav'

  console.log(`Checking if user ${email} already exists...`)

  // 1. Check existing users in Auth
  const { data: usersData, error: listErr } = await supabase.auth.admin.listUsers()
  if (listErr) {
    console.error('Error listing users:', listErr.message)
  }

  let user = usersData?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase())

  if (user) {
    console.log(`User found in Auth (id: ${user.id}). Updating password and metadata...`)
    const { data: updateData, error: updateErr } = await supabase.auth.admin.updateUserById(user.id, {
      password: password,
      email_confirm: true,
      app_metadata: { role: 'admin' },
      user_metadata: { role: 'admin', name: name },
    })
    if (updateErr) {
      console.error('Error updating user in Auth:', updateErr.message)
    } else {
      console.log('Password updated successfully.')
      user = updateData.user
    }
  } else {
    console.log(`Creating user in Auth with admin role...`)
    const { data: createData, error: createErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: 'admin', name: name },
    })

    if (createErr) {
      console.error('Error creating user in Auth:', createErr.message)
      return
    }
    user = createData.user
    console.log(`User created successfully with id: ${user.id}`)
  }

  // 2. Ensure public.users table has role = 'admin'
  console.log(`Updating public.users table for id: ${user.id}...`)
  const { data: profile, error: profileErr } = await supabase
    .from('users')
    .upsert(
      {
        id: user.id,
        email: email,
        name: name,
        role: 'admin',
      },
      { onConflict: 'id' }
    )
    .select()

  if (profileErr) {
    console.error('Error upserting into public.users:', profileErr.message)
  } else {
    console.log('public.users record updated successfully:', profile)
  }

  console.log('\n--- SUCCESS ---')
  console.log(`Admin user ${email} is ready.`)
  console.log('You can now log in at http://localhost:3001/login')
}

main().catch(console.error)
