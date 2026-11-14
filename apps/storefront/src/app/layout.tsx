import type { Metadata } from 'next'
import { Plus_Jakarta_Sans, Pinyon_Script } from 'next/font/google'
import './globals.css'
import { Navbar } from '../components/Navbar'
import { Footer } from '../components/Footer'
import { BoltServiceabilityBanner } from '../components/BoltServiceabilityBanner'
import { BoltTryOnDiscoveryCard } from '../components/BoltTryOnDiscoveryCard'
import { ThemeInjector } from '../components/cms/ThemeInjector'
import { createServerSupabaseClient } from '@repo/supabase/server'
import { getStorefrontTokens, DEFAULT_STOREFRONT_TOKENS } from '@repo/supabase/utils'

const fontSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

const fontScript = Pinyon_Script({
  subsets: ['latin'],
  variable: '--font-script',
  weight: ['400'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Maison Tg • The Grace Atelier',
  description: 'Elegance, Luxury, Grace & Perfection. Architectural silhouettes, pure Mulberry silk, and Bangalore premier 45-minute white-glove doorstep salon.',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  let initialTokens: Record<string, string> = (DEFAULT_STOREFRONT_TOKENS.tokens_json as Record<string, string>) || {}
  try {
    const supabase = await createServerSupabaseClient()
    const tokens = await getStorefrontTokens(supabase, 'default')
    if (tokens && tokens.tokens_json && typeof tokens.tokens_json === 'object') {
      initialTokens = tokens.tokens_json as Record<string, string>
    }
  } catch {
    // Fall back to default
  }

  return (
    <html lang="en" data-theme="light" className={`${fontSans.variable} ${fontScript.variable}`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{localStorage.removeItem('atelier-theme');var r=document.documentElement;r.classList.remove('dark');r.classList.add('light');r.setAttribute('data-theme','light');}catch(e){}})();`,
          }}
        />
        <ThemeInjector initialTokens={initialTokens} />
      </head>
      <body className="min-h-screen flex flex-col bg-[var(--royal-canvas,#F8F8F6)] text-[var(--royal-foreground,#09090B)] antialiased selection:bg-[#B91C1C] selection:text-white transition-colors duration-200">
        <BoltServiceabilityBanner />
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
        <BoltTryOnDiscoveryCard />
      </body>
    </html>
  )
}
