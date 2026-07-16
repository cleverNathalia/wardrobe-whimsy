import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isProtectedRoute = createRouteMatcher(['/dashboard(.*)', '/wardrobe(.*)', '/outfits(.*)', '/settings(.*)'])

export default clerkMiddleware(async (auth, req) => {
  // In demo mode (no Clerk key), skip all auth — pages handle their own fallback
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) return

  if (isProtectedRoute(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
