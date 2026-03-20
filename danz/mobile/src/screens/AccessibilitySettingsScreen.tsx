import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import * as Haptics from 'expo-haptics'
import type React from 'react'
import { ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  type FontSizeLevel,
  useAccessibility,
  useResponsiveStyles,
} from '../contexts/AccessibilityContext'
import { useTheme } from '../contexts/ThemeContext'

export const AccessibilitySettingsScreen: React.FC = () => {
  const { theme } = useTheme()
  const navigation = useNavigation()
  const {
    fontSizeLevel,
    setFontSizeLevel,
    reduceMotion,
    setReduceMotion,
    highContrast,
    setHighContrast,
    boldText,
    setBoldText,
    deviceType,
  } = useAccessibility()
  const styles = useResponsiveStyles()

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    navigation.goBack()
  }

  const fontSizeLevels: { level: FontSizeLevel; label: string; description: string }[] = [
    { level: 'xs', label: 'XS', description: 'Extra Small' },
    { level: 'sm', label: 'S', description: 'Small' },
    { level: 'md', label: 'M', description: 'Medium (Default)' },
    { level: 'lg', label: 'L', description: 'Large' },
    { level: 'xl', label: 'XL', description: 'Extra Large' },
    { level: 'xxl', label: 'XXL', description: 'Maximum' },
  ]

  const handleFontSizeChange = (level: FontSizeLevel) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setFontSizeLevel(level)
  }

  const renderFontSizeSelector = () => (
    <View style={localStyles.section}>
      <View style={localStyles.sectionHeader}>
        <MaterialCommunityIcons name="format-size" size={24} color={theme.colors.primary} />
        <Text style={[styles.text.h3, localStyles.sectionTitle, { color: theme.colors.text }]}>
          Text Size
        </Text>
      </View>

      <Text
        style={[
          styles.text.bodySmall,
          localStyles.sectionDescription,
          { color: theme.colors.textSecondary },
        ]}
      >
        Adjust text size for better readability. Optimized for {deviceType} screens.
      </Text>

      <View style={localStyles.fontSizeGrid}>
        {fontSizeLevels.map(item => (
          <TouchableOpacity
            key={item.level}
            style={[
              localStyles.fontSizeOption,
              {
                backgroundColor: theme.colors.card,
                borderColor:
                  fontSizeLevel === item.level ? theme.colors.primary : theme.colors.border,
              },
              fontSizeLevel === item.level && localStyles.fontSizeOptionActive,
            ]}
            onPress={() => handleFontSizeChange(item.level)}
            activeOpacity={0.8}
          >
            <Text
              style={[
                localStyles.fontSizeLabel,
                {
                  color: fontSizeLevel === item.level ? theme.colors.primary : theme.colors.text,
                  fontSize: getFontSizeForLevel(item.level),
                },
              ]}
            >
              {item.label}
            </Text>
            <Text
              style={[
                styles.text.caption,
                {
                  color:
                    fontSizeLevel === item.level
                      ? theme.colors.primary
                      : theme.colors.textSecondary,
                  marginTop: 4,
                },
              ]}
              numberOfLines={1}
            >
              {item.description}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={[localStyles.previewCard, { backgroundColor: theme.colors.card }]}>
        <Text style={[styles.text.caption, { color: theme.colors.textSecondary }]}>Preview</Text>
        <Text style={[styles.text.h3, { color: theme.colors.text, marginTop: 8 }]}>
          Large Header Text
        </Text>
        <Text style={[styles.text.body, { color: theme.colors.text, marginTop: 4 }]}>
          This is how your regular body text will appear with the current settings.
        </Text>
        <Text style={[styles.text.bodySmall, { color: theme.colors.textSecondary, marginTop: 4 }]}>
          Small text and captions will look like this.
        </Text>
      </View>
    </View>
  )

  const renderToggleOption = (
    icon: string,
    title: string,
    description: string,
    value: boolean,
    onValueChange: (value: boolean) => void,
  ) => (
    <View style={[localStyles.toggleOption, { backgroundColor: theme.colors.card }]}>
      <MaterialCommunityIcons name={icon as any} size={24} color={theme.colors.primary} />
      <View style={localStyles.toggleContent}>
        <Text style={[styles.text.body, { color: theme.colors.text, fontWeight: '600' }]}>
          {title}
        </Text>
        <Text style={[styles.text.bodySmall, { color: theme.colors.textSecondary, marginTop: 2 }]}>
          {description}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
        thumbColor={value ? theme.colors.accent : '#f4f3f4'}
      />
    </View>
  )

  const getFontSizeForLevel = (level: FontSizeLevel): number => {
    const sizes = {
      xs: 10,
      sm: 12,
      md: 14,
      lg: 16,
      xl: 18,
      xxl: 20,
    }
    return sizes[level]
  }

  return (
    <SafeAreaView style={[localStyles.container, { backgroundColor: theme.colors.background }]}>
      <View style={localStyles.modalHeader}>
        <View style={localStyles.dragIndicator} />
        <View style={localStyles.headerRow}>
          <Text style={[styles.text.h2, localStyles.modalTitle, { color: theme.colors.text }]}>
            Accessibility
          </Text>
          <TouchableOpacity style={localStyles.closeButton} onPress={handleClose}>
            <Ionicons name="close" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={localStyles.scrollView} showsVerticalScrollIndicator={false}>
        {renderFontSizeSelector()}

        <View style={localStyles.section}>
          <View style={localStyles.sectionHeader}>
            <MaterialCommunityIcons name="eye" size={24} color={theme.colors.primary} />
            <Text style={[styles.text.h3, localStyles.sectionTitle, { color: theme.colors.text }]}>
              Visual Settings
            </Text>
          </View>

          {renderToggleOption(
            'format-bold',
            'Bold Text',
            'Make all text appear bolder for improved readability',
            boldText,
            setBoldText,
          )}

          {renderToggleOption(
            'contrast-box',
            'High Contrast',
            'Increase color contrast for better visibility',
            highContrast,
            setHighContrast,
          )}

          {renderToggleOption(
            'motion-play-outline',
            'Reduce Motion',
            'Minimize animations and transitions',
            reduceMotion,
            setReduceMotion,
          )}
        </View>

        <View style={[localStyles.infoCard, { backgroundColor: theme.colors.card }]}>
          <Ionicons name="information-circle" size={20} color={theme.colors.info} />
          <Text
            style={[styles.text.bodySmall, { color: theme.colors.text, marginLeft: 8, flex: 1 }]}
          >
            These settings are automatically optimized for your {deviceType} device to ensure the
            best reading experience.
          </Text>
        </View>

        <View style={localStyles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  )
}

const localStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  modalHeader: {
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  dragIndicator: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalTitle: {
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  closeButton: {
    position: 'absolute',
    right: 24,
    padding: 4,
  },
  section: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontWeight: '600',
    marginLeft: 12,
  },
  sectionDescription: {
    marginBottom: 16,
  },
  fontSizeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  fontSizeOption: {
    flex: 1,
    minWidth: 100,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
  },
  fontSizeOptionActive: {
    borderWidth: 2,
  },
  fontSizeLabel: {
    fontWeight: '700',
  },
  previewCard: {
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  toggleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  toggleContent: {
    flex: 1,
    marginLeft: 12,
    marginRight: 12,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 24,
    marginTop: 8,
    borderRadius: 12,
  },
  bottomSpacer: {
    height: 100,
  },
})
