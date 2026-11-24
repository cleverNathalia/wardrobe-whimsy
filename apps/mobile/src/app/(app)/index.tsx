import { ActivityIndicator, FlatList, RefreshControl, View } from 'react-native'
import * as WebBrowser from 'expo-web-browser'
import { ItemCard } from '@/components/item-card'
import { Message } from '@/components/message'
import { apiUrl } from '@/lib/api'
import { colours } from '@/lib/theme'
import { useWardrobe } from '@/lib/use-wardrobe'

export default function WardrobeScreen() {
  const { data, error, loading, refreshing, refresh } = useWardrobe()

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator color={colours.primary} />
      </View>
    )
  }

  if (error || !data) {
    return (
      <Message
        title="Couldn't load your wardrobe"
        body={error?.message ?? 'Something went wrong.'}
        action={{ label: 'Try again', onPress: () => void refresh() }}
      />
    )
  }

  // Connecting Drive is a Google sign-in on the website for now; doing it
  // from the app is a later milestone.
  if (!data.driveFolderConnected) {
    return (
      <Message
        title="Connect Google Drive"
        body="Your photos are stored in your own Google Drive. Connect it on the website first, then come back and pull down to refresh."
        action={{ label: 'Open the website', onPress: () => void WebBrowser.openBrowserAsync(apiUrl('/wardrobe')) }}
      />
    )
  }

  return (
    <FlatList
      data={data.items}
      keyExtractor={(item) => item.id}
      numColumns={2}
      columnWrapperClassName="gap-3"
      contentContainerClassName="gap-3 p-4"
      renderItem={({ item }) => <ItemCard item={item} />}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colours.primary} />}
      ListEmptyComponent={
        <Message
          title="Your wardrobe is empty"
          body="Adding items from the app is coming next. For now, add them on the website and pull down to refresh."
        />
      }
    />
  )
}
