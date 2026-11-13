'use client'

import React from 'react'
import Image from 'next/image'
import Link from 'next/link'

export function HeroSplitScreen() {
  return (
    <section className="relative w-full min-h-screen flex flex-col md:flex-row bg-[#212121] overflow-hidden select-none">
      {/* ========================================================= */}
      {/* LEFT PANE (VISUAL): 50% Black & White Gentleman Model     */}
      {/* ========================================================= */}
      <div className="relative w-full md:w-1/2 h-[60vh] sm:h-[70vh] md:h-screen bg-black overflow-hidden shrink-0">
        <Image
          src="/images/hero-gentleman.jpg"
          alt="Royal Gentleman Attire - Tailored Black Suit"
          fill
          priority
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover object-top md:object-center filter grayscale contrast-125 brightness-95"
        />

        {/* Subtle Right Vignette Gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-black/30 hidden md:block pointer-events-none" />
      </div>

      {/* ========================================================= */}
      {/* RIGHT PANE (CONTENT): Dark Charcoal Background & Headline  */}
      {/* ========================================================= */}
      <div className="relative w-full md:w-1/2 min-h-[55vh] md:h-screen bg-[#212121] text-white flex flex-col justify-center px-6 sm:px-12 lg:px-16 xl:px-20 py-16 md:py-0">
        <div className="max-w-xl space-y-6 sm:space-y-8 my-auto pt-8 md:pt-0">
          {/* Complex Heading Lockup */}
          <div className="relative inline-block select-none">
            <div className="flex items-center gap-2 sm:gap-3.5 md:gap-4">
              {/* "FOR" - rotated vertically on the left */}
              <div className="flex items-center justify-center shrink-0 pr-1">
                <span
                  className="text-[#45464a] font-sans font-black tracking-[0.28em] text-xs sm:text-sm md:text-base uppercase select-none inline-block -rotate-90 origin-center"
                  style={{ transformOrigin: 'center center' }}
                >
                  FOR
                </span>
              </div>

              {/* Main Headline Stack */}
              <div className="flex flex-col">
                {/* Top Row: "THE" (red sans-serif) + "Real" (elegant script) */}
                <div className="flex items-baseline gap-2 sm:gap-3 leading-none">
                  <span className="font-sans font-black text-[#b91c1c] text-2xl sm:text-3xl md:text-4xl lg:text-[42px] tracking-tight uppercase">
                    THE
                  </span>
                  <span className="font-script text-neutral-950 dark:text-white text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-normal tracking-wide transform -translate-y-0.5 sm:-translate-y-1">
                    Real
                  </span>
                </div>

                {/* Bottom Row: "GENTLEMAN" (bold, large sans) + "IN" (vertical on right) */}
                <div className="relative flex items-center leading-none mt-1 sm:mt-1.5">
                  <span className="font-sans font-black text-neutral-950 dark:text-white text-3xl sm:text-5xl md:text-6xl lg:text-[68px] xl:text-[76px] tracking-tight uppercase">
                    GENTLEMAN
                  </span>

                  {/* "IN" - rotated vertically next to GENTLEMAN */}
                  <div className="absolute -right-6 sm:-right-8 md:-right-10 top-1/2 -translate-y-1/2 flex items-center justify-center">
                    <span
                      className="text-[#3a3b3e] font-sans font-black tracking-[0.2em] text-[10px] sm:text-xs md:text-sm uppercase select-none inline-block -rotate-90 origin-center"
                      style={{ transformOrigin: 'center center' }}
                    >
                      IN
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* "YOU" - faded, underneath on the right */}
            <div className="flex justify-end pr-1 sm:pr-2 -mt-1 sm:-mt-2">
              <span className="font-sans font-black text-[#323336] text-3xl sm:text-4xl md:text-5xl lg:text-6xl tracking-tight uppercase leading-none select-none">
                YOU
              </span>
            </div>
          </div>

          {/* Subtext */}
          <p className="text-xs sm:text-sm md:text-[15px] text-[#8e8e93] font-sans font-light leading-relaxed max-w-md">
            Choose from our most luxurious collections and experience{' '}
            <span className="italic font-normal text-[#d1d1d6]">THE ROYAL LOOK &amp; FEEL.</span>
          </p>

          {/* Call to Action: Pill-shaped "Order Now" button */}
          <div className="pt-2 sm:pt-4">
            <Link
              href="/shop"
              style={{ color: '#ffffff', backgroundColor: '#09090b' }}
              className="btn-dark inline-flex items-center justify-center px-8 sm:px-10 py-3 sm:py-3.5 rounded-full hover:bg-[#27272A] dark:hover:bg-[#4a4b50] font-medium text-xs sm:text-sm tracking-wide transition-all duration-200 shadow-md hover:shadow-lg active:scale-95 cursor-pointer"
            >
              <span style={{ color: '#ffffff' }} className="font-semibold tracking-wider">
                Order Now
              </span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

