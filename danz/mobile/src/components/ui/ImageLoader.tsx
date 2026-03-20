import { Ionicons } from '@expo/vector-icons'
import React, { useEffect, useState } from 'react'
import {
  Animated,
  Image,
  type ImageProps,
  type ImageStyle,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ViewStyle,
} from 'react-native'
import { getTransformedUrl, type TransformOptions } from '../../utils/supabaseTransforms'

interface ImageLoaderProps extends Omit<ImageProps, 'source'> {
  source: { uri: string } | number
  style?: ImageStyle | ImageStyle[]
  containerStyle?: ViewStyle
  fallbackIcon?: string
  fallbackIconSize?: number
  fallbackText?: string
  showRetry?: boolean
  onRetry?: () => void
  placeholderColor?: string
  transformOptions?: TransformOptions // Add Supabase transform options
}

export const ImageLoader: React.FC<ImageLoaderProps> = ({
  source,
  style,
  containerStyle,
  fallbackIcon = 'image-outline',
  fallbackIconSize = 40,
  fallbackText = 'Failed to load image',
  showRetry = true,
  onRetry,
  placeholderColor = '#2d1b69',
  transformOptions,
  ...imageProps
}) => {
  const [error, setError] = useState(false)
  const pulseAnim = React.useRef(new Animated.Value(1)).current

  useEffect(() => {
    // Always show pulsating animation in background
    if (!error) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.6,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
      ).start()
    } else {
      pulseAnim.setValue(1)
    }
  }, [error, pulseAnim])

  const handleError = () => {
    setError(true)
  }

  const handleRetry = () => {
    setError(false)
    if (onRetry) {
      onRetry()
    }
  }

  const imageStyles = StyleSheet.flatten([style])
  const containerStyles = StyleSheet.flatten([containerStyle])

  // Apply Supabase transformations if source is a URI and transform options are provided
  const imageSource = React.useMemo(() => {
    if (typeof source === 'object' && 'uri' in source && source.uri && transformOptions) {
      return { uri: getTransformedUrl(source.uri, transformOptions) }
    }
    return source
  }, [source, transformOptions])

  return (
    <View style={[styles.container, containerStyles]}>
      {/* Loading placeholder always shown in background */}
      {!error && (
        <Animated.View
          style={[
            styles.loadingContainer,
            imageStyles,
            {
              position: 'absolute',
              opacity: pulseAnim,
              backgroundColor: placeholderColor,
            },
          ]}
        >
          <Ionicons name="image-outline" size={30} color="rgba(255, 255, 255, 0.3)" />
        </Animated.View>
      )}

      {/* Error state */}
      {error && (
        <View style={[styles.errorContainer, imageStyles]}>
          <Ionicons name={fallbackIcon as any} size={fallbackIconSize} color="#888" />
          <Text style={styles.errorText}>{fallbackText}</Text>
          {showRetry && (
            <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
              <Ionicons name="refresh" size={20} color="#9333EA" />
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Actual Image - always rendered on top */}
      {!error && <Image {...imageProps} source={imageSource} style={style} onError={handleError} />}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 12,
    padding: 20,
  },
  errorText: {
    color: '#888',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(147, 51, 234, 0.1)',
    borderRadius: 20,
  },
  retryText: {
    color: '#9333EA',
    fontSize: 14,
    marginLeft: 4,
    fontWeight: '500',
  },
})
