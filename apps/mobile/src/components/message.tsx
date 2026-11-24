import { Pressable, Text, View } from 'react-native'

interface MessageProps {
  title: string
  body: string
  action?: { label: string; onPress: () => void }
}

/** A centred explanation for empty, error and not-yet-connected states. */
export function Message({ title, body, action }: MessageProps) {
  return (
    <View className="flex-1 items-center justify-center px-8">
      <Text className="text-center font-serif text-2xl text-foreground">{title}</Text>
      <Text className="mt-2 text-center font-sans text-sm text-muted-foreground">{body}</Text>
      {action && (
        <Pressable
          onPress={action.onPress}
          accessibilityRole="button"
          className="mt-6 min-h-12 justify-center rounded-lg bg-primary px-5 active:opacity-80"
        >
          <Text className="font-sans-semibold text-sm text-primary-foreground">{action.label}</Text>
        </Pressable>
      )}
    </View>
  )
}
