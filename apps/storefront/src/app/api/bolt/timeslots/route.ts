import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@repo/supabase/server'
import { DEFAULT_BOLT_TIMESLOTS } from '@repo/supabase/utils'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    try {
      const supabase = await createServerSupabaseClient()
      const { data: timeslots, error } = await supabase
        .from('bolt_timeslots')
        .select('*')
        .eq('is_active', true)
        .order('slot_start', { ascending: true })

      if (!error && timeslots && timeslots.length > 0) {
        return NextResponse.json({
          success: true,
          timeslots,
        })
      }
    } catch {
      // Remote Supabase query failed; fall back to default IST slots
    }

    return NextResponse.json({
      success: true,
      timeslots: DEFAULT_BOLT_TIMESLOTS,
    })
  } catch (err: unknown) {
    return NextResponse.json({
      success: true,
      timeslots: DEFAULT_BOLT_TIMESLOTS,
    })
  }
}
