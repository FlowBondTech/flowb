import type React from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native'
import { designSystem } from '../../styles/designSystem'
import { moderateScale, scale, verticalScale } from '../../styles/responsive'

export type EventTabType = 'upcoming' | 'joined' | 'past' | 'created'

interface EventTabsProps {
  selectedTab: EventTabType
  onTabChange: (tab: EventTabType) => void
  showCreatedTab?: boolean
}

export const EventTabs: React.FC<EventTabsProps> = ({
  selectedTab,
  onTabChange,
  showCreatedTab = false,
}) => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.tabsContainer}
      contentContainerStyle={styles.tabsContent}
    >
      <TouchableOpacity
        style={[styles.tab, selectedTab === 'upcoming' && styles.activeTab]}
        onPress={() => onTabChange('upcoming')}
      >
        <Text style={[styles.tabText, selectedTab === 'upcoming' && styles.activeTabText]}>
          Upcoming
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.tab, selectedTab === 'joined' && styles.activeTab]}
        onPress={() => onTabChange('joined')}
      >
        <Text style={[styles.tabText, selectedTab === 'joined' && styles.activeTabText]}>
          Joined
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.tab, selectedTab === 'past' && styles.activeTab]}
        onPress={() => onTabChange('past')}
      >
        <Text style={[styles.tabText, selectedTab === 'past' && styles.activeTabText]}>Past</Text>
      </TouchableOpacity>

      {showCreatedTab && (
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'created' && styles.activeTab]}
          onPress={() => onTabChange('created')}
        >
          <Text style={[styles.tabText, selectedTab === 'created' && styles.activeTabText]}>
            Created
          </Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  tabsContainer: {
    marginBottom: verticalScale(16),
    maxHeight: verticalScale(40),
  },
  tabsContent: {
    paddingHorizontal: scale(20),
    gap: scale(10),
    flexDirection: 'row',
    alignItems: 'center',
  },
  tab: {
    paddingVertical: verticalScale(8),
    paddingHorizontal: scale(20),
    borderRadius: moderateScale(20),
    backgroundColor: `${designSystem.colors.white}08`,
    borderWidth: 1,
    borderColor: `${designSystem.colors.white}10`,
  },
  activeTab: {
    backgroundColor: designSystem.colors.primary,
    borderColor: designSystem.colors.primary,
  },
  tabText: {
    fontSize: moderateScale(14),
    color: designSystem.colors.textSecondary,
    fontWeight: '600',
  },
  activeTabText: {
    color: designSystem.colors.white,
    fontWeight: '700',
  },
})
