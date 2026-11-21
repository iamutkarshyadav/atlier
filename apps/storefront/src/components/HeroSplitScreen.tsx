'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'

export interface HeroSlide {
  id: string
  tagline: string
  title: string
  description: string
  image: string
  primaryCtaLabel: string
  primaryCtaHref: string
  secondaryCtaLabel: string
  secondaryCtaHref: string
}

export const HERO_SLIDES: HeroSlide[] = [
  {
    id: 'slide-1',
    tagline: 'PERMANENT COLLECTION • 2026 ARCHIVE',
    title: 'Heavyweight Boxy Fleece & Tailored Drape',
    description:
      'Custom-milled 480 GSM organic cotton loopback French Terry. Engineered with architectural dropped shoulders and double-layered hoods.',
    image: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=1800&q=85',
    primaryCtaLabel: 'Shop Hoodies & Fleece',
    primaryCtaHref: '/shop?category=Hoodies%20%26%20Fleece',
    secondaryCtaLabel: 'Explore Lookbook',
    secondaryCtaHref: '/about',
  },
  {
    id: 'slide-2',
    tagline: 'SHUTTLE-LOOMED IN OKAYAMA, JAPAN',
    title: '14oz Raw Selvedge Denim & Pleated Trousers',
    description:
      'Woven on vintage shuttle looms with distinctive pink selvedge line ID. Double front pleats falling into a clean, structured wide leg.',
    image: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=1800&q=85',
    primaryCtaLabel: 'Explore Denim & Pants',
    primaryCtaHref: '/shop?category=Pants%20%26%20Denim',
    secondaryCtaLabel: 'Denim Specifications',
    secondaryCtaHref: '/about',
  },
  {
    id: 'slide-3',
    tagline: 'WEATHERPROOF TECHNICAL CRAFT',
    title: 'Cropped Flight Bombers & Sculptural Coats',
    description:
      'High-density technical nylon shell with Primaloft thermal insulation. Numbered archive release limited to 60 pieces worldwide.',
    image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=1800&q=85',
    primaryCtaLabel: 'View Outerwear',
    primaryCtaHref: '/shop?category=Outerwear%20%26%20Jackets',
    secondaryCtaLabel: 'Numbered Archive',
    secondaryCtaHref: '/about',
  },
]

export function HeroSplitScreen({ slides = HERO_SLIDES }: { slides?: HeroSlide[] }) {
  const activeSlides = slides && slides.length > 0 ? slides : HERO_SLIDES
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)

  // Auto-advance hero carousel every 6.5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlideIndex((prev) => (prev + 1) % activeSlides.length)
    }, 6500)
    return () => clearInterval(timer)
  }, [activeSlides.length])

  const nextSlide = () => {
    setCurrentSlideIndex((prev) => (prev + 1) % activeSlides.length)
  }

  const prevSlide = () => {
    setCurrentSlideIndex((prev) => (prev - 1 + activeSlides.length) % activeSlides.length)
  }

  const activeSlide = activeSlides[currentSlideIndex] || activeSlides[0]!

  return (
    <section className="bg-white text-[#14293a] font-sans">
      {/* ========================================================= */}
      {/* 1. HERO BANNER CAROUSEL (1320px Framed Container)         */}
      {/* ========================================================= */}
      <div className="relative w-full overflow-hidden bg-white">
        <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="relative aspect-[16/10] sm:aspect-[21/9] min-h-[380px] sm:min-h-[460px] md:min-h-[500px] w-full overflow-hidden rounded-sm bg-[#14293a] shadow-sm">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSlide.id}
                initial={{ opacity: 0, scale: 1.02 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, ease: 'easeInOut' }}
                className="relative w-full h-full"
              >
                <Image
                  src={activeSlide.image}
                  alt={activeSlide.title}
                  fill
                  priority
                  className="object-cover object-center"
                  sizes="(max-width: 1320px) 100vw, 1320px"
                />

                {/* Soft gradient overlay for high contrast readability */}
                <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent sm:w-3/5" />

                {/* Slide Content Box */}
                <div className="absolute inset-0 flex flex-col justify-center px-6 sm:px-12 md:px-16 text-white max-w-xl z-10 space-y-3 sm:space-y-4">
                  <span className="inline-block text-[11px] font-sans font-bold uppercase tracking-[0.2em] text-[#fca5a5]">
                    {activeSlide.tagline}
                  </span>

                  <h1 className="font-sans text-2xl sm:text-4xl md:text-5xl font-black leading-tight tracking-tight text-white">
                    {activeSlide.title}
                  </h1>

                  <p className="text-xs sm:text-sm text-neutral-200 line-clamp-2 sm:line-clamp-3 leading-relaxed">
                    {activeSlide.description}
                  </p>

                  <div className="pt-2 flex flex-wrap items-center gap-3">
                    <Link
                      href={activeSlide.primaryCtaHref}
                      className="px-5 py-2.5 bg-white text-[#14293a] hover:bg-[#14293a] hover:text-white transition-all text-xs font-sans font-bold uppercase tracking-wider rounded-sm shadow-md flex items-center gap-1.5"
                    >
                      <span>{activeSlide.primaryCtaLabel}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>

                    {activeSlide.secondaryCtaLabel && (
                      <Link
                        href={activeSlide.secondaryCtaHref}
                        className="px-4 py-2.5 bg-black/40 hover:bg-black/60 border border-white/50 text-white transition-colors text-xs font-sans font-semibold uppercase tracking-wider rounded-sm backdrop-blur-sm flex items-center gap-1.5"
                      >
                        <span>{activeSlide.secondaryCtaLabel}</span>
                      </Link>
                    )}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Carousel Navigation Arrows */}
            <button
              onClick={prevSlide}
              aria-label="Previous slide"
              className="absolute left-3 top-1/2 -translate-y-1/2 p-2 bg-white/85 hover:bg-white text-[#14293a] rounded-full shadow transition-all z-20 cursor-pointer border border-[#d3d6db]"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={nextSlide}
              aria-label="Next slide"
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-white/85 hover:bg-white text-[#14293a] rounded-full shadow transition-all z-20 cursor-pointer border border-[#d3d6db]"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Slide Pagination Dots */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20">
              {activeSlides.map((slide, idx) => (
                <button
                  key={slide.id}
                  onClick={() => setCurrentSlideIndex(idx)}
                  className={`h-2 rounded-full transition-all cursor-pointer ${
                    currentSlideIndex === idx ? 'w-6 bg-white' : 'w-2 bg-white/50 hover:bg-white/80'
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export const HeroBannerCarousel = HeroSplitScreen
