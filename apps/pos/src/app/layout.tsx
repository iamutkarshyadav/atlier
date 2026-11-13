import React from 'react'

export const metadata = {
  title: 'Atelier Offline-Tolerant POS Terminal',
  description: 'Physical retail store point of sale terminal with local queue sync',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-neutral-950 text-white min-h-screen antialiased">
        {children}
      </body>
    </html>
  )
}

