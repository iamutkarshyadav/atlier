import type { Metadata } from 'next'
import { Space_Grotesk } from 'next/font/google'
import './globals.css'

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-space-grotesk',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'ATELIER • Sovereign Admin',
  description: 'Private administrative operations, inventory, and storefront content management.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`dark ${spaceGrotesk.variable}`}>
      <body className={`${spaceGrotesk.className} min-h-screen bg-[#09090B] text-[#F4F4F5] antialiased selection:bg-neutral-800`}>
        {children}
      </body>
    </html>
  )
}
