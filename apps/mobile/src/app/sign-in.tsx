import { useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useSSO } from '@clerk/expo'
import * as AuthSession from 'expo-auth-session'
import * as WebBrowser from 'expo-web-browser'

// Lets the in-app browser hand the Google sign-in result back to the app.
WebBrowser.maybeCompleteAuthSession()

export default function SignInScreen() {
  const { startSSOFlow } = useSSO()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Android opens the sign-in browser noticeably faster when warmed up first.
  useEffect(() => {
    void WebBrowser.warmUpAsync()
    return () => {
      void WebBrowser.coolDownAsync()
    }
  }, [])

  const signIn = async () => {
    setBusy(true)
    setError(null)
    try {
      // Google in an in-app browser, through the same Clerk app as the
      // website, so it is the same account and the same wardrobe.
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: 'oauth_google',
        redirectUrl: AuthSession.makeRedirectUri(),
      })
      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId })
      } else {
        // Cancelled, or Clerk needs more than Google gave it (e.g. a sign-up
        // step the app does not handle yet).
        setError("Sign-in didn't finish. Try again, or sign up on the website first.")
      }
    } catch (err) {
      console.error('[sign-in]', err)
      setError('Something went wrong signing in. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 justify-center px-6">
        <Text className="font-serif text-4xl text-foreground">Wardrobe Whimsy</Text>
        <Text className="mt-2 font-sans text-base text-muted-foreground">
          Your wardrobe, outfits and looks — on your phone.
        </Text>

        <Pressable
          onPress={signIn}
          disabled={busy}
          accessibilityRole="button"
          className="mt-10 min-h-12 flex-row items-center justify-center rounded-lg bg-primary px-4 active:opacity-80"
        >
          {busy ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="font-sans-semibold text-base text-primary-foreground">Continue with Google</Text>
          )}
        </Pressable>

        {error && <Text className="mt-4 font-sans text-sm text-destructive">{error}</Text>}
      </View>
    </SafeAreaView>
  )
}
