import fs from 'fs'
import path from 'path'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://bmjbzupilwbzdimowgnd.supabase.co'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

async function runMigration() {
  const migrationPath = path.join(__dirname, '../migrations/20261025_audit_remediation_barcode_invoicing.sql')
  const sql = fs.readFileSync(migrationPath, 'utf8')

  console.log('Applying migration:', migrationPath)

  // Try Supabase SQL query endpoint
  const res = await fetch(`${SUPABASE_URL}/pg/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({ query: sql }),
  })

  if (res.ok) {
    const data = await res.json()
    console.log('Migration successfully applied via /pg/query:', data)
  } else {
    console.log('Endpoint /pg/query response status:', res.status)
    const errText = await res.text()
    console.log('Details:', errText)
  }
}

runMigration().catch(console.error)
