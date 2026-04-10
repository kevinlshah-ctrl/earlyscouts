import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="bg-charcoal text-gray-300">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {/* Col 1: Brand */}
          <div className="flex flex-col gap-4">
            <div>
              <span className="font-serif text-2xl text-white">Early</span>
              <span className="font-serif text-2xl text-scout-green">Scouts</span>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">
              For parents who plan ahead.
            </p>
            <a
              href="mailto:hello@earlyscouts.com"
              className="text-sm text-scout-green hover:text-mint transition-colors"
            >
              hello@earlyscouts.com
            </a>
            <p className="text-xs text-gray-500">Made in Los Angeles</p>
          </div>

          {/* Col 2: Navigate */}
          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-mono uppercase tracking-widest text-gray-500 mb-1">
              Navigate
            </h4>
            <Link href="/schools" className="text-sm text-gray-300 hover:text-white transition-colors">
              Schools
            </Link>
            <Link href="/guides" className="text-sm text-gray-300 hover:text-white transition-colors">
              Guides
            </Link>
            <Link href="/pricing" className="text-sm text-gray-300 hover:text-white transition-colors">
              Pricing
            </Link>
          </div>

          {/* Col 3: Company */}
          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-mono uppercase tracking-widest text-gray-500 mb-1">
              Company
            </h4>
            <Link href="/pricing" className="text-sm text-gray-300 hover:text-white transition-colors">
              Pricing
            </Link>
            <Link href="/about" className="text-sm text-gray-300 hover:text-white transition-colors">
              About
            </Link>
            <Link href="/contact" className="text-sm text-gray-300 hover:text-white transition-colors">
              Contact
            </Link>
            <Link href="/privacy" className="text-sm text-gray-300 hover:text-white transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-sm text-gray-300 hover:text-white transition-colors">
              Terms of Use
            </Link>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-gray-700 mt-10 pt-6 text-center">
          <p className="text-xs text-gray-500">
            2026 EarlyScouts. For parents who plan ahead.
          </p>
        </div>
      </div>
    </footer>
  )
}
