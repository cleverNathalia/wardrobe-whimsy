import { Pressable, Text, View } from 'react-native'
import { Link } from 'expo-router'
import { AuthedImage } from './authed-image'
import type { ClothingItem } from '@/lib/types'

export function ItemCard({ item }: { item: ClothingItem }) {
  return (
    <Link href={{ pathname: '/items/[id]', params: { id: item.id } }} asChild>
      <Pressable className="flex-1 overflow-hidden rounded-xl border border-border bg-card active:opacity-80">
        <View className="aspect-square bg-muted">
          <AuthedImage path={item.imageUrl} contentFit="cover" style={{ flex: 1 }} accessibilityIgnoresInvertColors />
        </View>
        <View className="p-3">
          <Text numberOfLines={1} className="font-sans-medium text-sm text-foreground">
            {item.name}
          </Text>
          <Text numberOfLines={1} className="mt-0.5 font-sans text-xs text-muted-foreground">
            {item.category}
          </Text>
        </View>
      </Pressable>
    </Link>
  )
}
