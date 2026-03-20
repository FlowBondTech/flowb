import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { BlurView } from 'expo-blur'
import * as Haptics from 'expo-haptics'
import { LinearGradient } from 'expo-linear-gradient'
import type React from 'react'
import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  PrivacyPresetType as GqlPrivacyPresetType,
  useApplyPrivacyPresetMutation,
  useGetMyPrivacySettingsQuery,
  useUpdatePrivacySettingsMutation,
} from '@/generated/graphql'
import { fs, hs, ms, vs } from '../utils/responsive'

// Privacy preset types
type PrivacyPresetType = 'open' | 'social' | 'selective' | 'private_mode' | 'ghost'
type ProfileVisibility = 'public' | 'bonds_only' | 'private'
type AllowMessagesFrom = 'everyone' | 'bonds_only' | 'none'
type AllowBondRequestsFrom = 'everyone' | 'mutual_events' | 'none'

interface PrivacySettings {
  profile_visibility: ProfileVisibility
  show_real_name: boolean
  show_bio: boolean
  show_avatar: boolean
  show_city: boolean
  show_dance_styles: boolean
  show_stats: boolean
  show_badges: boolean
  show_events_attending: boolean
  show_events_attended: boolean
  show_check_ins: boolean
  show_leaderboard_rank: boolean
  show_posts: boolean
  show_likes: boolean
  show_comments: boolean
  searchable_by_username: boolean
  appear_in_suggestions: boolean
  appear_in_event_attendees: boolean
  appear_in_nearby: boolean
  allow_bond_requests: AllowBondRequestsFrom
  allow_messages: AllowMessagesFrom
  allow_event_invites: boolean
  notify_bonds_on_check_in: boolean
  notify_bonds_on_achievement: boolean
}

const DEFAULT_SETTINGS: PrivacySettings = {
  profile_visibility: 'public',
  show_real_name: true,
  show_bio: true,
  show_avatar: true,
  show_city: true,
  show_dance_styles: true,
  show_stats: true,
  show_badges: true,
  show_events_attending: true,
  show_events_attended: true,
  show_check_ins: true,
  show_leaderboard_rank: true,
  show_posts: true,
  show_likes: true,
  show_comments: true,
  searchable_by_username: true,
  appear_in_suggestions: true,
  appear_in_event_attendees: true,
  appear_in_nearby: true,
  allow_bond_requests: 'everyone',
  allow_messages: 'everyone',
  allow_event_invites: true,
  notify_bonds_on_check_in: true,
  notify_bonds_on_achievement: true,
}

const PRESETS: { type: PrivacyPresetType; name: string; icon: string; description: string }[] = [
  {
    type: 'open',
    name: 'Open',
    icon: 'earth',
    description: 'Public profile, everyone can find and message you',
  },
  {
    type: 'social',
    name: 'Social',
    icon: 'people',
    description: 'Public profile, only bonds can message',
  },
  {
    type: 'selective',
    name: 'Selective',
    icon: 'filter',
    description: 'Bonds-only profile, appear in suggestions',
  },
  {
    type: 'private_mode',
    name: 'Private',
    icon: 'lock-closed',
    description: 'Hidden profile, bonds-only messages',
  },
  {
    type: 'ghost',
    name: 'Ghost',
    icon: 'eye-off',
    description: 'Completely hidden, no interactions',
  },
]

