import type { Metadata } from 'next'
import './globals.css'
import { Suspense } from 'react'
import { AuthProvider } from '@/lib/auth-context'
import { UTMCapture } from '@/components/UTMCapture'

export const metadata: Metadata = {
  title: 'EarlyScouts - For parents who plan ahead.',
  description: 'Comprehensive school research for families on the LA Westside. Deep Dive reports, feeder maps, and enrollment guides. For parents who plan ahead.',
  metadataBase: new URL('https://earlyscouts.com'),
  openGraph: {
    title: 'EarlyScouts',
    description: 'For parents who plan ahead.',
    url: 'https://earlyscouts.com',
    siteName: 'EarlyScouts',
    locale: 'en_US',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:ital,opsz,wght@0,9..40,300..700;1,9..40,300..700&family=DM+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-cream text-charcoal antialiased">
        <AuthProvider>
          <Suspense fallback={null}>
            <UTMCapture />
          </Suspense>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
