import type { Metadata } from 'next'
import './globals.css'
import { DeliveryNavbar } from '../components/DeliveryNavbar'

export const metadata: Metadata = {
  title: 'ATELIER • Courier Transit Dispatch',
  description: 'Dedicated high-contrast mobile portal for white-glove art couriers.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#000000] text-[#FFFFFF] antialiased flex flex-col selection:bg-white selection:text-black">
        <DeliveryNavbar />
        <main className="flex-1 max-w-xl w-full mx-auto p-4 sm:p-6">{children}</main>
      </body>
    </html>
  )
}
