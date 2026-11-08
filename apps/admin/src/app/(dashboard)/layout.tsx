import React from 'react'
import { AdminSidebar } from '../../components/AdminSidebar'
import { AdminHeader } from '../../components/AdminHeader'
import { LocationProvider } from '../../context/LocationContext'

export default function AuthenticatedDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <LocationProvider>
      <div className="flex min-h-screen bg-chrome-950 text-neutral-100 font-sans">
        <AdminSidebar />
        <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
          <AdminHeader />
          <main className="flex-1 overflow-y-auto bg-chrome-950 p-4 sm:p-6">{children}</main>
        </div>
      </div>
    </LocationProvider>
  )
}
