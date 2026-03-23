import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import * as Haptics from 'expo-haptics'
import { LinearGradient } from 'expo-linear-gradient'
import * as Sharing from 'expo-sharing'
import React, { useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import {
  useCreateCommentMutation,
  useGetFeedQuery,
  useLikePostMutation,
  useUnlikePostMutation,
} from '@/generated/graphql'

interface FeedPost {
  id: string
  userId: string
  userName: string
  userAvatar: string
  content: string
  mediaUrl?: string
  mediaType?: 'image' | 'video'
  likes: number
  comments: number
  isLiked: boolean
  timestamp: Date
  tags?: string[]
  eventId?: string
  eventName?: string
  location?: string
}

export const FeedScreen: React.FC = () => {
  const { user } = useAuth()
  const { theme } = useTheme()
  const c = theme.colors
  const navigation = useNavigation<any>()
  const [selectedTab, setSelectedTab] = useState<'feed' | 'bonds'>('feed')

  // Comment modal state
  const [showCommentModal, setShowCommentModal] = useState(false)
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null)
  const [commentText, setCommentText] = useState('')

  // Fetch feed data from GraphQL
  const { data, loading, error, refetch } = useGetFeedQuery({
    variables: { limit: 20 },
    fetchPolicy: 'cache-and-network',
  })

  // Mutations
  const [likePost] = useLikePostMutation()
  const [unlikePost] = useUnlikePostMutation()
  const [createComment] = useCreateCommentMutation()

  const [refreshing, setRefreshing] = useState(false)

  // Transform GraphQL data to FeedPost format
  const feedPosts: FeedPost[] = React.useMemo(() => {
    if (!data?.getFeed?.posts) return []

    return data.getFeed.posts.map(post => ({
      id: post.id,
      userId: post.user_id,
      userName: post.user?.display_name || post.user?.username || 'Anonymous',
      userAvatar: post.user?.avatar_url || '',
      content: post.content || '',
      mediaUrl: post.media_url || undefined,
      mediaType: post.media_type as 'image' | 'video' | undefined,
      likes: post.likes_count || 0,
      comments: post.comments_count || 0,
      isLiked: post.is_liked_by_me || false,
      timestamp: new Date(post.created_at),
      eventId: post.event_id || undefined,
      location: post.location || undefined,
    }))
  }, [data])

  const handleLike = async (post: FeedPost) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    try {
      if (post.isLiked) {
        await unlikePost({
          variables: { postId: post.id },
          refetchQueries: ['GetFeed'],
        })
      } else {
        await likePost({
          variables: { postId: post.id },
          refetchQueries: ['GetFeed'],
        })
      }
    } catch (err) {
      console.error('Error toggling like:', err)
    }
  }

  const handleComment = (postId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setSelectedPostId(postId)
    setShowCommentModal(true)
  }

  const handleSubmitComment = async () => {
    if (!selectedPostId || !commentText.trim()) return

    try {
      await createComment({
        variables: {
          input: {
            post_id: selectedPostId,
            content: commentText.trim(),
          },
        },
        refetchQueries: ['GetFeed'],
      })
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      setCommentText('')
      setShowCommentModal(false)
    } catch (err) {
      console.error('Error creating comment:', err)
      Alert.alert('Error', 'Failed to post comment. Please try again.')
    }
  }

  const handleShare = async (post: FeedPost) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

    const isAvailable = await Sharing.isAvailableAsync()
    if (!isAvailable) {
      Alert.alert('Sharing not available', 'Sharing is not available on this device')
      return
    }

    const message = `Check out this dance post by ${post.userName} on DANZ!\n\n"${post.content.substring(0, 100)}${post.content.length > 100 ? '...' : ''}"\n\nDownload DANZ to join the movement!`

    Alert.alert('Share', `Share ${post.userName}'s post`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Share',
        onPress: async () => {
          try {
            // For text sharing, we use the native share API
            const { Share } = require('react-native')
            await Share.share({
              message,
              title: `${post.userName}'s Dance Post`,
            })
          } catch (err) {
            console.error('Share error:', err)
          }
        },
      },
    ])
  }

  const handleProfilePress = (userId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    navigation.navigate('UserProfile', { userId })
  }

  const handleCreateBond = (userId: string, userName: string) => {
    Alert.alert(
      'Create Dance Bond?',
      `You and @${userName} shared the flow! Create a Dance Bond?`,
      [
        { text: 'Maybe Later', style: 'cancel' },
        {
          text: "Yes, Let's Bond!",
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
            // TODO: Implement dance bond functionality
            console.log('Create bond with:', userName)
          },
        },
      ],
    )
  }

  const handleTagPress = (tag: string) => {
    if (tag.startsWith('@') && tag !== '@everyone') {
      const userName = tag.substring(1)
      Alert.alert('Dance Bond', `Create a dance bond with ${userName}?`, [
        { text: 'Not Now', style: 'cancel' },
        { text: 'Create Bond', onPress: () => handleCreateBond('mock-id', userName) },
      ])
    }
  }

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true)
    try {
      await refetch()
    } catch (err) {
      console.error('Error refreshing feed:', err)
    } finally {
      setRefreshing(false)
    }
  }, [refetch])

  const renderTabHeader = () => (
    <View style={styles.tabHeader}>
      <TouchableOpacity
        style={[
          styles.tab,
          selectedTab === 'feed' && [styles.activeTab, { borderBottomColor: c.primary }],
        ]}
        onPress={() => setSelectedTab('feed')}
      >
        <Text
          style={[
            styles.tabText,
            { color: c.textSecondary },
            selectedTab === 'feed' && { color: c.primary },
          ]}
        >
          Feed
        </Text>
      </TouchableOpacity>
    </View>
  )

  const renderCreatePost = () => (
    <TouchableOpacity
      style={[styles.createPostContainer, { backgroundColor: c.glassCard }]}
    >
      <View style={[styles.createPostAvatar, { backgroundColor: c.primary }]}>
        <Text style={styles.createPostAvatarText}>
          {user?.display_name?.charAt(0).toUpperCase() || 'D'}
        </Text>
      </View>
      <View style={styles.createPostInput}>
        <Text style={[styles.createPostPlaceholder, { color: c.textSecondary }]}>
          Share your dance journey...
        </Text>
      </View>
      <TouchableOpacity
        style={[styles.createPostButton, { backgroundColor: `${c.primary}1A` }]}
      >
        <MaterialCommunityIcons name="plus" size={20} color={c.primary} />
      </TouchableOpacity>
    </TouchableOpacity>
  )

  const renderFeedPost = (post: FeedPost) => {
    const timeAgo = getTimeAgo(post.timestamp)
    const hasAvatarUrl = post.userAvatar && post.userAvatar.startsWith('http')

    return (
      <View
        key={post.id}
        style={[styles.postContainer, { backgroundColor: c.glassCard }]}
      >
        <View style={styles.postHeader}>
          <TouchableOpacity style={styles.userInfo} onPress={() => handleProfilePress(post.userId)}>
            <View
              style={[styles.userAvatar, { backgroundColor: `${c.primary}1A` }]}
            >
              {hasAvatarUrl ? (
                <Image source={{ uri: post.userAvatar }} style={styles.userAvatarImage} />
              ) : (
                <Text style={[styles.userAvatarText, { color: c.primary }]}>
                  {post.userName.charAt(0).toUpperCase()}
                </Text>
              )}
            </View>
            <View style={styles.userDetails}>
              <Text style={[styles.userName, { color: c.text }]}>{post.userName}</Text>
              <Text style={[styles.postTime, { color: c.textSecondary }]}>{timeAgo}</Text>
              {post.location && (
                <Text style={[styles.postLocation, { color: c.textSecondary }]}>
                  {post.location}
                </Text>
              )}
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.moreButton}>
            <Ionicons name="ellipsis-horizontal" size={20} color={c.textSecondary} />
          </TouchableOpacity>
        </View>

        {post.eventName && (
          <View style={[styles.eventTag, { backgroundColor: `${c.primary}1A` }]}>
            <MaterialCommunityIcons name="calendar" size={16} color={c.primary} />
            <Text style={[styles.eventTagText, { color: c.primary }]}>at {post.eventName}</Text>
          </View>
        )}

        <Text style={[styles.postContent, { color: c.text }]}>
          {post.content.split(/(@\w+)/).map((part, index) =>
            part.startsWith('@') ? (
              <TouchableOpacity key={index} onPress={() => handleTagPress(part)}>
                <Text style={{ color: c.primary, fontWeight: '600' }}>{part}</Text>
              </TouchableOpacity>
            ) : (
              <Text key={index}>{part}</Text>
            ),
          )}
        </Text>

        {post.mediaType && (
          <View style={styles.mediaContainer}>
            <LinearGradient
              colors={[`${c.primary}4D`, `${c.accent}4D`]}
              style={styles.mediaPlaceholder}
            >
              <MaterialCommunityIcons
                name={post.mediaType === 'video' ? 'play-circle' : 'image'}
                size={40}
                color="white"
              />
              <Text style={styles.mediaText}>
                {post.mediaType === 'video' ? 'Dance Video' : 'Photo'}
              </Text>
            </LinearGradient>
          </View>
        )}

        <View style={styles.postActions}>
          <TouchableOpacity style={styles.actionButton} onPress={() => handleLike(post)}>
            <MaterialCommunityIcons
              name={post.isLiked ? 'heart' : 'heart-outline'}
              size={24}
              color={post.isLiked ? c.primary : c.textSecondary}
            />
            <Text
              style={[
                styles.actionText,
                { color: c.textSecondary },
                post.isLiked && { color: c.primary },
              ]}
            >
              {post.likes}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={() => handleComment(post.id)}>
            <MaterialCommunityIcons name="comment-outline" size={24} color={c.textSecondary} />
            <Text style={[styles.actionText, { color: c.textSecondary }]}>{post.comments}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={() => handleShare(post)}>
            <MaterialCommunityIcons name="share-outline" size={24} color={c.textSecondary} />
            <Text style={[styles.actionText, { color: c.textSecondary }]}>Share</Text>
          </TouchableOpacity>

          <View style={styles.spacer} />

          <TouchableOpacity style={styles.saveButton}>
            <MaterialCommunityIcons name="bookmark-outline" size={20} color={c.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  const renderCommentModal = () => (
    <Modal
      visible={showCommentModal}
      animationType="slide"
      transparent
      onRequestClose={() => setShowCommentModal(false)}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowCommentModal(false)}
        />
        <View style={[styles.commentModalContainer, { backgroundColor: c.surface }]}>
          <View style={styles.commentModalHeader}>
            <Text style={[styles.commentModalTitle, { color: c.text }]}>Add Comment</Text>
            <TouchableOpacity onPress={() => setShowCommentModal(false)}>
              <Ionicons name="close" size={24} color={c.text} />
            </TouchableOpacity>
          </View>
          <TextInput
            style={[
              styles.commentInput,
              { backgroundColor: c.glassCard, color: c.text },
            ]}
            placeholder="Share your thoughts..."
            placeholderTextColor={c.textSecondary}
            value={commentText}
            onChangeText={setCommentText}
            multiline
            maxLength={500}
            autoFocus
          />
          <TouchableOpacity
            style={[
              styles.submitCommentButton,
              { backgroundColor: c.primary },
              !commentText.trim() && styles.submitCommentButtonDisabled,
            ]}
            onPress={handleSubmitComment}
            disabled={!commentText.trim()}
          >
            <Text style={styles.submitCommentText}>Post Comment</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )

  const getTimeAgo = (timestamp: Date): string => {
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - timestamp.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 1) return 'Just now'
    if (diffInHours === 1) return '1 hour ago'
    if (diffInHours < 24) return `${diffInHours} hours ago`

    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays === 1) return '1 day ago'
    return `${diffInDays} days ago`
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={c.background} />
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: c.text }]}>Community</Text>
        <Text style={[styles.headerSubtitle, { color: c.textSecondary }]}>
          Share your dance journey
        </Text>
      </View>

      {renderTabHeader()}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {selectedTab === 'feed' ? (
          <>
            {renderCreatePost()}

            {loading && !refreshing && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={c.primary} />
                <Text style={[styles.loadingText, { color: c.textSecondary }]}>
                  Loading feed...
                </Text>
              </View>
            )}

            {error && (
              <View style={styles.errorContainer}>
                <MaterialCommunityIcons
                  name="alert-circle"
                  size={48}
                  color={c.textSecondary}
                />
                <Text style={[styles.errorText, { color: c.text }]}>Failed to load feed</Text>
                <TouchableOpacity
                  style={[styles.retryButton, { backgroundColor: c.primary }]}
                  onPress={() => refetch()}
                >
                  <Text style={styles.retryButtonText}>Try Again</Text>
                </TouchableOpacity>
              </View>
            )}

            {!loading && !error && feedPosts.length === 0 && (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>📝</Text>
                <Text style={[styles.emptyTitle, { color: c.text }]}>No posts yet</Text>
                <Text style={[styles.emptyText, { color: c.textSecondary }]}>
                  Be the first to share your dance journey!
                </Text>
              </View>
            )}

            {feedPosts.map(renderFeedPost)}
          </>
        ) : (
          <></>
        )}
        <View style={styles.bottomSpacer} />
      </ScrollView>
      {renderCommentModal()}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 16,
    marginTop: 4,
  },
  tabHeader: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    // borderBottomColor set inline via c.primary
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
  },
  feedScrollView: {
    flex: 1,
  },
  createPostContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 24,
    marginBottom: 24,
    borderRadius: 16,
    padding: 16,
  },
  createPostAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  createPostAvatarText: {
    fontSize: 16,
    color: 'white',
    fontWeight: 'bold',
  },
  createPostInput: {
    flex: 1,
    paddingVertical: 8,
  },
  createPostPlaceholder: {
    fontSize: 16,
  },
  createPostButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  postContainer: {
    marginHorizontal: 24,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userAvatarText: {
    fontSize: 20,
    fontWeight: '600',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
  },
  postTime: {
    fontSize: 12,
    marginTop: 2,
  },
  postLocation: {
    fontSize: 12,
    marginTop: 2,
  },
  moreButton: {
    padding: 4,
  },
  eventTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 12,
    gap: 4,
  },
  eventTagText: {
    fontSize: 12,
    fontWeight: '500',
  },
  postContent: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 16,
  },
  mediaContainer: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  mediaPlaceholder: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaText: {
    fontSize: 14,
    color: 'white',
    marginTop: 8,
    fontWeight: '500',
  },
  postActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 24,
    gap: 6,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  spacer: {
    flex: 1,
  },
  saveButton: {
    padding: 4,
  },
  bondsContainer: {
    paddingHorizontal: 24,
  },
  bondCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  bondHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  bondAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  bondAvatarText: {
    fontSize: 20,
  },
  bondInfo: {
    flex: 1,
  },
  bondPartnerName: {
    fontSize: 16,
    fontWeight: '600',
  },
  bondLevel: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 2,
  },
  bondStats: {
    fontSize: 12,
    marginTop: 4,
  },
  bondLevelBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bondLevelText: {
    fontSize: 14,
    color: 'white',
    fontWeight: 'bold',
  },
  bondProgress: {
    marginBottom: 16,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
  bondActionButton: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  bondActionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyBonds: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyBondsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyBondsText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 280,
  },
  bottomSpacer: {
    height: 100,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    marginTop: 16,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 24,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 280,
  },
  userAvatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  commentModalContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
  },
  commentModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  commentModalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  commentInput: {
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  submitCommentButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitCommentButtonDisabled: {
    opacity: 0.5,
  },
  submitCommentText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
})
