import '../../global.css'

import { ClerkProvider, useAuth } from '@clerk/expo'
import { tokenCache } from '@clerk/expo/token-cache'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useFonts, Newsreader_500Medium } from '@expo-google-fonts/newsreader'
import { Figtree_400Regular, Figtree_500Medium, Figtree_600SemiBold } from '@expo-google-fonts/figtree'

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY
if (!publishableKey) {
  throw new Error('EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY is not set. Copy apps/mobile/.env.example to .env.local.')
}

export default function RootLayout() {
  // The same faces as the web app: Newsreader for headings, Figtree for text.
  const [fontsLoaded] = useFonts({ Newsreader_500Medium, Figtree_400Regular, Figtree_500Medium, Figtree_600SemiBold })
  if (!fontsLoaded) return null

  return (
    // tokenCache keeps the session in the device's secure storage, so the
    // user stays signed in between launches.
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <StatusBar style="dark" />
      <RootStack />
    </ClerkProvider>
  )
}

/** Signed out, only sign-in is reachable; signed in, only the app. */
function RootStack() {
  const { isLoaded, isSignedIn } = useAuth()
  if (!isLoaded) return null

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!!isSignedIn}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={!isSignedIn}>
        <Stack.Screen name="sign-in" />
      </Stack.Protected>
    </Stack>
  )
}
