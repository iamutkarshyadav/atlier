import React from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowRight,
  Zap,
  Clock,
  ShieldCheck,
  Check,
  Star,
  ChevronRight,
  Sparkles,
  Layers,
  Scissors,
  Truck,
  HeartHandshake,
} from 'lucide-react'
import { createServerSupabaseClient } from '@repo/supabase/server'
import {
  getStorefrontConfig,
  getStorefrontProducts,
  DEFAULT_PRODUCTS,
  type Product,
} from '@repo/supabase/utils'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'ATELIER • Creator Apparel Drop 01 & Bolt ⚡ Doorstep Salon',
  description:
    'Luxury heavyweight creator apparel engineered from 480 GSM French Terry and Japanese raw selvedge denim. Try on up to 5 pieces at your doorstep with Bolt ⚡.',
}

const REVIEWS = [
  {
    id: 'rev-1',
    author: 'Vikram Malhotra',
    role: 'Architect & Creative Director',
    city: 'Indiranagar, Bengaluru',
    rating: 5,
    title: 'The Bolt doorstep salon is revolutionary.',
    text: 'I ordered the 480 GSM French Terry Hoodie and two sizes of the raw denim. The courier arrived right on time during the 10 AM slot. Trying both sizes at home before paying changed online shopping for me forever.',
    garment: 'Heavyweight Boxy Hoodie',
  },
  {
    id: 'rev-2',
    author: 'Ananya Deshmukh',
    role: 'Editorial Stylist',
    city: 'Bandra West, Mumbai',
    rating: 5,
    title: 'Craftsmanship comparable to bespoke Japanese ateliers.',
    text: 'The drape of the Raw Linen Smock is extraordinary. Zero synthetic polyester blending makes a massive difference in structure. The ₹99 doorstep fitting was flawless.',
    garment: 'Architectural Raw Linen Smock',
  },
  {
    id: 'rev-3',
    author: 'Kabir Sen',
    role: 'Industrial Designer',
    city: 'Vasant Vihar, New Delhi',
    rating: 5,
    title: 'The weight of this fabric is unmatched.',
    text: 'You cannot understand 480 GSM loopback cotton until you wear it. Kept the hoodie and track pants, handed back the oversized jacket. Settled via UPI in 10 seconds at the door.',
    garment: 'Flared Minimalist Track Pant',
  },
  {
    id: 'rev-4',
    author: 'Pooja Reddy',
    role: 'Studio Founder',
    city: 'Jubilee Hills, Hyderabad',
    rating: 5,
    title: 'White-glove service in every detail.',
    text: 'The private courier was courteous, professional, and patient. Having 45 minutes in front of my own mirror made all the difference. Will only purchase apparel this way now.',
    garment: 'Japanese Selvedge Denim',
  },
]

