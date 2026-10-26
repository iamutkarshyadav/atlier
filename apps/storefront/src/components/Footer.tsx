import React from 'react'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'

export function Footer() {
  return (
    <footer className="mt-32 border-t border-black bg-black text-white pt-20 pb-16 px-6 sm:px-12">
      <div className="mx-auto max-w-7xl space-y-16">
        {/* Top: Atelier Manifesto & Newsletter */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          <div className="lg:col-span-7 space-y-6">
            <span className="text-3xl sm:text-4xl font-black tracking-[0.15em] block text-white uppercase">
              ATELIER
            </span>
            <p className="text-sm sm:text-base text-neutral-400 max-w-xl font-light leading-relaxed">
              An independent creator apparel label. Engineered in strictly limited size allocations with custom 480 GSM French Terry, 14oz Japanese raw selvedge denim, and zero synthetic polyester blending.
            </p>
            <div className="pt-2 text-xs uppercase font-mono text-[#166534] flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#166534]" />
              <span>Limited Units Per Size Run • Never Mass Produced</span>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-4">
            <span className="text-xs uppercase font-mono font-bold text-white block">
              DROP 02 EARLY ACCESS
            </span>
            <p className="text-xs text-neutral-400 font-light leading-relaxed">
              Subscribers receive private early access passwords 1 hour prior to public drop release.
            </p>
            <form className="flex items-center border-b border-neutral-700 focus-within:border-[#166534] transition-colors pt-2">
              <input
                type="email"
                placeholder="creator@domain.com"
                className="w-full bg-transparent py-2.5 text-xs text-white placeholder:text-neutral-500 focus:outline-none font-mono"
                required
              />
              <button
                type="submit"
                className="text-xs uppercase font-bold text-[#166534] hover:text-white transition-colors shrink-0 pl-3 font-mono"
              >
                SUBSCRIBE →
              </button>
            </form>
          </div>
        </div>

        {/* Middle: Atelier Details & Quick Navigation */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 pt-12 border-t border-neutral-900 text-xs">
          <div className="space-y-3">
            <h4 className="text-[10px] uppercase font-mono text-neutral-500 font-bold">
              Production Atelier
            </h4>
            <p className="text-neutral-400 leading-relaxed font-light font-mono">
              Tokyo • Los Angeles<br />
              Custom Cut & Sew Mills<br />
              <span className="text-[10px] text-[#166534]">Heavyweight Japanese Textiles</span>
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="text-[10px] uppercase font-mono text-neutral-500 font-bold">
              Current Drop
            </h4>
            <p className="text-neutral-400 leading-relaxed font-light font-mono">
              Drop 01 • Heavyweights<br />
              Hoodies, Tees, Denim & Outerwear<br />
              <span className="text-[10px] text-neutral-300">All Sizes Allocated</span>
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="text-[10px] uppercase font-mono text-neutral-500 font-bold">
              Apparel Categories
            </h4>
            <ul className="space-y-2 text-neutral-400 font-mono">
              <li><Link href="/?category=hoodies#collection" className="hover:text-white transition-colors">Hoodies & Fleece</Link></li>
              <li><Link href="/?category=tees#collection" className="hover:text-white transition-colors">Tees & Tops</Link></li>
              <li><Link href="/?category=outerwear#collection" className="hover:text-white transition-colors">Outerwear & Flight Bombers</Link></li>
              <li><Link href="/?category=pants#collection" className="hover:text-white transition-colors">Pants & Selvedge Denim</Link></li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="text-[10px] uppercase font-mono text-neutral-500 font-bold">
              Creator Support
            </h4>
            <ul className="space-y-2 text-neutral-400 font-mono">
              <li><Link href="/cart" className="hover:text-white transition-colors">Shopping Bag</Link></li>
              <li><Link href="/orders" className="hover:text-white transition-colors">My Orders</Link></li>
              <li><span className="text-neutral-500">support@atelier.com</span></li>
            </ul>
          </div>
        </div>

        {/* Bottom: Legal & Copyright */}
        <div className="pt-8 border-t border-neutral-800 flex flex-col sm:flex-row justify-between items-start sm:items-center text-[10px] tracking-widest uppercase text-neutral-400 gap-4">
          <p>© {new Date().getFullYear()} ATELIER. All Rights Reserved.</p>
          <div className="flex gap-6">
            <span className="hover:text-[#166534] cursor-pointer transition-colors">Terms of Sale</span>
            <span className="hover:text-[#166534] cursor-pointer transition-colors">Worldwide Shipping</span>
            <span className="hover:text-[#166534] cursor-pointer transition-colors">Fabric Lab Care</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
