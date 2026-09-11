import Image, { type ImageProps } from 'next/image'

/** Sources the browser must fetch itself, because the optimiser cannot load them. */
function requiresDirectFetch(src: ImageProps['src']): boolean {
  if (typeof src !== 'string') return false

  // /api/drive/image/* is gated by requireUser(). The Next image optimiser
  // fetches sources server-side with no cookies, so it gets a 401 and turns
  // that into a 400 for the browser.
  //
  // blob: previews only exist in the page that created them, and data: URIs
  // carry their own bytes, so the optimiser cannot resolve either.
  return src.startsWith('/api/drive/image/') || src.startsWith('blob:') || src.startsWith('data:')
}

/**
 * next/image, but transparently unoptimised for sources the optimiser cannot
 * reach. Remote images (demo fixtures, Google Photos thumbnails) still go
 * through it as normal.
 *
 * Drive images are already resized to 1600px on upload by resizeAndUploadImage,
 * so little is lost by serving them directly.
 */
export function AppImage({ src, alt, unoptimized, ...rest }: ImageProps) {
  return <Image src={src} alt={alt} unoptimized={unoptimized ?? requiresDirectFetch(src)} {...rest} />
}
