import type { Metadata }              from 'next'
import { redirect }                   from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { StaffManager }               from '@/components/dashboard/StaffManager'
import { StaffWorkingDaysEditor }     from './StaffWorkingDaysEditor'
import type { StaffWorkingDay }       from '@/types/database'

export const metadata: Metadata = { title: 'Personel' }

export default async function StaffPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const bizQuery = await supabase
    .from('businesses')
    .select('*')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (!bizQuery.data) redirect('/onboarding')
  const business = bizQuery.data

  const [staffQ, subQ, wdQ] = await Promise.all([
    supabase
      .from('staff')
      .select('*')
      .eq('business_id', business.id)
      .order('full_name'),
    supabase
      .from('subscriptions')
      .select('plan_name')
      .eq('business_id', business.id)
      .maybeSingle(),
    supabase
      .from('staff_working_days')
      .select('*')
      .eq('business_id', business.id),
  ])

  const workingDays: StaffWorkingDay[] = wdQ.data ?? []

  return (
    <div>
      <StaffManager
        businessId={business.id}
        businessType={business.business_type ?? null}
        planName={subQ.data?.plan_name ?? null}
        initial={staffQ.data ?? []}
      />

      {/* Çalışma günleri — her aktif personel için */}
      {(staffQ.data ?? []).filter((s) => s.status === 'Aktif').length > 0 && (
        <div style={{ marginTop: 32 }}>
          <h2 style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '.6px',
            textTransform: 'uppercase', color: 'var(--color-muted)', marginBottom: 14,
          }}>
            Personel Çalışma Günleri
          </h2>
          <div style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
          }}>
            {(staffQ.data ?? [])
              .filter((s) => s.status === 'Aktif')
              .map((s, i, arr) => (
                <div key={s.id} style={{
                  padding: '14px 20px',
                  borderBottom: i < arr.length - 1 ? '1px solid var(--color-border)' : 'none',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 16,
                  flexWrap: 'wrap',
                }}>
                  <div style={{ minWidth: 140 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{s.full_name}</p>
                    {s.title && (
                      <p style={{ fontSize: 12, color: 'var(--color-muted)' }}>{s.title}</p>
                    )}
                  </div>
                  <StaffWorkingDaysEditor
                    staffId={s.id}
                    businessId={business.id}
                    staffName={s.full_name}
                    initialDays={workingDays}
                  />
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}
