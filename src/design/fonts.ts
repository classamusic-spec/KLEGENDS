import {
  Cinzel_600SemiBold,
  Cinzel_700Bold,
} from '@expo-google-fonts/cinzel';
import {
  CormorantGaramond_500Medium,
  CormorantGaramond_500Medium_Italic,
  CormorantGaramond_600SemiBold,
} from '@expo-google-fonts/cormorant-garamond';
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
} from '@expo-google-fonts/manrope';

/**
 * Font families (SIL Open Font License, via @expo-google-fonts):
 * - Cinzel: display titles and card names.
 * - Manrope: interface text.
 * - Cormorant Garamond: Scripture and editorial passages.
 */
export const fontAssets = {
  Cinzel_600SemiBold,
  Cinzel_700Bold,
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  CormorantGaramond_500Medium,
  CormorantGaramond_500Medium_Italic,
  CormorantGaramond_600SemiBold,
} as const;

export const fonts = {
  display: 'Cinzel_600SemiBold',
  displayBold: 'Cinzel_700Bold',
  ui: 'Manrope_400Regular',
  uiMedium: 'Manrope_500Medium',
  uiSemiBold: 'Manrope_600SemiBold',
  uiBold: 'Manrope_700Bold',
  scripture: 'CormorantGaramond_500Medium',
  scriptureItalic: 'CormorantGaramond_500Medium_Italic',
  scriptureSemiBold: 'CormorantGaramond_600SemiBold',
} as const satisfies Record<string, keyof typeof fontAssets>;
