import Nav from '@/components/Nav'
import Footer from '@/components/Footer'

export default function TermsPage() {
  return (
    <main className="bg-[#FFFAF6]">
      <Nav />

      <section className="bg-[#1A1A2E] py-16 px-4 text-center">
        <div className="max-w-2xl mx-auto">
          <h1 className="font-serif text-4xl text-white mb-3">Terms of Use &amp; Editorial Disclaimer</h1>
          <p className="text-gray-400 text-sm">Last updated: April 2026</p>
        </div>
      </section>

      <section className="bg-[#FFFAF6] py-14 px-4">
        <div className="max-w-2xl mx-auto flex flex-col gap-10">

          <div>
            <h2 className="font-serif text-xl text-[#1A1A2E] mb-3">1 — About EarlyScouts</h2>
            <p className="text-[#4A4743] leading-relaxed text-sm">
              EarlyScouts is an independent editorial platform that researches and synthesizes publicly
              available information to help families navigate school choice in Los Angeles and surrounding
              communities. We are not affiliated with, endorsed by, or sponsored by any school, school
              district, or government agency.
            </p>
          </div>

          <div>
            <h2 className="font-serif text-xl text-[#1A1A2E] mb-3">2 — Nature of Our Content</h2>
            <p className="text-[#4A4743] leading-relaxed text-sm">
              All school reports, transfer guides, and playbooks published on EarlyScouts represent our
              independent editorial assessment of publicly available data, including publicly reported test
              scores, enrollment statistics, district policies, and parent-reported experiences published
              on third-party platforms.
            </p>
            <p className="text-[#4A4743] leading-relaxed text-sm mt-3">
              Our &ldquo;Scout Take&rdquo; sections and editorial commentary represent opinion, not statements of
              fact. They are clearly labeled as such. Nothing on this site constitutes professional
              educational, legal, financial, or psychological advice.
            </p>
          </div>

          <div>
            <h2 className="font-serif text-xl text-[#1A1A2E] mb-3">3 — Third-Party Reviews and Parent Feedback</h2>
            <p className="text-[#4A4743] leading-relaxed text-sm">
              Where EarlyScouts references parent experiences or community sentiment, we are synthesizing
              themes from publicly available reviews published on third-party platforms (including but not
              limited to Niche, GreatSchools, Movoto, Trulia, and Yelp). We do not reproduce verbatim
              reviews. We do not verify the accuracy of individual reviews. Synthesized summaries reflect
              general themes observed across multiple sources and represent our editorial interpretation,
              not factual claims about any specific individual, incident, or school.
            </p>
          </div>

          <div>
            <h2 className="font-serif text-xl text-[#1A1A2E] mb-3">4 — No Warranty of Accuracy</h2>
            <p className="text-[#4A4743] leading-relaxed text-sm">
              School data changes frequently. Test scores, enrollment figures, program offerings, staff,
              enrollment deadlines, and contact information may change after publication. EarlyScouts
              makes no warranty, express or implied, that any information on this site is current,
              complete, or accurate. We strongly encourage users to verify all information directly with
              the relevant school or district before making any enrollment decision.
            </p>
          </div>

          <div>
            <h2 className="font-serif text-xl text-[#1A1A2E] mb-3">5 — No Endorsement or Disparagement</h2>
            <p className="text-[#4A4743] leading-relaxed text-sm">
              EarlyScouts does not endorse any school, program, or district, nor do we intend to
              disparage any school, educator, or community. Our editorial opinions are formed
              independently based on publicly available information and are offered solely to help
              families make more informed decisions. Honest assessment of publicly available data
              — including concerns raised by other families — is a core part of our editorial mission.
            </p>
          </div>

          <div>
            <h2 className="font-serif text-xl text-[#1A1A2E] mb-3">6 — Limitation of Liability</h2>
            <p className="text-[#4A4743] leading-relaxed text-sm">
              To the fullest extent permitted by applicable law, EarlyScouts and its operators shall not
              be liable for any direct, indirect, incidental, or consequential damages arising from your
              use of or reliance on content published on this site. Your use of EarlyScouts is at your
              own discretion and risk. EarlyScouts is a research and information tool — all final
              enrollment decisions rest solely with the user.
            </p>
          </div>

          <div>
            <h2 className="font-serif text-xl text-[#1A1A2E] mb-3">7 — Intellectual Property</h2>
            <p className="text-[#4A4743] leading-relaxed text-sm">
              All original content on EarlyScouts — including school reports, playbooks, editorial
              analysis, and site copy — is the intellectual property of EarlyScouts. You may not
              reproduce, republish, scrape, or redistribute our content without written permission.
            </p>
          </div>

          <div>
            <h2 className="font-serif text-xl text-[#1A1A2E] mb-3">8 — Paid Content and Refunds</h2>
            <p className="text-[#4A4743] leading-relaxed text-sm">
              EarlyScouts offers both free and paid content tiers. All purchases are final. Because our
              reports and guides are digital content delivered immediately upon purchase, we do not offer
              refunds. If you experience a technical issue preventing access to purchased content, contact
              us at{' '}
              <a href="mailto:hello@earlyscouts.com" className="text-[#5B9A6F] hover:underline">
                hello@earlyscouts.com
              </a>{' '}
              and we will resolve it.
            </p>
          </div>

          <div>
            <h2 className="font-serif text-xl text-[#1A1A2E] mb-3">9 — Contact</h2>
            <p className="text-[#4A4743] leading-relaxed text-sm">
              Questions about these terms or our editorial approach can be directed to:{' '}
              <a href="mailto:hello@earlyscouts.com" className="text-[#5B9A6F] hover:underline">
                hello@earlyscouts.com
              </a>
            </p>
          </div>

        </div>
      </section>

      <Footer />
    </main>
  )
}
