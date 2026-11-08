import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ATELIER • Omnichannel ERP & WMS',
  description: 'Enterprise apparel ERP, shelf-level warehouse management, and multi-boutique POS.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-chrome-950 text-zinc-100 font-sans antialiased selection:bg-chrome-800">
        {children}
      </body>
    </html>
  )
}
