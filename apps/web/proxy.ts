import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse, type NextFetchEvent, type NextRequest } from 'next/server'

const isProtectedRoute = createRouteMatcher(['/dashboard(.*)', '/wardrobe(.*)', '/outfits(.*)', '/settings(.*)'])

const authenticatedProxy = clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect()
  }
})

export default function proxy(req: NextRequest, event: NextFetchEvent) {
  // Avoid invoking Clerk at all in demo mode because it validates its key
  // before running the middleware callback.
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return NextResponse.next()
  }

  return authenticatedProxy(req, event)
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
