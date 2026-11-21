'use client'

import React, { useState } from 'react'
import { Check, Mail } from 'lucide-react'

export function NewsletterStrip() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setSubmitted(true)
    setEmail('')
    setTimeout(() => setSubmitted(false), 4000)
  }

  return (
    <section className="bg-white border-t border-[#d3d6db] py-16 px-4 sm:px-6 lg:px-8 text-center font-sans">
      <div className="max-w-xl mx-auto space-y-4">
        <span className="text-xs font-sans font-bold uppercase tracking-[0.2em] text-[#b91c1c] block">
          NEWSLETTER
        </span>
        <h3 className="font-sans text-2xl sm:text-3xl font-bold tracking-tight text-[#14293a]">
          Join the Newsletter
        </h3>
        <p className="text-xs sm:text-sm text-[#6c7079] leading-relaxed">
          Receive updates on new collections, exclusive seasonal drops, and express delivery offers.
        </p>

        {submitted ? (
          <div className="p-3 bg-[#ecfdf5] border border-[#a7f3d0] rounded-sm text-xs font-semibold text-[#065f46] max-w-md mx-auto flex items-center justify-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>Thank you for subscribing to our newsletter.</span>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2 max-w-md mx-auto"
          >
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              className="w-full sm:flex-1 px-4 py-2.5 text-xs font-sans border border-[#d3d6db] rounded-sm focus:outline-none focus:border-[#14293a] bg-[#f8f8f8]"
            />
            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-2.5 bg-[#14293a] hover:bg-[#b91c1c] text-white text-xs font-sans font-bold uppercase tracking-wider rounded-sm transition-colors cursor-pointer shrink-0"
            >
              Subscribe
            </button>
          </form>
        )}

        <div className="pt-2 flex items-center justify-center gap-4 text-[11px] text-[#8a909a]">
          <span className="inline-flex items-center gap-1">
            <Check className="w-3 h-3 text-[#059669]" />
            No spam guarantee
          </span>
          <span>&bull;</span>
          <span className="inline-flex items-center gap-1">
            <Check className="w-3 h-3 text-[#059669]" />
            Unsubscribe anytime
          </span>
        </div>
      </div>
    </section>
  )
}
