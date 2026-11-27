import type { Metadata } from 'next'
import localFont from 'next/font/local'
import { ClerkProvider } from '@clerk/nextjs'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

/*
 * The fonts ship with the app (app/fonts, latin subset, SIL Open Font
 * Licence) rather than coming from next/font/google. Fetching them from
 * Google during the build failed often enough on Vercel to break deploys.
 * Figtree and Newsreader are variable fonts, so one file covers every weight.
 */
const newsreader = localFont({
  src: [
    { path: './fonts/newsreader-latin-wght-normal.woff2', weight: '200 800', style: 'normal' },
    { path: './fonts/newsreader-latin-wght-italic.woff2', weight: '200 800', style: 'italic' },
  ],
  variable: '--font-newsreader',
  display: 'swap',
  adjustFontFallback: 'Times New Roman',
})

const figtree = localFont({
  src: './fonts/figtree-latin-wght-normal.woff2',
  weight: '300 900',
  variable: '--font-figtree',
  display: 'swap',
})

const ibmPlexMono = localFont({
  src: [
    { path: './fonts/ibm-plex-mono-latin-400-normal.woff2', weight: '400', style: 'normal' },
    { path: './fonts/ibm-plex-mono-latin-500-normal.woff2', weight: '500', style: 'normal' },
  ],
  variable: '--font-plex-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Wardrobe Whimsy',
  description: 'Your personal wardrobe and outfit organiser.',
}

const fontClasses = [newsreader.variable, figtree.variable, ibmPlexMono.variable].join(' ')

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" className={fontClasses}>
        <body suppressHydrationWarning>
          {children}
          <Toaster richColors position="bottom-right" />
        </body>
      </html>
    </ClerkProvider>
  )
}
