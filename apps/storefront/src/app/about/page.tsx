import React from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowRight,
  ShieldCheck,
  Scissors,
  Layers,
  MapPin,
  Sparkles,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'About Us • Maison Tg • The Grace Atelier',
  description:
    'The story of The Grace Atelier: architectural creator apparel engineered from 480 GSM French Terry and Japanese raw selvedge denim, coupled with private doorstep salon fitting.',
}

export default function AboutBrandPage() {
  return (
    <div className="bg-white text-[#14293a] selection:bg-[#b91c1c] selection:text-white min-h-screen font-sans pb-16">
      {/* ========================================================= */}
      {/* 1. STANDARDIZED PAGE HEADER & BREADCRUMBS                 */}
      {/* ========================================================= */}
      <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-2">
        {/* Row 1: Breadcrumb */}
        <nav className="text-xs text-[#6c7079] mb-2 font-sans" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-[#14293a] transition-colors">Home</Link>
          <span> / </span>
          <span className="text-[#14293a]">About Us</span>
        </nav>

        {/* Row 2: Single Flex Bar */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#e5e7eb] pb-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#14293a] tracking-tight">
              About Us
            </h1>
            <div className="text-xs text-[#6c7079] mt-1 flex items-center gap-2">
              <span>Textile craftsmanship &amp; 45-minute doorstep try-on</span>
              <span>·</span>
              <span>Established 2024 · Bengaluru</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. SECTION: CHAPTER 01 — PROVENANCE */}
      {/* ========================================================= */}
      <section className="py-8 sm:py-12 px-4 sm:px-6 lg:px-8 max-w-[1320px] mx-auto border-b border-[#d3d6db]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-4 space-y-1 lg:sticky lg:top-28">
            <h2 className="text-lg font-bold text-[#14293a]">
              Raw Material Integrity
            </h2>
          </div>

          <div className="lg:col-span-8 space-y-6 text-sm text-[#14293a] leading-relaxed">
            <blockquote className="text-sm sm:text-base text-[#14293a] font-medium border-l-2 border-[#b91c1c] pl-4 py-1 leading-snug">
              &ldquo;Modern apparel was broken by the spreadsheet. Fabrics were thinned, synthetic plastics were blended into cotton, and returns were treated as trash.&rdquo;
            </blockquote>

            <p className="text-[#6c7079]">
              Maison Tg was established as a direct rebellion against disposable luxury. We observed that contemporary labels charged exorbitant sums for 220 GSM blended cotton that deformed after three washes. Our mission was straightforward: engineer clothing with the permanence of stone and timber.
            </p>

            <p className="text-[#6c7079]">
              Every garment in our collection begins with raw, unadulterated natural fiber. We partner directly with historic knitting mills in Wakayama, Japan, where loopwheel machines rotate at a sluggish 24 revolutions per minute, allowing tensionless loops of cotton to form naturally without mechanical strain.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-[#e5e7eb] text-xs">
              <div className="bg-[#f8f8f8] border border-[#d3d6db] p-4 rounded-sm">
                <p className="text-[#14293a] font-bold text-xs uppercase tracking-wider">Zero Synthetics</p>
                <p className="text-[#6c7079] mt-1 leading-relaxed">
                  100% biodegradable single-origin organic cotton and raw selvedge yarns. Zero microplastics, zero polyester.
                </p>
              </div>
              <div className="bg-[#f8f8f8] border border-[#d3d6db] p-4 rounded-sm">
                <p className="text-[#14293a] font-bold text-xs uppercase tracking-wider">Strict Allocations</p>
                <p className="text-[#6c7079] mt-1 leading-relaxed">
                  Under 150 pieces per size run worldwide. Hand-inspected and individually serialized. Never mass produced.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 3. FULL-WIDTH EDITORIAL IMAGE BANNER */}
      {/* ========================================================= */}
      <section className="relative w-full h-[40vh] sm:h-[48vh] overflow-hidden bg-[#14293a]">
        <Image
          src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=2000&q=85"
          alt="Atelier Fashion Editorial Spread"
          fill
          priority
          className="object-cover object-center"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />

        <div className="absolute bottom-8 left-4 sm:left-8 right-4 sm:right-8 max-w-[1320px] mx-auto flex flex-col sm:flex-row sm:items-end justify-between gap-3 text-white">
          <div className="space-y-1">
            <h3 className="text-xl sm:text-2xl font-bold text-white">
              Form follows textile.
            </h3>
          </div>
          <p className="text-xs text-neutral-300 max-w-sm">
            Captured on 35mm film at the Wakayama Loopwheel Mill, Kansai Prefecture, Japan.
          </p>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 4. SECTION: CHAPTER 02 — ARCHITECTURE & CRAFTSMANSHIP */}
      {/* ========================================================= */}
      <section className="py-8 sm:py-12 px-4 sm:px-6 lg:px-8 max-w-[1320px] mx-auto border-b border-[#d3d6db]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-4 space-y-1 lg:sticky lg:top-28">
            <h2 className="text-lg font-bold text-[#14293a]">
              Artisanal Craftsmanship
            </h2>
          </div>

          <div className="lg:col-span-8 space-y-6 text-sm text-[#14293a] leading-relaxed">
            <p className="text-[#6c7079]">
              Our signature hoodies weigh a formidable <strong className="text-[#14293a]">480 grams per square meter (GSM)</strong>. To achieve this density, our French Terry is knitted using 3-end fleece yarns with combed exterior faces that resist wind penetration while remaining cloud-soft against the skin.
            </p>

            <p className="text-[#6c7079]">
              Our denim is woven exclusively in Kojima, Okayama on vintage 1960s Toyoda shuttle looms. We weave 14.5oz raw selvedge denim using deep rope-dyed indigo yarns that develop distinct high-contrast fading patterns unique to your everyday posture and movements.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-xs">
              <div className="p-4 bg-[#f8f8f8] border border-[#d3d6db] space-y-2 rounded-sm">
                <Scissors className="w-4 h-4 text-[#b91c1c]" />
                <p className="font-bold text-[#14293a] text-xs uppercase tracking-wider">Cover-Stitching</p>
                <p className="text-[#6c7079] leading-relaxed">
                  Reinforced bar-tack joints and twin-needle binding across high-stress seams.
                </p>
              </div>

              <div className="p-4 bg-[#f8f8f8] border border-[#d3d6db] space-y-2 rounded-sm">
                <Layers className="w-4 h-4 text-[#b91c1c]" />
                <p className="font-bold text-[#14293a] text-xs uppercase tracking-wider">Custom Dye Vats</p>
                <p className="text-[#6c7079] leading-relaxed">
                  Garment over-dyed in small batches with low-impact, rich mineral pigments.
                </p>
              </div>

              <div className="p-4 bg-[#f8f8f8] border border-[#d3d6db] space-y-2 rounded-sm">
                <ShieldCheck className="w-4 h-4 text-[#b91c1c]" />
                <p className="font-bold text-[#14293a] text-xs uppercase tracking-wider">Raw Hardware</p>
                <p className="text-[#6c7079] leading-relaxed">
                  Solid antiqued brass eyelets and custom engraved copper shank rivets.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 5. SECTION: CHAPTER 03 — DOORSTEP SALON */}
      {/* ========================================================= */}
      <section className="py-8 sm:py-12 px-4 sm:px-6 lg:px-8 max-w-[1320px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-4 space-y-1 lg:sticky lg:top-28">
            <h2 className="text-lg font-bold text-[#14293a]">
              The Private Fitting
            </h2>
          </div>

          <div className="lg:col-span-8 space-y-6 text-sm text-[#14293a] leading-relaxed">
            <blockquote className="text-sm sm:text-base text-[#14293a] font-medium border-l-2 border-[#b91c1c] pl-4 py-1 leading-snug">
              &ldquo;You should never have to pay upfront for garments you have never touched, or wait two weeks for a return refund.&rdquo;
            </blockquote>

            <p className="text-[#6c7079]">
              Traditional online shopping forces patrons to guess sizes, authorize large sums on cards, and spend weekends packing return boxes.
            </p>

            <p className="text-[#6c7079]">
              With our <strong className="text-[#14293a]">Doorstep Try-On Salon</strong>, we bring the private luxury boutique fitting room directly to your residence. Select up to 5 curated silhouettes for a nominal ₹99 hold. A dedicated white-glove courier delivers during your selected 2-hour IST window.
            </p>

            <p className="text-[#6c7079]">
              You receive 45 private minutes to examine drape, verify proportions under personal lighting, and pair garments with your existing wardrobe. What does not suit you is returned immediately to the transit courier. What you retain is paid for seamlessly on the spot via instant UPI.
            </p>

            {/* Metro Fleet Hubs */}
            <div className="p-5 bg-[#f8f8f8] border border-[#d3d6db] space-y-4 text-xs rounded-sm">
              <div className="flex items-center gap-1.5 text-[#14293a] font-bold uppercase tracking-wider">
                <MapPin className="w-4 h-4 text-[#b91c1c]" />
                <span>Active White-Glove Fleet Hubs</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-white border border-[#d3d6db] rounded-sm">
                  <p className="font-bold text-[#14293a]">Bengaluru</p>
                  <p className="text-[11px] text-[#6c7079] mt-0.5">Indiranagar • Koramangala • HSR</p>
                </div>
                <div className="p-3 bg-white border border-[#d3d6db] rounded-sm">
                  <p className="font-bold text-[#14293a]">Mumbai</p>
                  <p className="text-[11px] text-[#6c7079] mt-0.5">Bandra • Colaba • BKC</p>
                </div>
                <div className="p-3 bg-white border border-[#d3d6db] rounded-sm">
                  <p className="font-bold text-[#14293a]">Delhi NCR</p>
                  <p className="text-[11px] text-[#6c7079] mt-0.5">South Delhi • Gurugram</p>
                </div>
                <div className="p-3 bg-white border border-[#d3d6db] rounded-sm">
                  <p className="font-bold text-[#14293a]">Hyderabad</p>
                  <p className="text-[11px] text-[#6c7079] mt-0.5">Jubilee Hills • Hitec City</p>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <Link
                href="/shop"
                className="bg-[#14293a] text-white hover:bg-[#b91c1c] px-6 py-3 text-xs uppercase tracking-wider font-bold rounded-sm transition-colors inline-flex items-center gap-2 cursor-pointer shadow-sm"
              >
                <span>Explore Shop Collections</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
