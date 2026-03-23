import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { BlurView } from 'expo-blur'
import * as Haptics from 'expo-haptics'
import { LinearGradient } from 'expo-linear-gradient'
import type React from 'react'
import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Toast from 'react-native-toast-message'
import { useTheme } from '@/contexts/ThemeContext'
import {
  useCanSendBondRequestToLazyQuery,
  useDismissSuggestionMutation,
  useGetSuggestedUsersQuery,
  useSearchUsersLazyQuery,
  useSendBondRequestMutation,
} from '@/generated/graphql'
import { fs, hs, ms, vs } from '../utils/responsive'

type SuggestionSource =
  | 'mutual_bonds'
  | 'same_events'
  | 'same_city'
  | 'leaderboard_proximity'
  | 'similar_styles'

interface User {
  privy_id: string
  username: string
  display_name: string
  avatar_url: string | null
  city: string | null
}

interface UserSuggestion {
  id: string
  user: User
  source: SuggestionSource
  score: number
  reason: string
}

interface SearchResult {
  user: User
  can_view_profile: boolean
  can_message: boolean
  is_bond: boolean
  mutual_bonds_count: number
}

const SOURCE_ICONS: Record<SuggestionSource, string> = {
  mutual_bonds: 'people',
  same_events: 'calendar',
  same_city: 'location',
  leaderboard_proximity: 'trophy',
  similar_styles: 'musical-notes',
}

const SOURCE_LABELS: Record<SuggestionSource, string> = {
  mutual_bonds: 'Mutual Bonds',
  same_events: 'Same Events',
  same_city: 'Same City',
  leaderboard_proximity: 'Near You on Leaderboard',
  similar_styles: 'Similar Dance Styles',
}

