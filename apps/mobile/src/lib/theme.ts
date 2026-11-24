import { lightColors } from '@wardrobe-whimsy/design-tokens'

/**
 * Token colours as plain strings, for the places NativeWind classes cannot
 * reach — navigator header options and the refresh spinner.
 */
const toHsl = (channels: string) => `hsl(${channels.split(' ').join(', ')})`

export const colours = {
  background: toHsl(lightColors.background),
  foreground: toHsl(lightColors.foreground),
  primary: toHsl(lightColors.primary),
  muted: toHsl(lightColors.muted),
  mutedForeground: toHsl(lightColors.mutedForeground),
}
