import Nav from '@/components/Nav'
import Footer from '@/components/Footer'

export default function ContactPage() {
  return (
    <main>
      <Nav />

      <section className="bg-charcoal py-20 px-4 text-center">
        <div className="max-w-2xl mx-auto">
          <h1 className="font-serif text-4xl sm:text-5xl text-white mb-4">
            Say hello.
          </h1>
          <p className="text-gray-400 text-lg">
            We read every email.
          </p>
        </div>
      </section>

      <section className="bg-cream py-20 px-4">
        <div className="max-w-xl mx-auto text-center">
          <p className="text-gray-600 leading-relaxed mb-8">
            Questions about a school report? Suggestions for a neighborhood we should cover?
            Found something we got wrong? We want to hear it.
          </p>

          <a
            href="mailto:hello@earlyscouts.com"
            className="inline-block bg-scout-green text-white font-semibold px-8 py-4 rounded-full hover:bg-scout-green-dark transition-colors text-lg"
          >
            hello@earlyscouts.com
          </a>

          <p className="text-gray-400 text-sm mt-8">
            We typically respond within 24 hours on weekdays.
          </p>
        </div>
      </section>

      <Footer />
    </main>
  )
}
