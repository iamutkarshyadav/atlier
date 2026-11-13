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
  title: 'ATELIER • Creator Apparel Drop',
  description: 'Engineered heavyweight garments, custom milled French Terry, and selvedge denim for creators.',
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
    <html lang="en" className={`${fontSans.variable} ${fontScript.variable}`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem('atelier-theme')||'dark';var p=window.matchMedia('(prefers-color-scheme: dark)').matches;var r=document.documentElement;r.classList.remove('dark','light');if(s==='dark'){r.classList.add('dark');r.setAttribute('data-theme','dark');}else if(s==='light'){r.classList.add('light');r.setAttribute('data-theme','light');}else{r.setAttribute('data-theme','system');if(p){r.classList.add('dark');}else{r.classList.add('light');}}}catch(e){}})();`,
          }}
        />
        <ThemeInjector initialTokens={initialTokens} />
      </head>
      <body className="min-h-screen flex flex-col bg-[var(--royal-canvas,#212121)] text-[var(--royal-foreground,#FFFFFF)] antialiased selection:bg-[#B91C1C] selection:text-white transition-colors duration-200">
        <BoltServiceabilityBanner />
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
        <BoltTryOnDiscoveryCard />
      </body>
    </html>
  )
}
