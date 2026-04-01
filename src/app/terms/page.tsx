import Nav from '@/components/Nav'
import Footer from '@/components/Footer'

export default function TermsPage() {
  return (
    <main>
      <Nav />

      <section className="bg-charcoal py-16 px-4 text-center">
        <div className="max-w-2xl mx-auto">
          <h1 className="font-serif text-4xl text-white mb-3">Terms of Service</h1>
          <p className="text-gray-400 text-sm">Last updated: March 2026</p>
        </div>
      </section>

      <section className="bg-cream py-16 px-4">
        <div className="max-w-2xl mx-auto">

          <h2 className="font-serif text-2xl text-charcoal mb-4">Using EarlyScouts</h2>
          <p className="text-gray-600 leading-relaxed mb-5">
            EarlyScouts is a research and information service for families. By using our site and
            subscribing to our newsletters, you agree to use the content for personal,
            non-commercial purposes only.
          </p>

          <h2 className="font-serif text-2xl text-charcoal mb-4 mt-10">Content accuracy</h2>
          <p className="text-gray-600 leading-relaxed mb-5">
            We work hard to keep school data, enrollment dates, and ratings accurate, but
            information can change. Always verify important decisions (enrollment deadlines, tour
            dates, permit eligibility) directly with the school or district. EarlyScouts is a
            research aid, not a substitute for official school communications.
          </p>

          <h2 className="font-serif text-2xl text-charcoal mb-4 mt-10">Subscriptions</h2>
          <p className="text-gray-600 leading-relaxed mb-5">
            Paid subscriptions renew automatically unless cancelled. You can manage or cancel
            your subscription at any time from your account page. Refunds are available within
            7 days of purchase if you are not satisfied.
          </p>

          <h2 className="font-serif text-2xl text-charcoal mb-4 mt-10">Intellectual property</h2>
          <p className="text-gray-600 leading-relaxed mb-5">
            School reports, newsletter content, and site copy are the property of EarlyScouts.
            You may not reproduce, redistribute, or republish our content without written
            permission.
          </p>

          <h2 className="font-serif text-2xl text-charcoal mb-4 mt-10">Contact</h2>
          <p className="text-gray-600 leading-relaxed">
            Questions about these terms? Email{' '}
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
