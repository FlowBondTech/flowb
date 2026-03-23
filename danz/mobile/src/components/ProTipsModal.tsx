import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { BlurView } from 'expo-blur'
import { LinearGradient } from 'expo-linear-gradient'
import type React from 'react'
import { Dimensions, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { designSystem } from '../styles/designSystem'
import { moderateScale, scale, verticalScale } from '../styles/responsive'
import { GlassCard } from './ui/AnimatedComponents'

const { width, height } = Dimensions.get('window')

interface ProTipsModalProps {
  visible: boolean
  onClose: () => void
}

const tips = [
  {
    icon: 'checkmark-circle',
    text: 'Move to the beat for higher scores',
    category: 'Scoring',
  },
  {
    icon: 'people',
    text: 'Sync with others for bonus rewards',
    category: 'Social',
  },
  {
    icon: 'time',
    text: 'Longer sessions = multiplier bonuses',
    category: 'Duration',
  },
  {
    icon: 'trending-up',
    text: 'Maintain consistency for streak bonuses',
    category: 'Consistency',
  },
  {
    icon: 'fitness',
    text: 'Mix dance styles to maximize points',
    category: 'Variety',
  },
  {
    icon: 'flash',
    text: 'Peak energy times give 2x rewards',
    category: 'Timing',
  },
]

export const ProTipsModal: React.FC<ProTipsModalProps> = ({ visible, onClose }) => {
  return (
    <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose}>
      <BlurView intensity={20} style={styles.modalContainer}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

        <View style={styles.modalContent}>
          <GlassCard style={styles.modalCard}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={styles.headerIcon}>
                <LinearGradient
                  colors={designSystem.colors.gradients.primary as any}
                  style={styles.headerIconGradient}
                >
                  <MaterialCommunityIcons
                    name="lightbulb-on"
                    size={24}
                    color={designSystem.colors.text}
                  />
                </LinearGradient>
              </View>
              <Text style={styles.modalTitle}>Pro Tips</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={designSystem.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Tips List */}
            <View style={styles.tipsList}>
              {tips.map((tip, index) => (
                <View key={index} style={styles.tipItem}>
                  <View style={styles.tipIcon}>
                    <Ionicons
                      name={tip.icon as any}
                      size={18}
                      color={designSystem.colors.success}
                    />
                  </View>
                  <View style={styles.tipContent}>
                    <Text style={styles.tipText}>{tip.text}</Text>
                    <Text style={styles.tipCategory}>{tip.category}</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Footer */}
            <TouchableOpacity onPress={onClose}>
              <LinearGradient
                colors={designSystem.colors.gradients.primary}
                style={styles.gotItButton}
              >
                <Text style={styles.gotItText}>Got it!</Text>
              </LinearGradient>
            </TouchableOpacity>
          </GlassCard>
        </View>
      </BlurView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContent: {
    width: width * 0.9,
    maxHeight: height * 0.7,
  },
  modalCard: {
    padding: scale(20),
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(20),
  },
  headerIcon: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    overflow: 'hidden',
    marginRight: scale(12),
  },
  headerIconGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    flex: 1,
    fontSize: moderateScale(18),
    color: designSystem.colors.text,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: scale(4),
  },
  tipsList: {
    marginBottom: verticalScale(20),
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: verticalScale(16),
    paddingHorizontal: scale(8),
  },
  tipIcon: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    backgroundColor: `${designSystem.colors.success}20`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(12),
  },
  tipContent: {
    flex: 1,
  },
  tipText: {
    fontSize: moderateScale(14),
    color: designSystem.colors.text,
    lineHeight: moderateScale(18),
    marginBottom: verticalScale(4),
  },
  tipCategory: {
    fontSize: moderateScale(12),
    color: designSystem.colors.primary,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  gotItButton: {
    paddingVertical: verticalScale(12),
    borderRadius: scale(12),
    alignItems: 'center',
  },
  gotItText: {
    fontSize: moderateScale(16),
    color: designSystem.colors.text,
    fontWeight: 'bold',
  },
})
