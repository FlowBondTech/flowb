import { StyleSheet, Text, View } from 'react-native'
import { designSystem } from '../styles/designSystem'
import { deviceInfo } from '../styles/responsive'

export const DeviceInfoBadge = () => {
  if (__DEV__) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>
          {deviceInfo.type.toUpperCase()} • {deviceInfo.width}x{deviceInfo.height}
        </Text>
      </View>
    )
  }
  return null
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    right: 10,
    backgroundColor: 'rgba(255, 110, 199, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 9999,
  },
  text: {
    fontSize: 10,
    color: designSystem.colors.primary,
    fontWeight: 'bold',
  },
})
