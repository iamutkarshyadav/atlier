import React from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import {
  Zap,
  ArrowRight,
  ShieldCheck,
  Scissors,
  Layers,
  MapPin,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'About Atelier • Heritage, Craftsmanship & The Bolt ⚡ Promise',
  description:
    'The story of Atelier: architectural creator apparel engineered from 480 GSM French Terry and Japanese raw selvedge denim, coupled with the revolutionary Bolt ⚡ doorstep fitting salon.',
}

export default function AboutBrandPage() {
  return (
    <div className="bg-[#212121] text-white selection:bg-[#B91C1C] selection:text-white min-h-screen">
      {/* ========================================================= */}
      {/* 1. EDITORIAL HEADER */}
      {/* ========================================================= */}
      <section className="relative px-6 sm:px-12 pt-28 pb-16 sm:pb-24 border-b border-white/10 bg-[#1A1B1D]">
        <div className="max-w-4xl mx-auto space-y-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#262629] border border-white/10 text-neutral-300 text-xs font-mono uppercase tracking-[0.25em] rounded-full">
            <span>ATELIER ARCHIVE • EST. 2024</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold uppercase tracking-tight text-white font-sans leading-[1.05]">
            The Architecture <br />
            <span className="font-script font-normal lowercase tracking-normal text-[#B91C1C] text-5xl sm:text-7xl block mt-2">
              of honest garments
            </span>
          </h1>

          <p className="text-sm sm:text-base text-neutral-400 font-light leading-relaxed max-w-2xl mx-auto font-sans">
            We build clothing the way brutalist architects erect monoliths: prioritizing raw material integrity, deliberate proportions, and uncompromising permanence.
          </p>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 2. SECTION: OUR HERITAGE */}
      {/* ========================================================= */}
      <section className="py-20 sm:py-28 px-6 sm:px-12 max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 items-start">
          <div className="md:col-span-4 font-mono text-xs uppercase tracking-widest text-neutral-400 space-y-2 sticky top-28">
            <span className="text-[#B91C1C] block font-bold">Chapter 01</span>
            <h2 className="text-xl font-bold uppercase tracking-tight text-white font-sans">
              Our Heritage
            </h2>
            <p className="text-[11px] text-neutral-400 lowercase font-mono">
              from fast fashion fatigue to single-origin fibers
            </p>
          </div>

          <div className="md:col-span-8 space-y-6 text-sm sm:text-base font-light text-neutral-300 leading-relaxed font-sans">
            <p className="text-lg sm:text-xl text-white font-serif italic border-l-2 border-[#B91C1C] pl-4">
              &ldquo;Modern apparel was broken by the spreadsheet. Fabrics were thinned, synthetic plastics were blended into cotton, and returns were treated as trash.&rdquo;
            </p>

            <p>
              Atelier was established as a direct rebellion against disposable luxury. We observed that contemporary labels charged exorbitant sums for 220 GSM blended cotton that deformed after three washes. Our mission was straightforward: engineer clothing with the permanence of stone and timber.
            </p>

            <p>
              Every garment in our catalog begins with raw, unadulterated fiber. We partner directly with historic knitting mills in Wakayama, Japan, where loopwheel machines rotate at a sluggish 24 revolutions per minute, allowing tensionless loops of cotton to form naturally without mechanical strain.
            </p>

            <div className="grid grid-cols-2 gap-6 pt-6 border-t border-white/10 font-mono text-xs">
              <div>
                <p className="text-white font-bold text-base">Zero Synthetics</p>
                <p className="text-neutral-400 mt-1">100% biodegradable natural cotton and raw selvedge yarns.</p>
              </div>
              <div>
                <p className="text-white font-bold text-base">Strict Allocations</p>
                <p className="text-neutral-400 mt-1">Under 150 pieces per size run worldwide. Never mass produced.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 3. FULL-WIDTH EDITORIAL IMAGE BANNER */}
      {/* ========================================================= */}
      <section className="relative w-full h-[65vh] sm:h-[80vh] overflow-hidden bg-black">
        <Image
          src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=2000&q=85"
          alt="Atelier Fashion Editorial Spread"
          fill
          priority
          className="object-cover object-center filter grayscale contrast-125 brightness-90"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-[#212121] via-transparent to-black/50" />

        <div className="absolute bottom-10 left-6 sm:left-12 right-6 sm:right-12 max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-end justify-between gap-4 text-white">
          <div className="space-y-1">
            <span className="text-[11px] font-mono uppercase tracking-[0.25em] text-[#B91C1C] font-bold">
              Editorial Volume 01
            </span>
            <h3 className="text-2xl sm:text-4xl font-light uppercase font-sans tracking-tight">
              Form follows textile.
            </h3>
          </div>
          <p className="text-xs font-mono text-neutral-300 max-w-sm">
            Captured on 35mm film at the Wakayama Loopwheel Mill, Kansai Prefecture, Japan.
          </p>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 4. SECTION: THE CRAFTSMANSHIP */}
      {/* ========================================================= */}
      <section className="py-20 sm:py-28 px-6 sm:px-12 max-w-5xl mx-auto border-b border-white/10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 items-start">
          <div className="md:col-span-4 font-mono text-xs uppercase tracking-widest text-neutral-400 space-y-2 sticky top-28">
            <span className="text-[#B91C1C] block font-bold">Chapter 02</span>
            <h2 className="text-xl font-bold uppercase tracking-tight text-white font-sans">
              The Craftsmanship
            </h2>
            <p className="text-[11px] text-neutral-400 lowercase font-mono">
              shuttle looms, double-needle cover-stitching, raw brass
            </p>
          </div>

          <div className="md:col-span-8 space-y-6 text-sm sm:text-base font-light text-neutral-300 leading-relaxed font-sans">
            <p>
              Our signature hoodies weigh a formidable <strong>480 grams per square meter (GSM)</strong>. To achieve this density, our French Terry is knitted using 3-end fleece yarns with combed exterior faces that resist wind penetration while remaining cloud-soft against the skin.
            </p>

            <p>
              Our denim is woven exclusively in Kojima, Okayama on vintage 1960s Toyoda shuttle looms. We weave 14.5oz raw selvedge denim using deep rope-dyed indigo yarns that develop distinct high-contrast fading patterns unique to your everyday posture and movements.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 font-mono text-xs">
              <div className="p-5 bg-[#262629] border border-white/10 rounded-2xl space-y-2">
                <Scissors className="w-5 h-5 text-[#B91C1C] mb-2" />
                <p className="font-bold text-white">Cover-Stitching</p>
                <p className="text-[11px] text-neutral-400">Reinforced bar-tack joints and twin-needle binding across stress seams.</p>
              </div>

              <div className="p-5 bg-[#262629] border border-white/10 rounded-2xl space-y-2">
                <Layers className="w-5 h-5 text-[#B91C1C] mb-2" />
                <p className="font-bold text-white">Custom Dye Vats</p>
                <p className="text-[11px] text-neutral-400">Garment over-dyed in small batches with low-impact natural pigments.</p>
              </div>

              <div className="p-5 bg-[#262629] border border-white/10 rounded-2xl space-y-2">
                <ShieldCheck className="w-5 h-5 text-[#B91C1C] mb-2" />
                <p className="font-bold text-white">Raw Hardware</p>
                <p className="text-[11px] text-neutral-400">Solid antiqued brass eyelets and custom engraved copper shank rivets.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 5. SECTION: THE BOLT ⚡ PROMISE */}
      {/* ========================================================= */}
      <section className="py-20 sm:py-28 px-6 sm:px-12 bg-[#1A1B1D]">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-12 items-start">
          <div className="md:col-span-4 font-mono text-xs uppercase tracking-widest text-neutral-400 space-y-2 sticky top-28">
            <span className="text-amber-400 block font-bold flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              Chapter 03
            </span>
            <h2 className="text-xl font-bold uppercase tracking-tight text-white font-sans">
              The Bolt ⚡ Promise
            </h2>
            <p className="text-[11px] text-neutral-400 lowercase font-mono">
              why the future of luxury shopping happens at your door
            </p>
          </div>

          <div className="md:col-span-8 space-y-6 text-sm sm:text-base font-light text-neutral-300 leading-relaxed font-sans">
            <p className="text-lg sm:text-xl text-white font-serif italic border-l-2 border-amber-400 pl-4">
              &ldquo;You should never have to pay full price for clothes you have never touched, or wait two weeks for a return refund.&rdquo;
            </p>

            <p>
              Traditional online shopping forces creators to guess their sizes, authorize huge sums on credit cards, and spend their weekends packing boxes for return shipping.
            </p>

            <p>
              With <strong>Bolt ⚡ Doorstep Try-On</strong>, we inverted this broken model. We bring the luxury boutique dressing room directly to your home. Select up to 5 curated silhouettes for a nominal ₹99 hold. A dedicated courier delivers during your designated 2-hour IST window.
            </p>

            <p>
              You receive 45 private minutes to examine the drape, verify the fit under your home lighting, and pair the garment with your existing wardrobe. What doesn’t work goes immediately back into the transit vehicle. What you love is paid for on the spot via instant UPI QR code.
            </p>

            {/* Metro Fleet Dispatches */}
            <div className="p-6 bg-[#262629] border border-white/10 rounded-2xl space-y-4 font-mono text-xs mt-6 shadow-xl">
              <div className="flex items-center gap-2 text-white font-bold uppercase tracking-wider">
                <MapPin className="w-4 h-4 text-[#B91C1C]" />
                <span>Active White-Glove Fleet Hubs (India)</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px] text-neutral-300">
                <div className="p-3 bg-[#1A1B1D] border border-white/10 rounded-xl">
                  <p className="font-bold text-white">Bengaluru</p>
                  <p className="text-[10px] text-neutral-400">Indiranagar • Koramangala • HSR</p>
                </div>
                <div className="p-3 bg-[#1A1B1D] border border-white/10 rounded-xl">
                  <p className="font-bold text-white">Mumbai</p>
                  <p className="text-[10px] text-neutral-400">Bandra • Colaba • BKC</p>
                </div>
                <div className="p-3 bg-[#1A1B1D] border border-white/10 rounded-xl">
                  <p className="font-bold text-white">Delhi NCR</p>
                  <p className="text-[10px] text-neutral-400">South Delhi • Gurugram</p>
                </div>
                <div className="p-3 bg-[#1A1B1D] border border-white/10 rounded-xl">
                  <p className="font-bold text-white">Hyderabad</p>
                  <p className="text-[10px] text-neutral-400">Jubilee Hills • Hitec City</p>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="pt-6">
              <Link
                href="/shop"
                style={{ color: '#ffffff', backgroundColor: '#09090b' }}
                className="btn-dark inline-flex items-center gap-2.5 px-8 py-4 hover:bg-[#27272A] dark:hover:bg-[#4A4B50] font-mono text-xs uppercase tracking-widest font-bold rounded-full border border-neutral-800 dark:border-white/15 shadow-xl transition-all duration-300 group cursor-pointer"
              >
                <Zap className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span style={{ color: '#ffffff' }}>Experience Bolt ⚡ Doorstep Try-On</span>
                <ArrowRight style={{ color: '#ffffff' }} className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
