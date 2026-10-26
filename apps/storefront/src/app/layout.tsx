import type { Metadata } from 'next'
import './globals.css'
import { Navbar } from '../components/Navbar'
import { Footer } from '../components/Footer'

export const metadata: Metadata = {
  title: 'ATELIER • Creator Apparel Drop',
  description: 'Engineered heavyweight garments, custom milled French Terry, and selvedge denim for creators.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col bg-[#FAFAFA] text-[#0A0A0C] antialiased selection:bg-neutral-900 selection:text-white">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  )
}

