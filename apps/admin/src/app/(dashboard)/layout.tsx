import React from 'react'
import { AdminSidebar } from '../../components/AdminSidebar'
import { AdminHeader } from '../../components/AdminHeader'

export default function AuthenticatedDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen bg-[#09090B] text-neutral-100">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <AdminHeader />
        <main className="flex-1 p-6 sm:p-10 overflow-y-auto bg-[#09090B]">{children}</main>
      </div>
    </div>
  )
}
