import Nav from '@/components/Nav'
import Footer from '@/components/Footer'

export default function PrivacyPage() {
  return (
    <main>
      <Nav />

      <section className="bg-charcoal py-16 px-4 text-center">
        <div className="max-w-2xl mx-auto">
          <h1 className="font-serif text-4xl text-white mb-3">Privacy Policy</h1>
          <p className="text-gray-400 text-sm">Last updated: March 2026</p>
        </div>
      </section>

      <section className="bg-cream py-16 px-4">
        <div className="max-w-2xl mx-auto">

          <h2 className="font-serif text-2xl text-charcoal mb-4">What we collect</h2>
          <p className="text-gray-600 leading-relaxed mb-5">
            When you create an account or subscribe, we collect your email address, name, and zip
            code. We use this to send you newsletters and school updates relevant to your area.
          </p>
          <p className="text-gray-600 leading-relaxed mb-5">
            We collect basic usage data (pages visited, features used) to understand how to
            improve the product. We do not sell this data to anyone.
          </p>

          <h2 className="font-serif text-2xl text-charcoal mb-4 mt-10">What we do not do</h2>
          <ul className="flex flex-col gap-3 mb-8">
            {[
              'We do not sell your personal information to third parties.',
              'We do not run advertising or share data with ad networks.',
              'We do not use your email for anything other than EarlyScouts communications.',
            ].map((item) => (
              <li key={item} className="text-gray-600 text-sm leading-relaxed flex items-start gap-2">
                <span className="text-scout-green shrink-0 mt-0.5">&#10003;</span>
                {item}
              </li>
            ))}
          </ul>

          <h2 className="font-serif text-2xl text-charcoal mb-4 mt-10">Payments</h2>
          <p className="text-gray-600 leading-relaxed mb-5">
            Payments are processed by Stripe. We do not store credit card numbers. Stripe&apos;s
            privacy policy governs how your payment data is handled.
          </p>

          <h2 className="font-serif text-2xl text-charcoal mb-4 mt-10">Contact</h2>
          <p className="text-gray-600 leading-relaxed">
            Questions about your data? Email us at{' '}
            <a href="mailto:hello@earlyscouts.com" className="text-scout-green hover:underline">
              hello@earlyscouts.com
            </a>
            .
          </p>

        </div>
      </section>

      <Footer />
    </main>
  )
}
