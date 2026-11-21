import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Navbar } from '../components/Navbar'
import { Footer } from '../components/Footer'
import { ThemeInjector } from '../components/cms/ThemeInjector'
import { createServerSupabaseClient } from '@repo/supabase/server'
import { getStorefrontTokens, DEFAULT_STOREFRONT_TOKENS, getCategories, DEFAULT_CATEGORIES, type Category } from '@repo/supabase/utils'

const fontSans = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Maison TG | Online Shopping for Men & Women Apparel',
  description:
    'Shop hoodies, t-shirts, outerwear, jackets & denim jeans with complimentary express delivery across India and 45-minute doorstep try-on in select hubs.',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  let initialTokens: Record<string, string> = (DEFAULT_STOREFRONT_TOKENS.tokens_json as Record<string, string>) || {}
  let categories: Category[] = DEFAULT_CATEGORIES
  try {
    const supabase = await createServerSupabaseClient()
    const [tokens, cats] = await Promise.all([
      getStorefrontTokens(supabase, 'default').catch(() => null),
      getCategories(supabase).catch(() => DEFAULT_CATEGORIES),
    ])
    if (tokens && tokens.tokens_json && typeof tokens.tokens_json === 'object') {
      initialTokens = tokens.tokens_json as Record<string, string>
    }
    if (cats && cats.length > 0) {
      categories = cats
    }
  } catch {
    // Fall back to default
  }

  return (
    <html lang="en" className={fontSans.variable} suppressHydrationWarning>
      <head>
        <ThemeInjector initialTokens={initialTokens} />
      </head>
      <body className="min-h-screen flex flex-col bg-white text-[#14293a] antialiased selection:bg-[#b91c1c] selection:text-white transition-colors duration-200">
        <Navbar initialCategories={categories} />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  )
}
