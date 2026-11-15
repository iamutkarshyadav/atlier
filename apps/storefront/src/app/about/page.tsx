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
  title: 'About Us • The Grace Atelier',
  description:
    'The story of The Grace Atelier: architectural creator apparel engineered from 480 GSM French Terry and Japanese raw selvedge denim, coupled with private doorstep salon fitting.',
}

export default function AboutBrandPage() {
  return (
    <div className="bg-[#FDFCF7] text-[#09090B] selection:bg-[#B91C1C] selection:text-white min-h-screen">
      {/* ========================================================= */}
      {/* 1. EDITORIAL HEADER */}
      {/* ========================================================= */}
      <section className="relative px-6 sm:px-12 pt-28 pb-12 sm:pb-16 border-b border-[#E8E4DA] bg-[#FAF8F2]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-3">
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black uppercase tracking-tight text-[#09090B] font-display">
              ABOUT <span className="text-[#B91C1C]">US</span>
            </h1>
            <p className="text-sm sm:text-base text-[#52525B] max-w-2xl font-sans leading-relaxed">
              We construct clothing the way brutalist architects erect monoliths: prioritizing raw material integrity, deliberate proportions, and uncompromising permanence.
            </p>
          </div>

          <div className="hidden md:flex items-center gap-3 font-mono text-xs uppercase tracking-widest text-[#71717A]">
            <span className="w-2 h-2 rounded-full bg-[#B91C1C]" />
            <span>Atelier Archive • Established 2024</span>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 2. SECTION: CHAPTER 01 — PROVENANCE */}
      {/* ========================================================= */}
      <section className="py-16 sm:py-24 px-6 sm:px-12 max-w-7xl mx-auto border-b border-[#E8E4DA]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          <div className="lg:col-span-4 font-mono text-xs uppercase tracking-widest space-y-2 lg:sticky lg:top-28">
            <span className="text-[#B91C1C] font-bold block">01 / PROVENANCE</span>
            <h2 className="text-2xl font-bold uppercase tracking-tight text-[#09090B] font-sans">
              Raw Material Integrity
            </h2>
          </div>

          <div className="lg:col-span-8 space-y-8 text-base text-[#27272A] leading-relaxed font-sans">
            <blockquote className="text-xl sm:text-2xl text-[#09090B] font-serif italic border-l-2 border-[#B91C1C] pl-6 py-1 leading-snug">
              &ldquo;Modern apparel was broken by the spreadsheet. Fabrics were thinned, synthetic plastics were blended into cotton, and returns were treated as trash.&rdquo;
            </blockquote>

            <p className="text-[#3F3F46]">
              Atelier was established as a direct rebellion against disposable luxury. We observed that contemporary labels charged exorbitant sums for 220 GSM blended cotton that deformed after three washes. Our mission was straightforward: engineer clothing with the permanence of stone and timber.
            </p>

            <p className="text-[#3F3F46]">
              Every garment in our collection begins with raw, unadulterated fiber. We partner directly with historic knitting mills in Wakayama, Japan, where loopwheel machines rotate at a sluggish 24 revolutions per minute, allowing tensionless loops of cotton to form naturally without mechanical strain.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 border-t border-[#E8E4DA] font-mono text-xs">
              <div className="bg-[#FAF8F2] border border-[#E8E4DA] p-5">
                <p className="text-[#09090B] font-bold text-sm uppercase tracking-wider">Zero Synthetics</p>
                <p className="text-[#52525B] mt-2 leading-relaxed">
                  100% biodegradable single-origin organic cotton and raw selvedge yarns. Zero microplastics, zero synthetic elastane.
                </p>
              </div>
              <div className="bg-[#FAF8F2] border border-[#E8E4DA] p-5">
                <p className="text-[#09090B] font-bold text-sm uppercase tracking-wider">Strict Allocations</p>
                <p className="text-[#52525B] mt-2 leading-relaxed">
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
      <section className="relative w-full h-[55vh] sm:h-[70vh] overflow-hidden bg-[#09090B]">
        <Image
          src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=2000&q=85"
          alt="Atelier Fashion Editorial Spread"
          fill
          priority
          className="object-cover object-center filter grayscale contrast-125 brightness-90"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-[#09090B]/90 via-black/20 to-transparent" />

        <div className="absolute bottom-10 left-6 sm:left-12 right-6 sm:right-12 max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-end justify-between gap-4 text-white">
          <div className="space-y-1">
            <span className="text-[11px] font-mono uppercase tracking-[0.25em] text-[#B91C1C] font-bold block">
              EDITORIAL ARCHIVE // 35MM FILM
            </span>
            <h3 className="text-2xl sm:text-4xl font-light uppercase font-sans tracking-tight text-white">
              Form follows textile.
            </h3>
          </div>
          <p className="text-xs font-mono text-neutral-300 max-w-sm">
            Captured on 35mm film at the Wakayama Loopwheel Mill, Kansai Prefecture, Japan.
          </p>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 4. SECTION: CHAPTER 02 — ARCHITECTURE & CRAFTSMANSHIP */}
      {/* ========================================================= */}
      <section className="py-16 sm:py-24 px-6 sm:px-12 max-w-7xl mx-auto border-b border-[#E8E4DA]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          <div className="lg:col-span-4 font-mono text-xs uppercase tracking-widest space-y-2 lg:sticky lg:top-28">
            <span className="text-[#B91C1C] font-bold block">02 / ARCHITECTURE</span>
            <h2 className="text-2xl font-bold uppercase tracking-tight text-[#09090B] font-sans">
              Artisanal Craftsmanship
            </h2>
          </div>

          <div className="lg:col-span-8 space-y-8 text-base text-[#27272A] leading-relaxed font-sans">
            <p className="text-[#3F3F46]">
              Our signature hoodies weigh a formidable <strong className="text-[#09090B]">480 grams per square meter (GSM)</strong>. To achieve this density, our French Terry is knitted using 3-end fleece yarns with combed exterior faces that resist wind penetration while remaining cloud-soft against the skin.
            </p>

            <p className="text-[#3F3F46]">
              Our denim is woven exclusively in Kojima, Okayama on vintage 1960s Toyoda shuttle looms. We weave 14.5oz raw selvedge denim using deep rope-dyed indigo yarns that develop distinct high-contrast fading patterns unique to your everyday posture and movements.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 pt-4 font-mono text-xs">
              <div className="p-6 bg-[#FAF8F2] border border-[#E8E4DA] space-y-3">
                <Scissors className="w-5 h-5 text-[#B91C1C]" />
                <p className="font-bold text-[#09090B] text-sm uppercase tracking-wider">Cover-Stitching</p>
                <p className="text-[#52525B] leading-relaxed">
                  Reinforced bar-tack joints and twin-needle binding across high-stress seams.
                </p>
              </div>

              <div className="p-6 bg-[#FAF8F2] border border-[#E8E4DA] space-y-3">
                <Layers className="w-5 h-5 text-[#B91C1C]" />
                <p className="font-bold text-[#09090B] text-sm uppercase tracking-wider">Custom Dye Vats</p>
                <p className="text-[#52525B] leading-relaxed">
                  Garment over-dyed in small batches with low-impact, rich mineral pigments.
                </p>
              </div>

              <div className="p-6 bg-[#FAF8F2] border border-[#E8E4DA] space-y-3">
                <ShieldCheck className="w-5 h-5 text-[#B91C1C]" />
                <p className="font-bold text-[#09090B] text-sm uppercase tracking-wider">Raw Hardware</p>
                <p className="text-[#52525B] leading-relaxed">
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
      <section className="py-16 sm:py-24 px-6 sm:px-12 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          <div className="lg:col-span-4 font-mono text-xs uppercase tracking-widest space-y-2 lg:sticky lg:top-28">
            <span className="text-[#B91C1C] font-bold block">03 / DOORSTEP SALON</span>
            <h2 className="text-2xl font-bold uppercase tracking-tight text-[#09090B] font-sans">
              The Private Fitting
            </h2>
          </div>

          <div className="lg:col-span-8 space-y-8 text-base text-[#27272A] leading-relaxed font-sans">
            <blockquote className="text-xl sm:text-2xl text-[#09090B] font-serif italic border-l-2 border-[#B91C1C] pl-6 py-1 leading-snug">
              &ldquo;You should never have to pay upfront for garments you have never touched, or wait two weeks for a return refund.&rdquo;
            </blockquote>

            <p className="text-[#3F3F46]">
              Traditional online shopping forces patrons to guess sizes, authorize large sums on cards, and spend weekends packing return boxes.
            </p>

            <p className="text-[#3F3F46]">
              With our <strong className="text-[#09090B]">Doorstep Try-On Salon</strong>, we bring the private luxury boutique fitting room directly to your residence. Select up to 5 curated silhouettes for a nominal ₹99 hold. A dedicated white-glove courier delivers during your selected 2-hour IST window.
            </p>

            <p className="text-[#3F3F46]">
              You receive 45 private minutes to examine drape, verify proportions under personal lighting, and pair garments with your existing wardrobe. What does not suit you is returned immediately to the transit courier. What you retain is paid for seamlessly on the spot via instant UPI.
            </p>

            {/* Metro Fleet Hubs */}
            <div className="p-6 bg-[#FAF8F2] border border-[#E8E4DA] space-y-5 font-mono text-xs">
              <div className="flex items-center gap-2 text-[#09090B] font-bold uppercase tracking-wider">
                <MapPin className="w-4 h-4 text-[#B91C1C]" />
                <span>Active White-Glove Fleet Hubs</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div className="p-4 bg-[#FDFCF7] border border-[#E8E4DA]">
                  <p className="font-bold text-[#09090B] text-sm">Bengaluru</p>
                  <p className="text-[11px] text-[#71717A] mt-1">Indiranagar • Koramangala • HSR</p>
                </div>
                <div className="p-4 bg-[#FDFCF7] border border-[#E8E4DA]">
                  <p className="font-bold text-[#09090B] text-sm">Mumbai</p>
                  <p className="text-[11px] text-[#71717A] mt-1">Bandra • Colaba • BKC</p>
                </div>
                <div className="p-4 bg-[#FDFCF7] border border-[#E8E4DA]">
                  <p className="font-bold text-[#09090B] text-sm">Delhi NCR</p>
                  <p className="text-[11px] text-[#71717A] mt-1">South Delhi • Gurugram</p>
                </div>
                <div className="p-4 bg-[#FDFCF7] border border-[#E8E4DA]">
                  <p className="font-bold text-[#09090B] text-sm">Hyderabad</p>
                  <p className="text-[11px] text-[#71717A] mt-1">Jubilee Hills • Hitec City</p>
                </div>
              </div>
            </div>

            {/* Minimalist Luxury CTA */}
            <div className="pt-4">
              <Link
                href="/shop"
                className="bg-[#09090B] text-white hover:bg-[#1A1A1A] hover:shadow-[0_4px_24px_rgba(185,28,28,0.35)] px-8 py-4 font-mono text-xs uppercase tracking-widest font-bold rounded-none transition-all duration-300 inline-flex items-center gap-3 cursor-pointer"
              >
                <span>Explore Shop Collections</span>
                <ArrowRight className="w-4 h-4 text-[#B91C1C]" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
