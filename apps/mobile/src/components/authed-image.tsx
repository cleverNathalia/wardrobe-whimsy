import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/expo'
import { Image, type ImageProps } from 'expo-image'
import { apiUrl } from '@/lib/api'

type AuthedImageProps = Omit<ImageProps, 'source'> & {
  /** An API-relative image path, e.g. "/api/drive/image/abc". */
  path: string
}

/**
 * Photos live in the user's Google Drive and are served through the web app,
 * which checks who is asking — so, like any other API call, the request has
 * to carry the user's token.
 *
 * Cached by path rather than by URL + token: the token changes every minute,
 * the photo behind a path never does.
 */
export function AuthedImage({ path, ...props }: AuthedImageProps) {
  const { getToken } = useAuth()
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    void getToken().then((value) => {
      if (live) setToken(value)
    })
    return () => {
      live = false
    }
  }, [getToken])

  return (
    <Image
      {...props}
      source={token ? { uri: apiUrl(path), headers: { Authorization: `Bearer ${token}` }, cacheKey: path } : null}
      cachePolicy="disk"
      transition={150}
    />
  )
}