export const PrivacySettingsScreen: React.FC = () => {
  const navigation = useNavigation()
  const [settings, setSettings] = useState<PrivacySettings>(DEFAULT_SETTINGS)
  const [activePreset, setActivePreset] = useState<PrivacyPresetType | null>('open')
  const [expandedSection, setExpandedSection] = useState<string | null>('presets')

  // GraphQL hooks
  const { data, loading: queryLoading } = useGetMyPrivacySettingsQuery()
  const [updateSettingsMutation, { loading: updateLoading }] = useUpdatePrivacySettingsMutation()
  const [applyPresetMutation, { loading: presetLoading }] = useApplyPrivacyPresetMutation()

  const loading = queryLoading || updateLoading || presetLoading

  // Sync settings from server when data loads
  useEffect(() => {
    if (data?.myPrivacySettings) {
      const serverSettings = data.myPrivacySettings
      setSettings({
        profile_visibility: (serverSettings.profile_visibility as ProfileVisibility) || 'public',
        show_real_name: serverSettings.show_real_name ?? true,
        show_bio: serverSettings.show_bio ?? true,
        show_avatar: serverSettings.show_avatar ?? true,
        show_city: serverSettings.show_city ?? true,
        show_dance_styles: serverSettings.show_dance_styles ?? true,
        show_stats: serverSettings.show_stats ?? true,
        show_badges: serverSettings.show_badges ?? true,
        show_events_attending: serverSettings.show_events_attending ?? true,
        show_events_attended: serverSettings.show_events_attended ?? true,
        show_check_ins: serverSettings.show_check_ins ?? true,
        show_leaderboard_rank: serverSettings.show_leaderboard_rank ?? true,
        show_posts: serverSettings.show_posts ?? true,
        show_likes: serverSettings.show_likes ?? true,
        show_comments: serverSettings.show_comments ?? true,
        searchable_by_username: serverSettings.searchable_by_username ?? true,
        appear_in_suggestions: serverSettings.appear_in_suggestions ?? true,
        appear_in_event_attendees: serverSettings.appear_in_event_attendees ?? true,
        appear_in_nearby: serverSettings.appear_in_nearby ?? true,
        allow_bond_requests:
          (serverSettings.allow_bond_requests as AllowBondRequestsFrom) || 'everyone',
        allow_messages: (serverSettings.allow_messages as AllowMessagesFrom) || 'everyone',
        allow_event_invites: serverSettings.allow_event_invites ?? true,
        notify_bonds_on_check_in: serverSettings.notify_bonds_on_check_in ?? true,
        notify_bonds_on_achievement: serverSettings.notify_bonds_on_achievement ?? true,
      })
    }
  }, [data])

  const updateSetting = useCallback(
    async <K extends keyof PrivacySettings>(key: K, value: PrivacySettings[K]) => {
      const newSettings = { ...settings, [key]: value }
      setSettings(newSettings)
      setActivePreset(null) // Clear preset when individual setting changes
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

      try {
        await updateSettingsMutation({ variables: { input: { [key]: value } } })
      } catch (error) {
        console.error('Failed to update privacy setting:', error)
        // Revert on error
        setSettings(settings)
      }
    },
    [settings, updateSettingsMutation],
  )

  const handleApplyPreset = useCallback(
    async (preset: PrivacyPresetType) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

      // Apply preset settings locally for optimistic update
      const presetSettings: Partial<PrivacySettings> = getPresetSettings(preset)
      setSettings(prev => ({ ...prev, ...presetSettings }))
      setActivePreset(preset)

      try {
        // Map local preset type to GraphQL enum
        const presetMap: Record<PrivacyPresetType, GqlPrivacyPresetType> = {
          open: GqlPrivacyPresetType.Open,
          social: GqlPrivacyPresetType.Social,
          selective: GqlPrivacyPresetType.Selective,
          private_mode: GqlPrivacyPresetType.PrivateMode,
          ghost: GqlPrivacyPresetType.Ghost,
        }
        await applyPresetMutation({ variables: { preset: presetMap[preset] } })
      } catch (error) {
        console.error('Failed to apply preset:', error)
        // Revert on error
        setSettings(DEFAULT_SETTINGS)
        setActivePreset(null)
      }
    },
    [applyPresetMutation],
  )

  const getPresetSettings = (preset: PrivacyPresetType): Partial<PrivacySettings> => {
    switch (preset) {
      case 'open':
        return {
          profile_visibility: 'public',
          searchable_by_username: true,
          appear_in_suggestions: true,
          allow_messages: 'everyone',
          allow_bond_requests: 'everyone',
        }
      case 'social':
        return {
          profile_visibility: 'public',
          searchable_by_username: true,
          appear_in_suggestions: true,
          allow_messages: 'bonds_only',
          allow_bond_requests: 'everyone',
        }
      case 'selective':
        return {
          profile_visibility: 'bonds_only',
          searchable_by_username: true,
          appear_in_suggestions: true,
          allow_messages: 'bonds_only',
          allow_bond_requests: 'mutual_events',
        }
      case 'private_mode':
        return {
          profile_visibility: 'private',
          searchable_by_username: false,
          appear_in_suggestions: false,
          allow_messages: 'bonds_only',
          allow_bond_requests: 'none',
        }
      case 'ghost':
        return {
          profile_visibility: 'private',
          searchable_by_username: false,
          appear_in_suggestions: false,
          appear_in_event_attendees: false,
          appear_in_nearby: false,
          allow_messages: 'none',
          allow_bond_requests: 'none',
          show_leaderboard_rank: false,
        }
      default:
        return {}
    }
  }

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  }

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color="white" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Privacy Settings</Text>
      <View style={styles.backButton} />
    </View>
  )

  const renderPresetOption = (preset: (typeof PRESETS)[0]) => (
    <TouchableOpacity
      key={preset.type}
      style={[styles.presetOption, activePreset === preset.type && styles.presetOptionActive]}
      onPress={() => handleApplyPreset(preset.type)}
      disabled={loading}
    >
      <Ionicons
        name={preset.icon as any}
        size={24}
        color={activePreset === preset.type ? '#FF1493' : 'rgba(255,255,255,0.5)'}
      />
      <View style={styles.presetInfo}>
        <Text
          style={[styles.presetLabel, activePreset === preset.type && styles.presetLabelActive]}
        >
          {preset.name}
        </Text>
        <Text style={styles.presetDescription}>{preset.description}</Text>
      </View>
      {activePreset === preset.type && (
        <Ionicons name="checkmark-circle" size={20} color="#FF1493" />
      )}
    </TouchableOpacity>
  )

  const renderSettingRow = (
    title: string,
    description: string,
    key: keyof PrivacySettings,
    disabled = false,
  ) => (
    <View style={styles.settingRow}>
      <View style={styles.settingInfo}>
        <Text style={[styles.settingTitle, disabled && styles.settingDisabled]}>{title}</Text>
        <Text style={styles.settingDescription}>{description}</Text>
      </View>
      <Switch
        value={settings[key] as boolean}
        onValueChange={value => updateSetting(key, value)}
        trackColor={{ false: 'rgba(255,255,255,0.1)', true: '#FF1493' }}
        thumbColor={settings[key] ? '#B967FF' : '#f4f3f4'}
        disabled={disabled}
      />
    </View>
  )

  const renderCollapsibleSection = (
    title: string,
    sectionKey: string,
    icon: string,
    children: React.ReactNode,
  ) => (
    <BlurView intensity={20} tint="dark" style={styles.section}>
      <TouchableOpacity style={styles.sectionHeader} onPress={() => toggleSection(sectionKey)}>
        <Ionicons name={icon as any} size={20} color="#B967FF" />
        <Text style={styles.sectionTitle}>{title}</Text>
        <Ionicons
          name={expandedSection === sectionKey ? 'chevron-up' : 'chevron-down'}
          size={20}
          color="rgba(255,255,255,0.5)"
        />
      </TouchableOpacity>
      {expandedSection === sectionKey && <View style={styles.sectionContent}>{children}</View>}
    </BlurView>
  )

  return (
    <LinearGradient colors={['#1A0033', '#2D1B69', '#0A0033']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {renderHeader()}

        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#FF1493" />
          </View>
        )}

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Quick Presets */}
          <BlurView intensity={20} tint="dark" style={styles.section}>
            <TouchableOpacity style={styles.sectionHeader} onPress={() => toggleSection('presets')}>
              <MaterialCommunityIcons name="shield-check" size={20} color="#B967FF" />
              <Text style={styles.sectionTitle}>Quick Privacy Presets</Text>
              <Ionicons
                name={expandedSection === 'presets' ? 'chevron-up' : 'chevron-down'}
                size={20}
                color="rgba(255,255,255,0.5)"
              />
            </TouchableOpacity>
            {expandedSection === 'presets' && (
              <View style={styles.sectionContent}>
                <Text style={styles.sectionDescription}>
                  Choose a preset to quickly configure your privacy settings
                </Text>
                {PRESETS.map(renderPresetOption)}
              </View>
            )}
          </BlurView>

          {/* Profile Visibility */}
          {renderCollapsibleSection(
            'Profile Visibility',
            'profile',
            'person-circle',
            <>
              {renderSettingRow(
                'Show Real Name',
                'Display your real name on profile',
                'show_real_name',
              )}
              {renderSettingRow('Show Bio', 'Show your bio to others', 'show_bio')}
              {renderSettingRow('Show Avatar', 'Display your profile picture', 'show_avatar')}
              {renderSettingRow('Show City', 'Show your location', 'show_city')}
              {renderSettingRow(
                'Show Dance Styles',
                'Display your dance preferences',
                'show_dance_styles',
              )}
              {renderSettingRow('Show Stats', 'Show your dance statistics', 'show_stats')}
              {renderSettingRow('Show Badges', 'Display your achievements', 'show_badges')}
            </>,
          )}

          {/* Activity Visibility */}
          {renderCollapsibleSection(
            'Activity Visibility',
            'activity',
            'pulse',
            <>
              {renderSettingRow(
                'Show Events Attending',
                'Let others see your upcoming events',
                'show_events_attending',
              )}
              {renderSettingRow(
                'Show Past Events',
                "Show events you've attended",
                'show_events_attended',
              )}
              {renderSettingRow('Show Check-ins', 'Display your event check-ins', 'show_check_ins')}
              {renderSettingRow(
                'Show Leaderboard Rank',
                'Appear on public leaderboards',
                'show_leaderboard_rank',
              )}
              {renderSettingRow('Show Posts', 'Make your posts visible', 'show_posts')}
              {renderSettingRow('Show Likes', "Show posts you've liked", 'show_likes')}
              {renderSettingRow('Show Comments', 'Display your comments', 'show_comments')}
            </>,
          )}

          {/* Discovery Settings */}
          {renderCollapsibleSection(
            'Discovery',
            'discovery',
            'search',
            <>
              {renderSettingRow(
                'Searchable by Username',
                'Allow others to find you by username',
                'searchable_by_username',
              )}
              {renderSettingRow(
                'Appear in Suggestions',
                'Show up in user suggestions',
                'appear_in_suggestions',
              )}
              {renderSettingRow(
                'Show in Event Attendees',
                'Appear in event attendee lists',
                'appear_in_event_attendees',
              )}
              {renderSettingRow(
                'Appear in Nearby',
                'Show up in nearby dancer searches',
                'appear_in_nearby',
              )}
            </>,
          )}

          {/* Interaction Settings */}
          {renderCollapsibleSection(
            'Interactions',
            'interactions',
            'chatbubbles',
            <>
              {renderSettingRow(
                'Allow Event Invites',
                'Let others invite you to events',
                'allow_event_invites',
              )}
              <View style={styles.divider} />
              <Text style={styles.subsectionTitle}>Who can message you?</Text>
              {(['everyone', 'bonds_only', 'none'] as AllowMessagesFrom[]).map(option => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.optionRow,
                    settings.allow_messages === option && styles.optionRowActive,
                  ]}
                  onPress={() => updateSetting('allow_messages', option)}
                >
                  <Text style={styles.optionText}>
                    {option === 'everyone'
                      ? 'Everyone'
                      : option === 'bonds_only'
                        ? 'Bonds Only'
                        : 'No One'}
                  </Text>
                  {settings.allow_messages === option && (
                    <Ionicons name="checkmark" size={18} color="#FF1493" />
                  )}
                </TouchableOpacity>
              ))}
              <View style={styles.divider} />
              <Text style={styles.subsectionTitle}>Who can send bond requests?</Text>
              {(['everyone', 'mutual_events', 'none'] as AllowBondRequestsFrom[]).map(option => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.optionRow,
                    settings.allow_bond_requests === option && styles.optionRowActive,
                  ]}
                  onPress={() => updateSetting('allow_bond_requests', option)}
                >
                  <Text style={styles.optionText}>
                    {option === 'everyone'
                      ? 'Everyone'
                      : option === 'mutual_events'
                        ? 'Event Attendees'
                        : 'No One'}
                  </Text>
                  {settings.allow_bond_requests === option && (
                    <Ionicons name="checkmark" size={18} color="#FF1493" />
                  )}
                </TouchableOpacity>
              ))}
            </>,
          )}

          {/* Notification Privacy */}
          {renderCollapsibleSection(
            'Notification Privacy',
            'notifications',
            'notifications',
            <>
              {renderSettingRow(
                'Notify Bonds on Check-in',
                'Alert your bonds when you check in',
                'notify_bonds_on_check_in',
              )}
              {renderSettingRow(
                'Notify Bonds on Achievements',
                'Share your achievements with bonds',
                'notify_bonds_on_achievement',
              )}
            </>,
          )}

          {/* Info Box */}
          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={20} color="rgba(255,255,255,0.4)" />
            <Text style={styles.infoText}>
              Your privacy settings control who can see your profile and interact with you. Changes
              are saved automatically.
            </Text>
          </View>
        </ScrollView>
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
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: fs(20),
    fontWeight: '700',
    color: 'white',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: hs(20),
  },
  section: {
    borderRadius: ms(16),
    marginBottom: vs(16),
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: ms(16),
    gap: hs(12),
  },
  sectionTitle: {
    flex: 1,
    fontSize: fs(16),
    fontWeight: '600',
    color: 'white',
  },
  sectionContent: {
    padding: ms(16),
    paddingTop: 0,
  },
  sectionDescription: {
    fontSize: fs(13),
    color: 'rgba(255,255,255,0.6)',
    marginBottom: vs(16),
  },
  presetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: ms(16),
    borderRadius: ms(12),
    backgroundColor: 'rgba(255,255,255,0.03)',
    marginBottom: vs(8),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  presetOptionActive: {
    backgroundColor: 'rgba(255,20,147,0.1)',
    borderColor: 'rgba(255,20,147,0.3)',
  },
  presetInfo: {
    flex: 1,
    marginLeft: hs(12),
  },
  presetLabel: {
    fontSize: fs(15),
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    marginBottom: vs(2),
  },
  presetLabelActive: {
    color: 'white',
  },
  presetDescription: {
    fontSize: fs(12),
    color: 'rgba(255,255,255,0.5)',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: vs(12),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  settingInfo: {
    flex: 1,
    marginRight: hs(16),
  },
  settingTitle: {
    fontSize: fs(14),
    fontWeight: '500',
    color: 'white',
    marginBottom: vs(2),
  },
  settingDisabled: {
    color: 'rgba(255,255,255,0.4)',
  },
  settingDescription: {
    fontSize: fs(12),
    color: 'rgba(255,255,255,0.5)',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: vs(16),
  },
  subsectionTitle: {
    fontSize: fs(14),
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    marginBottom: vs(12),
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: ms(12),
    borderRadius: ms(8),
    marginBottom: vs(8),
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  optionRowActive: {
    backgroundColor: 'rgba(255,20,147,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,20,147,0.3)',
  },
  optionText: {
    fontSize: fs(14),
    color: 'white',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: ms(12),
    padding: ms(16),
    marginBottom: vs(24),
  },
  infoText: {
    flex: 1,
    fontSize: fs(12),
    color: 'rgba(255,255,255,0.5)',
    marginLeft: hs(8),
    lineHeight: fs(18),
  },
})