export default async function HomePage() {
  const supabase = await createServerSupabaseClient()
  let products: Product[] = []

  try {
    const fetched = await getStorefrontProducts(supabase, 'all')
    products = fetched && fetched.length > 0 ? fetched : DEFAULT_PRODUCTS
  } catch {
    products = DEFAULT_PRODUCTS
  }

  // Curate 6 top-selling works for the featured gallery
  const featuredProducts = products.slice(0, 6)

  return (
    <div className="bg-[#FAF9F6] text-[#121212] overflow-hidden selection:bg-black selection:text-white">
      {/* ========================================================= */}
      {/* 1. CINEMATIC HERO SECTION */}
      {/* ========================================================= */}
      <section className="relative min-h-[92vh] flex items-center justify-center bg-[#080808] text-white px-6 sm:px-12 py-20 overflow-hidden">
        {/* Ambient editorial background imagery */}
        <div className="absolute inset-0 opacity-40 mix-blend-luminosity scale-105 transition-transform duration-1000 ease-out">
          <Image
            src="https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=2000&q=85"
            alt="Atelier Luxury Creator Apparel Editorial"
            fill
            priority
            className="object-cover object-center filter grayscale contrast-125 brightness-90"
          />
        </div>

        {/* Sophisticated dark gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#080808] via-transparent to-[#080808]/70" />
        <div className="absolute inset-0 bg-radial-vignette opacity-80" />

        <div className="relative z-10 max-w-5xl mx-auto text-center space-y-8">
          {/* Top Bolt Brand Pill */}
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs font-mono uppercase tracking-[0.25em] backdrop-blur-md">
            <Zap className="w-3.5 h-3.5 fill-amber-400 text-amber-400 animate-pulse" />
            <span>Introducing Bolt ⚡ Doorstep Try-On Salon</span>
          </div>

          {/* Main Cinematic Title */}
          <div className="space-y-4">
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-light tracking-tight uppercase font-sans leading-[1.08]">
              The Architecture <br />
              <span className="font-serif italic font-normal lowercase tracking-normal text-amber-200/90">
                of creator apparel
              </span>
            </h1>
            <p className="max-w-2xl mx-auto text-sm sm:text-base text-zinc-300 font-light leading-relaxed font-sans">
              Engineered in limited size allocations from custom milled 480 GSM French Terry and 14oz Japanese raw selvedge denim. Try on up to 5 pieces at home before paying.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/shop"
              className="w-full sm:w-auto px-8 py-4 bg-amber-400 hover:bg-amber-300 text-black text-xs font-mono uppercase tracking-widest font-black transition-all duration-300 shadow-xl shadow-amber-400/15 flex items-center justify-center gap-2 group"
            >
              <Zap className="w-4 h-4 fill-black" />
              <span>Experience Bolt ⚡ Try-On</span>
              <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>

            <Link
              href="/shop"
              className="w-full sm:w-auto px-8 py-4 bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-mono uppercase tracking-widest font-semibold transition-all duration-300 backdrop-blur-sm"
            >
              Explore Drop 01 Catalog
            </Link>
          </div>

          {/* Value Badges Banner */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-12 border-t border-white/10 text-[11px] font-mono text-zinc-400">
            <div className="flex items-center justify-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span>₹99 Doorstep Hold Only</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span>45-Min Home Fitting Window</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span>Zero Return Friction</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span>11+ Metro PINs Serviceable</span>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 2. HOW BOLT ⚡ WORKS — 3-STEP INFOGRAPHIC */}
      {/* ========================================================= */}
      <section id="bolt" className="py-24 sm:py-32 px-6 sm:px-12 bg-white border-b border-zinc-200">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 text-amber-700 text-xs font-mono uppercase font-bold tracking-widest border border-amber-500/20">
              <Zap className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
              White-Glove Salon Experience
            </div>
            <h2 className="text-3xl sm:text-4xl font-light tracking-tight uppercase font-sans">
              How Doorstep Try-On Works
            </h2>
            <p className="text-sm text-zinc-600 font-light leading-relaxed">
              Experience the luxury of high-end boutique dressing in the privacy of your residence before committing to a purchase.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Step 1 */}
            <div className="p-8 bg-[#FAF9F6] border border-zinc-200 hover:border-black transition-all duration-300 space-y-5 relative group">
              <div className="flex justify-between items-start">
                <span className="text-3xl font-serif italic text-zinc-400 group-hover:text-black transition-colors">
                  01
                </span>
                <span className="p-3 bg-white border border-zinc-200 text-zinc-800">
                  <Scissors className="w-5 h-5" />
                </span>
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold uppercase tracking-tight font-sans">
                  Curate Your Fitting
                </h3>
                <p className="text-xs text-zinc-600 leading-relaxed font-light">
                  Select up to 5 curated garments in multiple sizes or silhouettes. Pay only a nominal ₹99 booking hold at checkout.
                </p>
              </div>
              <div className="pt-2 text-[11px] font-mono text-zinc-500 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Max 5 pieces • No upfront cart charge</span>
              </div>
            </div>

            {/* Step 2 */}
            <div className="p-8 bg-[#FAF9F6] border border-zinc-200 hover:border-amber-400 transition-all duration-300 space-y-5 relative group shadow-sm">
              <div className="flex justify-between items-start">
                <span className="text-3xl font-serif italic text-amber-600">
                  02
                </span>
                <span className="p-3 bg-amber-400 text-black">
                  <Clock className="w-5 h-5" />
                </span>
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold uppercase tracking-tight font-sans">
                  45m Doorstep Salon
                </h3>
                <p className="text-xs text-zinc-600 leading-relaxed font-light">
                  An Atelier courier arrives in an insured transit vehicle during your chosen IST window. Try everything on in front of your personal mirrors.
                </p>
              </div>
              <div className="pt-2 text-[11px] font-mono text-amber-700 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                <span>Private 45-minute fitting window</span>
              </div>
            </div>

            {/* Step 3 */}
            <div className="p-8 bg-[#FAF9F6] border border-zinc-200 hover:border-black transition-all duration-300 space-y-5 relative group">
              <div className="flex justify-between items-start">
                <span className="text-3xl font-serif italic text-zinc-400 group-hover:text-black transition-colors">
                  03
                </span>
                <span className="p-3 bg-white border border-zinc-200 text-zinc-800">
                  <HeartHandshake className="w-5 h-5" />
                </span>
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold uppercase tracking-tight font-sans">
                  Keep What You Love
                </h3>
                <p className="text-xs text-zinc-600 leading-relaxed font-light">
                  Hand back any sizes or cuts you decline. Settle only what you retain via instant UPI QR or Card, with your ₹99 deposit credited.
                </p>
              </div>
              <div className="pt-2 text-[11px] font-mono text-zinc-500 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Instant UPI • Deposit credited back</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 3. FEATURED CURATED CATALOG GRID */}
      {/* ========================================================= */}
      <section className="py-24 sm:py-32 px-6 sm:px-12 bg-[#FAF9F6]">
        <div className="max-w-7xl mx-auto space-y-12">
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-zinc-200 pb-6">
            <div>
              <span className="text-xs font-mono uppercase tracking-[0.2em] text-zinc-500 block mb-1">
                Drop 01 Edition
              </span>
              <h2 className="text-3xl sm:text-4xl font-light uppercase tracking-tight font-sans">
                Curated Works for Try-On
              </h2>
            </div>

            <Link
              href="/shop"
              className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest font-bold text-zinc-800 hover:text-black transition-colors group"
            >
              <span>View All Pieces ({products.length})</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuredProducts.map((product) => (
              <div
                key={product.id}
                className="group flex flex-col bg-white border border-zinc-200 hover:border-black transition-all duration-300"
              >
                {/* Image Container with Hover Zoom */}
                <Link
                  href={`/product/${product.id}`}
                  className="relative aspect-[4/5] bg-zinc-100 overflow-hidden block"
                >
                  <Image
                    src={product.image_url || '/images/prod1-primary.jpg'}
                    alt={product.title}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
                  />

                  {/* Bolt Available Tag */}
                  <div className="absolute top-3 left-3 z-10">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-mono font-bold uppercase bg-black text-amber-400 tracking-wider shadow">
                      <Zap className="w-2.5 h-2.5 fill-amber-400" />
                      Bolt ⚡ Available
                    </span>
                  </div>

                  {/* Stock Pill */}
                  <div className="absolute top-3 right-3 z-10">
                    <span className="px-2 py-0.5 text-[9px] font-mono uppercase bg-white/90 backdrop-blur-sm text-zinc-800 border border-zinc-200">
                      {product.stock > 0 ? `${product.stock} units` : 'Sold out'}
                    </span>
                  </div>
                </Link>

                {/* Card Info */}
                <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-baseline gap-2">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                        {product.category || 'Drop 01'}
                      </span>
                      <span className="text-[11px] font-mono text-zinc-400">
                        {product.edition || '100% Cotton'}
                      </span>
                    </div>

                    <Link
                      href={`/product/${product.id}`}
                      className="block group-hover:underline underline-offset-4"
                    >
                      <h3 className="text-base font-bold text-zinc-900 tracking-tight font-sans">
                        {product.title}
                      </h3>
                    </Link>

                    <p className="text-xs text-zinc-500 line-clamp-1 font-light">
                      {product.material || 'Heavyweight French Terry'}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-zinc-100 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-mono uppercase text-zinc-400">
                        Price
                      </p>
                      <p className="text-base font-bold font-mono text-zinc-900">
                        ₹{Number(product.price).toFixed(2)}
                      </p>
                    </div>

                    <Link
                      href={`/product/${product.id}`}
                      className="px-4 py-2 bg-zinc-900 hover:bg-black text-white text-[11px] font-mono uppercase tracking-wider font-semibold transition-colors flex items-center gap-1.5"
                    >
                      <span>Try-On</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 4. EDITORIAL TEXTILE MANIFESTO SPLIT */}
      {/* ========================================================= */}
      <section className="bg-black text-white py-24 sm:py-32 px-6 sm:px-12 relative overflow-hidden">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 text-zinc-300 text-xs font-mono uppercase tracking-widest border border-white/20">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              The Textile Standard
            </div>

            <h2 className="text-3xl sm:text-5xl font-light uppercase tracking-tight font-sans leading-tight">
              Crafted in Wakayama. <br />
              <span className="font-serif italic font-normal text-amber-200">
                zero synthetic compromise.
              </span>
            </h2>

            <p className="text-sm text-zinc-400 leading-relaxed font-light">
              Conventional luxury fashion relies on cheap elastane blends that pill within months. Atelier garments are constructed from single-origin combed cotton knitted on vintage loopwheel machines at sluggish speeds to create an indestructible drape.
            </p>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-800 text-xs font-mono">
              <div>
                <p className="text-amber-400 font-bold text-lg">480 GSM</p>
                <p className="text-zinc-400 text-[11px] uppercase mt-0.5">Heavyweight Loopback Fleece</p>
              </div>
              <div>
                <p className="text-amber-400 font-bold text-lg">14.5 OZ</p>
                <p className="text-zinc-400 text-[11px] uppercase mt-0.5">Japanese Raw Selvedge Denim</p>
              </div>
            </div>

            <div className="pt-2">
              <Link
                href="/about"
                className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-white hover:text-amber-300 transition-colors underline underline-offset-8"
              >
                <span>Read our Mill & Heritage Story</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          <div className="lg:col-span-6 relative aspect-[4/3] bg-zinc-900 border border-zinc-800 overflow-hidden">
            <Image
              src="https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=1200&q=85"
              alt="Atelier Cotton Weaving Mill Detail"
              fill
              className="object-cover filter contrast-110 grayscale"
            />
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 5. USER REVIEWS & SOCIAL PROOF */}
      {/* ========================================================= */}
      <section className="py-24 sm:py-32 px-6 sm:px-12 bg-[#FAF9F6] border-t border-zinc-200">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <div className="flex items-center justify-center gap-1 text-amber-500 mb-2">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
              ))}
              <span className="text-xs font-mono text-zinc-600 font-bold ml-2">
                4.9 / 5.0 (280+ Patron Fittings)
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-light uppercase tracking-tight font-sans">
              Doorstep Fitting Experiences
            </h2>
            <p className="text-sm text-zinc-600 font-light leading-relaxed">
              Dispatches delivered to private residences across Bengaluru, Mumbai, Delhi NCR, and Hyderabad.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {REVIEWS.map((rev) => (
              <div
                key={rev.id}
                className="p-8 bg-white border border-zinc-200 hover:border-black transition-all duration-300 space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex text-amber-400">
                      {[...Array(rev.rating)].map((_, idx) => (
                        <Star key={idx} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      Verified Bolt Fitting
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-zinc-900 font-sans tracking-tight">
                    &ldquo;{rev.title}&rdquo;
                  </h3>

                  <p className="text-xs text-zinc-600 leading-relaxed font-light">
                    {rev.text}
                  </p>
                </div>

                <div className="pt-4 border-t border-zinc-100 flex items-center justify-between text-xs font-mono">
                  <div>
                    <p className="font-bold text-zinc-900">{rev.author}</p>
                    <p className="text-[11px] text-zinc-500">{rev.role} • {rev.city}</p>
                  </div>
                  <span className="text-[10px] text-zinc-400 bg-zinc-50 px-2 py-1 border border-zinc-100">
                    {rev.garment}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 6. CALLOUT: CHECK PIN AVAILABILITY & DISPATCH */}
      {/* ========================================================= */}
      <section className="py-20 px-6 sm:px-12 bg-amber-400 text-black">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-8 text-center sm:text-left">
          <div className="space-y-2">
            <span className="text-xs font-mono uppercase tracking-widest font-black flex items-center justify-center sm:justify-start gap-1.5">
              <Zap className="w-4 h-4 fill-black" />
              White-Glove Fleet Active in Your City
            </span>
            <h2 className="text-2xl sm:text-4xl font-black uppercase font-sans tracking-tight">
              Ready to try Bolt ⚡ at your doorstep?
            </h2>
            <p className="text-xs sm:text-sm text-zinc-900 font-sans">
              Book a 45-minute fitting salon for Drop 01. Pay only for what fits you perfectly.
            </p>
          </div>

          <Link
            href="/shop"
            className="px-8 py-4 bg-black hover:bg-zinc-800 text-white font-mono text-xs uppercase tracking-widest font-bold shrink-0 transition-colors shadow-2xl"
          >
            Start Your Try-On Bag →
          </Link>
        </div>
      </section>
    </div>
  )
}
