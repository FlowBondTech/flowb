import { Platform, ViewStyle } from 'react-native';
import { colors } from './colors';

interface GlassConfig {
  backgroundIOS: string;
  backgroundAndroid: string;
  borderColor: string;
}

export type GlassVariant = 'subtle' | 'medium' | 'heavy' | 'glow';

const variantMap: Record<GlassVariant, GlassConfig> = {
  subtle: {
    backgroundIOS: colors.glass.subtle,
    backgroundAndroid: 'rgba(10,10,26,0.85)',
    borderColor: colors.border.subtle,
  },
  medium: {
    backgroundIOS: colors.glass.medium,
    backgroundAndroid: 'rgba(18,18,42,0.88)',
    borderColor: colors.border.default,
  },
  heavy: {
    backgroundIOS: colors.glass.heavy,
    backgroundAndroid: 'rgba(18,18,42,0.92)',
    borderColor: colors.border.bright,
  },
  glow: {
    backgroundIOS: colors.glass.medium,
    backgroundAndroid: 'rgba(18,18,42,0.88)',
    borderColor: colors.accent.primary,
  },
};

export function glassStyle(variant: GlassVariant): ViewStyle {
  const cfg = variantMap[variant];
  const base: ViewStyle = {
    backgroundColor: Platform.select({
      ios: cfg.backgroundIOS,
      default: cfg.backgroundAndroid,
    }),
    borderWidth: 1,
    borderColor: cfg.borderColor,
    borderRadius: 16,
    overflow: 'hidden',
  };

  if (variant === 'glow') {
    return {
      ...base,
      ...Platform.select({
        ios: {
          shadowColor: colors.accent.primary,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.35,
          shadowRadius: 16,
        },
        android: { elevation: 8 },
        default: {},
      }),
    };
  }
  return base;
}

export function glassFlat(variant: GlassVariant): ViewStyle {
  const style = glassStyle(variant);
  return { ...style, borderRadius: 0 };
}

export function glassPill(variant: GlassVariant): ViewStyle {
  const style = glassStyle(variant);
  return { ...style, borderRadius: 999 };
}
