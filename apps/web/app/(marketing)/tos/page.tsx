import type { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

/**
 * Terms and privacy live on one page because Google's OAuth consent screen asks
 * for both and this app is small enough that splitting them would mean two
 * near-empty documents.
 *
 * This address is published publicly and is where deletion requests arrive, so
 * it needs to stay a monitored inbox.
 */
const CONTACT_EMAIL = 'daniellemybackup1@gmail.com'

const LAST_UPDATED = '18 September 2026'

export const metadata: Metadata = {
  title: 'Terms & Privacy · Wardrobe Whimsy',
  description: 'The terms of service and privacy policy for Wardrobe Whimsy.',
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="font-serif text-2xl font-medium text-foreground mb-3">{title}</h2>
      <div className="space-y-3 text-muted-foreground leading-relaxed">{children}</div>
    </section>
  )
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-10 bg-background/86 backdrop-blur border-b border-border">
        <div className="max-w-[var(--container-max)] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-1 select-none">
            <span className="font-serif text-lg font-medium text-primary">Wardrobe</span>
            <span className="font-serif text-lg font-medium text-foreground">Whimsy</span>
          </Link>
          <Button variant="outline" size="sm" asChild>
            <Link href="/">Back to home</Link>
          </Button>
        </div>
      </header>

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 sm:px-6 py-16 space-y-12">
        <div>
          <h1 className="font-serif text-4xl font-medium text-foreground mb-3">Terms &amp; Privacy</h1>
          <p className="text-muted-foreground">
            This page covers both the terms of service and the privacy policy for Wardrobe Whimsy.
          </p>
          <p className="text-xs text-muted-foreground mt-4">Last updated {LAST_UPDATED}</p>
        </div>

        <Section id="summary" title="The short version">
          <p>
            Wardrobe Whimsy helps you catalogue your clothes, build outfits, and track what you wear.
            Your photos are stored in your own Google Drive, not on our servers. We keep the
            descriptions and dates that make the app work, we do not sell anything to anyone, and you
            can ask for all of it to be deleted at any time.
          </p>
        </Section>

        <Section id="terms" title="Terms of service">
          <p>
            <strong className="text-foreground">Using the app.</strong> You need an account to use
            Wardrobe Whimsy. You are responsible for what you upload and for keeping your sign-in
            details to yourself. Please only upload photos you have the right to use.
          </p>
          <p>
            <strong className="text-foreground">Availability.</strong> The app is provided as-is,
            without any guarantee that it will be available, error-free, or that data will never be
            lost. It is a personal project rather than a commercial service, so please keep your own
            copies of anything you would be upset to lose.
          </p>
          <p>
            <strong className="text-foreground">Your content stays yours.</strong> We claim no
            ownership of your photos or of anything you write in the app. You grant only the access
            needed to display your own content back to you.
          </p>
          <p>
            <strong className="text-foreground">Ending your use.</strong> You can stop using the app
            and request deletion at any time. We may suspend accounts that are being used to break
            the law or to harm other people.
          </p>
          <p>
            <strong className="text-foreground">Changes.</strong> These terms may change as the app
            develops. The date at the top shows when they were last revised.
          </p>
        </Section>

        <Section id="privacy" title="Privacy policy">
          <p>
            <strong className="text-foreground">What we store, and where.</strong> Your photographs
            are uploaded to a folder called <em>Wardrobe Whimsy</em> in your own Google Drive. They
            stay in your Drive, owned by you, and count against your own storage. We keep a
            reference to each file so the app can display it back to you.
          </p>
          <p>
            Everything else — the names, colours, categories, outfits, worn-on dates and notes you
            enter — is stored in a database we operate, hosted in the United States.
          </p>
          <p>
            <strong className="text-foreground">Your Google account.</strong> Signing in is handled
            by Clerk, our authentication provider, which stores your email address. When you connect
            Google Drive we ask only for the <code className="text-xs">drive.file</code> permission,
            which grants access solely to files this app itself creates. We cannot see, open, or
            list any other file in your Drive. To keep that connection working between visits we
            store Google&apos;s access token against your account.
          </p>
          <p>
            <strong className="text-foreground">What we do not do.</strong> We do not sell your
            data, share it with advertisers, or use your photos to train machine-learning models. We
            do not use advertising or tracking cookies.
          </p>
          <p>
            <strong className="text-foreground">Who else is involved.</strong> The app relies on a
            few services to run: Clerk for sign-in, Neon for the database, Vercel for hosting, and
            Google Drive for your photos. Each only receives what it needs to do its job.
          </p>
          <p>
            <strong className="text-foreground">Your choices.</strong> You can disconnect Google
            Drive at any time from the Settings page, or revoke access from your{' '}
            <a
              href="https://myaccount.google.com/permissions"
              target="_blank"
              rel="noreferrer"
              className="text-primary underline underline-offset-2"
            >
              Google account permissions
            </a>
            . Disconnecting stops the app reaching your photos; it does not delete them from your
            Drive, because they are yours. To have your account and stored details deleted, email us
            at the address below.
          </p>
          <p>
            <strong className="text-foreground">Children.</strong> Wardrobe Whimsy is not intended
            for children under 13, and we do not knowingly collect their information.
          </p>
        </Section>

        <Section id="contact" title="Contact">
          <p>
            Questions about these terms, or a request to delete your data? Email{' '}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-primary underline underline-offset-2"
            >
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </Section>
      </main>

      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Wardrobe Whimsy
      </footer>
    </div>
  )
}
