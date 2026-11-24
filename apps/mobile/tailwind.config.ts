import type { Config } from 'tailwindcss'
import { lightColors } from '@wardrobe-whimsy/design-tokens'

/**
 * Colours come from the same design tokens as the web app, so the two stay in
 * step. Tokens are stored as bare HSL channels ("30 33% 97%"); React Native
 * wants the comma form, "hsl(30, 33%, 97%)".
 *
 * Light only for now — the web app's dark tokens can follow once the screens
 * settle.
 */
const toKebab = (name: string) => name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)
const toHsl = (channels: string) => `hsl(${channels.split(' ').join(', ')})`

const colors = Object.fromEntries(
  Object.entries(lightColors).map(([name, channels]) => [toKebab(name), toHsl(channels)])
)

export default {
  content: ['./src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors,
      // Native fonts are one family per weight, loaded in src/app/_layout.tsx.
      fontFamily: {
        serif: ['Newsreader_500Medium'],
        sans: ['Figtree_400Regular'],
        'sans-medium': ['Figtree_500Medium'],
        'sans-semibold': ['Figtree_600SemiBold'],
      },
    },
  },
  plugins: [],
} satisfies Config
