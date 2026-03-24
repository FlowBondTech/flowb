import { Platform, TextStyle } from 'react-native';
import { colors } from './colors';

type FontWeight = TextStyle['fontWeight'];
function weight(value: '400' | '500' | '600' | '700'): FontWeight {
  return Platform.select<FontWeight>({ ios: value, default: value });
}

const systemFont = Platform.select({ ios: 'System', default: undefined });

export const typography = {
  hero: {
    fontFamily: systemFont,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: weight('700'),
    letterSpacing: -0.5,
    color: colors.text.primary,
  } satisfies TextStyle,

  title: {
    fontFamily: systemFont,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: weight('600'),
    letterSpacing: 0,
    color: colors.text.primary,
  } satisfies TextStyle,

  headline: {
    fontFamily: systemFont,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: weight('600'),
    letterSpacing: 0,
    color: colors.text.primary,
  } satisfies TextStyle,

  body: {
    fontFamily: systemFont,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: weight('400'),
    letterSpacing: 0,
    color: colors.text.primary,
  } satisfies TextStyle,

  caption: {
    fontFamily: systemFont,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: weight('400'),
    letterSpacing: 0,
    color: colors.text.secondary,
  } satisfies TextStyle,

  micro: {
    fontFamily: systemFont,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: weight('500'),
    letterSpacing: 1.5,
    textTransform: 'uppercase' as const,
    color: colors.text.secondary,
  } satisfies TextStyle,
} as const;

export type Typography = typeof typography;
export type TypographyVariant = keyof Typography;
