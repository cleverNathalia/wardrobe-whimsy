import { Pressable, Text } from 'react-native'
import { useAuth } from '@clerk/expo'
import { Stack } from 'expo-router'
import { colours } from '@/lib/theme'

export default function AppLayout() {
  const { signOut } = useAuth()

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colours.background },
        headerTintColor: colours.foreground,
        headerTitleStyle: { fontFamily: 'Newsreader_500Medium', fontSize: 22 },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colours.background },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Your wardrobe',
          headerRight: () => (
            <Pressable onPress={() => signOut()} accessibilityRole="button" hitSlop={12}>
              <Text className="font-sans-medium text-sm text-muted-foreground">Sign out</Text>
            </Pressable>
          ),
        }}
      />
      <Stack.Screen name="items/[id]" options={{ title: '' }} />
    </Stack>
  )
}
