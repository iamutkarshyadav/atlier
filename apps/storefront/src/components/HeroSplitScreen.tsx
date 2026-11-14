'use client'

import React, { useRef, useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'

export function HeroSplitScreen() {
  const containerRef = useRef<HTMLElement>(null)
  const [mounted, setMounted] = useState(false)

  // Gentle, calm, micro-parallax cursor coordinates (normalized -0.5 to 0.5)
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  // High damping for calm, buttery, grounded movement — zero disorientation
  const smoothX = useSpring(mouseX, { damping: 50, stiffness: 90 })
  const smoothY = useSpring(mouseY, { damping: 50, stiffness: 90 })

  // Very gentle micro-shift: max ±4px on typography, max ±3px on portrait
  const contentShiftX = useTransform(smoothX, [-0.5, 0.5], [-4, 4])
  const contentShiftY = useTransform(smoothY, [-0.5, 0.5], [-3, 3])
  const imageShiftX = useTransform(smoothX, [-0.5, 0.5], [3, -3])

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    mouseX.set((e.clientX - rect.left) / rect.width - 0.5)
    mouseY.set((e.clientY - rect.top) / rect.height - 0.5)
  }

  const handleMouseLeave = () => {
    mouseX.set(0)
    mouseY.set(0)
  }

  return (
    <section
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative w-full min-h-screen flex flex-col md:flex-row bg-white dark:bg-[#121214] text-neutral-900 dark:text-white overflow-hidden select-none transition-colors duration-200"
    >
      {/* ========================================================= */}
      {/* LEFT PANE: 50% Female Haute Couture Editorial Portrait   */}
      {/* ========================================================= */}
      <div className="relative w-full md:w-1/2 h-[60vh] sm:h-[70vh] md:h-screen bg-black overflow-hidden shrink-0">
        <motion.div
          style={{ x: mounted ? imageShiftX : 0 }}
          className="relative w-full h-full"
        >
          <Image
            src="/images/hero-woman.jpg"
            alt="Maison Tg • The Grace Atelier - Female Haute Couture Silhouette"
            fill
            priority
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover object-top md:object-center filter grayscale contrast-110 brightness-95"
          />
        </motion.div>

        {/* Subtle Right Vignette Gradient for Seamless Desktop Blend */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-black/30 hidden md:block pointer-events-none" />
      </div>

      {/* ========================================================= */}
      {/* RIGHT PANE: Signature Typographic Lockup & Minimal CTA    */}
      {/* ========================================================= */}
      <div className="relative w-full md:w-1/2 min-h-[55vh] md:h-screen bg-white dark:bg-[#121214] text-neutral-900 dark:text-white flex flex-col justify-center px-8 sm:px-14 lg:px-18 xl:px-24 py-16 md:py-0 transition-colors duration-200">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          style={{
            x: mounted ? contentShiftX : 0,
            y: mounted ? contentShiftY : 0,
          }}
          className="max-w-xl space-y-6 sm:space-y-8 my-auto pt-10 md:pt-0"
        >
          {/* ======================================================= */}
          {/* SIGNATURE TYPOGRAPHIC LOCKUP                            */}
          {/* [FOR] [THE Real] [WOMAN IN] [YOU]                       */}
          {/* ======================================================= */}
          <div className="relative inline-block select-none">
            <div className="flex items-center gap-2 sm:gap-3.5 md:gap-4">
              {/* "FOR" - Rotated -90° vertically on the left */}
              <div className="flex items-center justify-center shrink-0 pr-1">
                <span
                  className="text-neutral-900 dark:text-neutral-300 font-sans font-black tracking-[0.28em] text-xs sm:text-sm md:text-base uppercase select-none inline-block -rotate-90 origin-center"
                  style={{ transformOrigin: 'center center' }}
                >
                  FOR
                </span>
              </div>

              {/* Main Headline Stack */}
              <div className="flex flex-col">
                {/* Top Row: "THE" (Crimson Sans) + "Real" (Cursive Script) */}
                <div className="flex items-baseline gap-2.5 sm:gap-3 leading-none">
                  <span className="font-sans font-black text-[#b91c1c] text-3xl sm:text-4xl md:text-5xl lg:text-[46px] tracking-tight uppercase">
                    THE
                  </span>
                  <span className="font-script text-neutral-950 dark:text-white text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-normal tracking-wide transform -translate-y-1">
                    Real
                  </span>
                </div>

                {/* Bottom Row: "WOMAN" (Monumental Bold Sans) + "IN" (Vertical on Right) */}
                <div className="relative flex items-center leading-none mt-1 sm:mt-2">
                  <span className="font-sans font-black text-neutral-950 dark:text-white text-4xl sm:text-6xl md:text-7xl lg:text-[76px] xl:text-[84px] tracking-tight uppercase">
                    WOMAN
                  </span>

                  {/* "IN" - Rotated -90° vertically next to WOMAN */}
                  <div className="absolute -right-6 sm:-right-8 md:-right-10 top-1/2 -translate-y-1/2 flex items-center justify-center">
                    <span
                      className="text-neutral-900 dark:text-neutral-300 font-sans font-black tracking-[0.2em] text-[10px] sm:text-xs md:text-sm uppercase select-none inline-block -rotate-90 origin-center"
                      style={{ transformOrigin: 'center center' }}
                    >
                      IN
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* "YOU" - Faded underneath on the right */}
            <div className="flex justify-end pr-2 -mt-1 sm:-mt-2">
              <span className="font-sans font-black text-neutral-400 dark:text-neutral-600 text-3xl sm:text-5xl md:text-6xl lg:text-7xl tracking-tight uppercase leading-none select-none">
                YOU
              </span>
            </div>
          </div>

          {/* Subtext: High-contrast, perfectly balanced typography across both themes */}
          <div className="max-w-md pt-1 space-y-1">
            <p className="text-xs sm:text-sm md:text-[14px] font-sans font-normal text-neutral-600 dark:text-neutral-400 leading-relaxed tracking-normal">
              Choose from our most luxurious collections and experience
            </p>
            <p className="text-xs sm:text-sm md:text-[14px] font-sans font-bold italic uppercase text-neutral-950 dark:text-white tracking-wide">
              THE ROYAL LOOK &amp; FEEL.
            </p>
          </div>

          {/* Minimal Pill CTA: "Order Now" (Exact match with reference) */}
          <div className="pt-2 sm:pt-4">
            <Link
              href="/shop"
              className="hero-cta-btn inline-flex items-center justify-center px-10 sm:px-12 py-3 sm:py-3.5 rounded-full bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 hover:bg-neutral-800 dark:hover:bg-neutral-200 font-sans text-xs sm:text-sm font-semibold tracking-wider uppercase transition-all duration-300 shadow-md hover:shadow-[0_12px_32px_-4px_rgba(220,38,38,0.5),0_4px_14px_-2px_rgba(185,28,28,0.35)] active:scale-95 cursor-pointer"
            >
              Order Now
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