export const UserDiscoveryScreen: React.FC = () => {
  const navigation = useNavigation()
  const { theme } = useTheme()
  const c = theme.colors
  const [activeTab, setActiveTab] = useState<'suggestions' | 'search'>('suggestions')
  const [searchQuery, setSearchQuery] = useState('')
  const [suggestions, setSuggestions] = useState<UserSuggestion[]>([])
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [refreshing, setRefreshing] = useState(false)

  // GraphQL hooks
  const {
    data: suggestionsData,
    loading: suggestionsLoading,
    refetch,
  } = useGetSuggestedUsersQuery({
    variables: { limit: 20, offset: 0 },
  })
  const [searchUsers, { loading: searchLoading }] = useSearchUsersLazyQuery()
  const [dismissSuggestionMutation] = useDismissSuggestionMutation()
  const [sendBondRequest, { loading: sendingBondRequest }] = useSendBondRequestMutation()
  const [checkCanSendBondRequest] = useCanSendBondRequestToLazyQuery()

  const loading = suggestionsLoading
  const searching = searchLoading

  // Sync suggestions from server
  useEffect(() => {
    if (suggestionsData?.suggestedUsers?.suggestions) {
      const mappedSuggestions: UserSuggestion[] = suggestionsData.suggestedUsers.suggestions.map(
        s => ({
          id: s.id,
          user: {
            privy_id: s.user.privy_id,
            username: s.user.username || '',
            display_name: s.user.display_name || '',
            avatar_url: s.user.avatar_url || null,
            city: s.user.city || null,
          },
          source: s.source as SuggestionSource,
          score: s.score,
          reason: s.reason || '',
        }),
      )
      setSuggestions(mappedSuggestions)
    }
  }, [suggestionsData])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    try {
      await refetch()
    } catch (error) {
      console.error('Failed to refresh suggestions:', error)
    } finally {
      setRefreshing(false)
    }
  }, [refetch])

  const handleSearch = useCallback(
    async (query: string) => {
      if (query.length < 2) {
        setSearchResults([])
        return
      }
      try {
        const { data } = await searchUsers({
          variables: { input: { query, limit: 20, offset: 0 } },
        })
        if (data?.searchUsers?.results) {
          const mappedResults: SearchResult[] = data.searchUsers.results.map(r => ({
            user: {
              privy_id: r.user.privy_id,
              username: r.user.username || '',
              display_name: r.user.display_name || '',
              avatar_url: r.user.avatar_url || null,
              city: r.user.city || null,
            },
            can_view_profile: r.can_view_profile,
            can_message: r.can_message,
            is_bond: r.is_bond,
            mutual_bonds_count: r.mutual_bonds_count,
          }))
          setSearchResults(mappedResults)
        }
      } catch (error) {
        console.error('Search failed:', error)
        setSearchResults([])
      }
    },
    [searchUsers],
  )

  const handleDismissSuggestion = useCallback(
    async (suggestionId: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      // Optimistic update
      setSuggestions(prev => prev.filter(s => s.id !== suggestionId))
      try {
        await dismissSuggestionMutation({ variables: { suggestionId } })
      } catch (error) {
        console.error('Failed to dismiss suggestion:', error)
        // Optionally refetch to restore state
        await refetch()
      }
    },
    [dismissSuggestionMutation, refetch],
  )

  const handleUserPress = useCallback(
    (userId: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      // Navigate to user profile
      // navigation.navigate('UserProfile', { userId })
    },
    [navigation],
  )

  const handleSendBondRequest = useCallback(
    async (userId: string) => {
      try {
        // Check if we can send a request first
        const { data: canSendData } = await checkCanSendBondRequest({
          variables: { userId },
        })

        if (!canSendData?.canSendBondRequestTo?.can_send) {
          const reason = canSendData?.canSendBondRequestTo?.reason
          let message = 'Cannot send bond request'
          if (reason === 'already_bonded') message = 'You are already bonded with this user'
          else if (reason === 'pending_request_exists') message = 'A request is already pending'
          else if (reason === 'recipient_not_accepting')
            message = 'This user is not accepting bond requests'

          Toast.show({
            type: 'info',
            text1: 'Cannot Bond',
            text2: message,
          })
          return
        }

        // Send the request
        await sendBondRequest({
          variables: { input: { recipient_id: userId } },
        })

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        Toast.show({
          type: 'success',
          text1: 'Bond Request Sent!',
          text2: 'They will be notified of your request',
        })

        // Optionally remove from suggestions
        setSuggestions(prev => prev.filter(s => s.user.privy_id !== userId))
      } catch (error) {
        console.error('Failed to send bond request:', error)
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Failed to send bond request',
        })
      }
    },
    [checkCanSendBondRequest, sendBondRequest],
  )

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={[styles.backButton, { backgroundColor: c.glassBorder }]}
      >
        <Ionicons name="arrow-back" size={24} color={c.text} />
      </TouchableOpacity>
      <Text style={[styles.headerTitle, { color: c.text }]}>Discover Dancers</Text>
      <View style={styles.backButton} />
    </View>
  )

  const renderTabs = () => (
    <View style={styles.tabContainer}>
      <TouchableOpacity
        style={[
          styles.tab,
          { backgroundColor: c.glassCard },
          activeTab === 'suggestions' && {
            backgroundColor: c.highlight,
            borderWidth: 1,
            borderColor: c.primary,
          },
        ]}
        onPress={() => setActiveTab('suggestions')}
      >
        <Ionicons
          name="sparkles"
          size={18}
          color={activeTab === 'suggestions' ? c.primary : c.textSecondary}
        />
        <Text
          style={[
            styles.tabText,
            { color: c.textSecondary },
            activeTab === 'suggestions' && { color: c.primary },
          ]}
        >
          For You
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.tab,
          { backgroundColor: c.glassCard },
          activeTab === 'search' && {
            backgroundColor: c.highlight,
            borderWidth: 1,
            borderColor: c.primary,
          },
        ]}
        onPress={() => setActiveTab('search')}
      >
        <Ionicons
          name="search"
          size={18}
          color={activeTab === 'search' ? c.primary : c.textSecondary}
        />
        <Text
          style={[
            styles.tabText,
            { color: c.textSecondary },
            activeTab === 'search' && { color: c.primary },
          ]}
        >
          Search
        </Text>
      </TouchableOpacity>
    </View>
  )

  const renderSearchBar = () => (
    <BlurView intensity={20} tint={theme.glass.tint} style={[styles.searchContainer, { borderColor: c.glassBorder }]}>
      <Ionicons name="search" size={20} color={c.textSecondary} />
      <TextInput
        style={[styles.searchInput, { color: c.text }]}
        placeholder="Search by username..."
        placeholderTextColor={c.textMuted}
        value={searchQuery}
        onChangeText={text => {
          setSearchQuery(text)
          handleSearch(text)
        }}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {searchQuery.length > 0 && (
        <TouchableOpacity
          onPress={() => {
            setSearchQuery('')
            setSearchResults([])
          }}
        >
          <Ionicons name="close-circle" size={20} color={c.textSecondary} />
        </TouchableOpacity>
      )}
    </BlurView>
  )

  const renderSuggestionCard = ({ item }: { item: UserSuggestion }) => (
    <BlurView intensity={20} tint={theme.glass.tint} style={[styles.userCard, { borderColor: c.glassBorder }]}>
      <TouchableOpacity style={styles.userInfo} onPress={() => handleUserPress(item.user.privy_id)}>
        <View style={styles.avatarContainer}>
          {item.user.avatar_url ? (
            <Image source={{ uri: item.user.avatar_url }} style={styles.avatar} />
          ) : (
            <LinearGradient
              colors={theme.gradients.primary as [string, string, ...string[]]}
              style={styles.avatarPlaceholder}
            >
              <Text style={[styles.avatarInitial, { color: c.text }]}>
                {item.user.display_name?.charAt(0) || item.user.username.charAt(0)}
              </Text>
            </LinearGradient>
          )}
        </View>
        <View style={styles.userDetails}>
          <Text style={[styles.displayName, { color: c.text }]}>
            {item.user.display_name || item.user.username}
          </Text>
          <Text style={[styles.username, { color: c.textSecondary }]}>@{item.user.username}</Text>
          <View style={styles.reasonContainer}>
            <Ionicons name={SOURCE_ICONS[item.source] as any} size={14} color={c.secondary} />
            <Text style={[styles.reasonText, { color: c.secondary }]}>{item.reason}</Text>
          </View>
        </View>
      </TouchableOpacity>

      <View style={styles.cardActions}>
        <TouchableOpacity
          style={styles.bondButton}
          onPress={() => handleSendBondRequest(item.user.privy_id)}
        >
          <LinearGradient
            colors={theme.gradients.primary as [string, string, ...string[]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.bondButtonGradient}
          >
            <Ionicons name="add" size={18} color={c.text} />
            <Text style={[styles.bondButtonText, { color: c.text }]}>Bond</Text>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.dismissButton, { backgroundColor: c.glassCard }]}
          onPress={() => handleDismissSuggestion(item.id)}
        >
          <Ionicons name="close" size={18} color={c.textSecondary} />
        </TouchableOpacity>
      </View>
    </BlurView>
  )

  const renderSearchResult = ({ item }: { item: SearchResult }) => (
    <BlurView intensity={20} tint={theme.glass.tint} style={[styles.userCard, { borderColor: c.glassBorder }]}>
      <TouchableOpacity style={styles.userInfo} onPress={() => handleUserPress(item.user.privy_id)}>
        <View style={styles.avatarContainer}>
          <LinearGradient
            colors={theme.gradients.primary as [string, string, ...string[]]}
            style={styles.avatarPlaceholder}
          >
            <Text style={[styles.avatarInitial, { color: c.text }]}>
              {item.user.display_name?.charAt(0) || item.user.username.charAt(0)}
            </Text>
          </LinearGradient>
        </View>
        <View style={styles.userDetails}>
          <View style={styles.nameRow}>
            <Text style={[styles.displayName, { color: c.text }]}>
              {item.user.display_name || item.user.username}
            </Text>
            {item.is_bond && (
              <View style={[styles.bondBadge, { backgroundColor: c.highlight }]}>
                <Ionicons name="heart" size={10} color={c.primary} />
              </View>
            )}
          </View>
          <Text style={[styles.username, { color: c.textSecondary }]}>@{item.user.username}</Text>
          {item.mutual_bonds_count > 0 && (
            <Text style={[styles.mutualBonds, { color: c.secondary }]}>
              {item.mutual_bonds_count} mutual bonds
            </Text>
          )}
        </View>
      </TouchableOpacity>

      <View style={styles.cardActions}>
        {!item.is_bond ? (
          <TouchableOpacity
            style={styles.bondButton}
            onPress={() => handleSendBondRequest(item.user.privy_id)}
          >
            <LinearGradient
              colors={theme.gradients.primary as [string, string, ...string[]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.bondButtonGradient}
            >
              <Ionicons name="add" size={18} color={c.text} />
              <Text style={[styles.bondButtonText, { color: c.text }]}>Bond</Text>
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <View style={[styles.bondedBadge, { backgroundColor: `${c.success}18` }]}>
            <Ionicons name="checkmark-circle" size={16} color={c.success} />
            <Text style={[styles.bondedText, { color: c.success }]}>Bonded</Text>
          </View>
        )}
        {item.can_message && (
          <TouchableOpacity style={[styles.messageButton, { backgroundColor: `${c.secondary}1A` }]}>
            <Ionicons name="chatbubble-outline" size={18} color={c.secondary} />
          </TouchableOpacity>
        )}
      </View>
    </BlurView>
  )

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialCommunityIcons name="account-search" size={64} color={c.textMuted} />
      <Text style={[styles.emptyTitle, { color: c.text }]}>
        {activeTab === 'suggestions' ? 'No Suggestions Yet' : 'Search for Dancers'}
      </Text>
      <Text style={[styles.emptyDescription, { color: c.textSecondary }]}>
        {activeTab === 'suggestions'
          ? "Dance more, attend events, and we'll find dancers for you!"
          : 'Enter a username to find other dancers'}
      </Text>
    </View>
  )

  return (
    <LinearGradient colors={[c.background, c.surface, c.background]} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {renderHeader()}
        {renderTabs()}

        {activeTab === 'search' && renderSearchBar()}

        {loading || searching ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={c.primary} />
          </View>
        ) : activeTab === 'suggestions' ? (
          <FlatList
            data={suggestions}
            keyExtractor={item => item.id}
            renderItem={renderSuggestionCard}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={renderEmptyState}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={c.primary}
                colors={[c.primary]}
              />
            }
          />
        ) : (
          <FlatList
            data={searchResults}
            keyExtractor={item => item.user.privy_id}
            renderItem={renderSearchResult}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={renderEmptyState}
          />
        )}
      </SafeAreaView>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: hs(20),
    paddingVertical: vs(16),
  },
  backButton: {
    width: ms(40),
    height: ms(40),
    borderRadius: ms(20),
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: fs(20),
    fontWeight: '700',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: hs(20),
    marginBottom: vs(16),
    gap: hs(12),
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: vs(12),
    borderRadius: ms(12),
    gap: hs(8),
  },
  tabText: {
    fontSize: fs(14),
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: hs(20),
    marginBottom: vs(16),
    paddingHorizontal: hs(16),
    borderRadius: ms(12),
    overflow: 'hidden',
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    height: vs(48),
    fontSize: fs(16),
    marginLeft: hs(12),
  },
  listContent: {
    paddingHorizontal: hs(20),
    paddingBottom: vs(24),
  },
  userCard: {
    borderRadius: ms(16),
    marginBottom: vs(12),
    padding: ms(16),
    overflow: 'hidden',
    borderWidth: 1,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: hs(12),
  },
  avatar: {
    width: ms(56),
    height: ms(56),
    borderRadius: ms(28),
  },
  avatarPlaceholder: {
    width: ms(56),
    height: ms(56),
    borderRadius: ms(28),
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: fs(24),
    fontWeight: '700',
  },
  userDetails: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: hs(8),
  },
  displayName: {
    fontSize: fs(16),
    fontWeight: '600',
  },
  username: {
    fontSize: fs(14),
    marginTop: vs(2),
  },
  bondBadge: {
    paddingHorizontal: hs(6),
    paddingVertical: vs(2),
    borderRadius: ms(4),
  },
  reasonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: vs(6),
    gap: hs(6),
  },
  reasonText: {
    fontSize: fs(12),
  },
  mutualBonds: {
    fontSize: fs(12),
    marginTop: vs(4),
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: vs(12),
    gap: hs(8),
  },
  bondButton: {
    borderRadius: ms(20),
    overflow: 'hidden',
  },
  bondButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: hs(16),
    paddingVertical: vs(8),
    gap: hs(4),
  },
  bondButtonText: {
    fontSize: fs(14),
    fontWeight: '600',
  },
  dismissButton: {
    width: ms(36),
    height: ms(36),
    borderRadius: ms(18),
    justifyContent: 'center',
    alignItems: 'center',
  },
  bondedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: hs(4),
    paddingHorizontal: hs(12),
    paddingVertical: vs(6),
    borderRadius: ms(16),
  },
  bondedText: {
    fontSize: fs(12),
    fontWeight: '600',
  },
  messageButton: {
    width: ms(36),
    height: ms(36),
    borderRadius: ms(18),
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: vs(60),
  },
  emptyTitle: {
    fontSize: fs(18),
    fontWeight: '600',
    marginTop: vs(16),
  },
  emptyDescription: {
    fontSize: fs(14),
    textAlign: 'center',
    marginTop: vs(8),
    paddingHorizontal: hs(40),
  },
})
