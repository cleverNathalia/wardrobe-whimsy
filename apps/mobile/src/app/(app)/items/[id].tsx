import { ActivityIndicator, ScrollView, Text, View } from 'react-native'
import { Stack, useLocalSearchParams } from 'expo-router'
import { AuthedImage } from '@/components/authed-image'
import { Message } from '@/components/message'
import { colours } from '@/lib/theme'
import { useClothingItem } from '@/lib/use-wardrobe'
import type { ClothingItem } from '@/lib/types'

/** Read-only for now; editing comes with the "adding items" milestone. */
export default function ItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { data: item, error, loading, refresh } = useClothingItem(id)

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator color={colours.primary} />
      </View>
    )
  }

  if (error || !item) {
    return (
      <Message
        title="Couldn't load this item"
        body={error?.message ?? 'Something went wrong.'}
        action={{ label: 'Try again', onPress: () => void refresh() }}
      />
    )
  }

  return (
    <ScrollView contentContainerClassName="pb-10">
      <Stack.Screen options={{ title: item.name }} />
      <View className="aspect-square bg-muted">
        <AuthedImage path={item.imageUrl} contentFit="contain" style={{ flex: 1 }} accessibilityIgnoresInvertColors />
      </View>
      <View className="gap-1 px-4 pt-5">
        <Text className="font-serif text-3xl text-foreground">{item.name}</Text>
        <Text className="font-sans text-sm text-muted-foreground">
          {[item.category, item.subcategory].filter(Boolean).join(' · ')}
        </Text>
      </View>
      <View className="mx-4 mt-5 rounded-xl border border-border bg-card px-4">
        {details(item).map(([label, value], index) => (
          <View
            key={label}
            className={`flex-row justify-between gap-4 py-3 ${index > 0 ? 'border-t border-border' : ''}`}
          >
            <Text className="font-sans text-sm text-muted-foreground">{label}</Text>
            <Text className="flex-1 text-right font-sans-medium text-sm text-foreground">{value}</Text>
          </View>
        ))}
      </View>
      {item.notes && <Text className="mx-4 mt-5 font-sans text-sm text-foreground">{item.notes}</Text>}
    </ScrollView>
  )
}

/** Only the fields that are filled in, so the list never shows empty rows. */
function details(item: ClothingItem): [string, string][] {
  const rows: [string, string | null][] = [
    ['Colour', item.colour],
    ['Season', item.season],
    ['Occasion', item.occasion],
    ['Brand', item.brand],
    ['Size', item.size],
  ]
  return rows.filter((row): row is [string, string] => Boolean(row[1]))
}
