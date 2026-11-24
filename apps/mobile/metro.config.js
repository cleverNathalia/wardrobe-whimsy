const { getDefaultConfig } = require('expo/metro-config')
const { withNativeWind } = require('nativewind/metro')

// Expo configures Metro for the pnpm monorepo on its own (SDK 54+); this only
// adds NativeWind's Tailwind compilation.
module.exports = withNativeWind(getDefaultConfig(__dirname), { input: './global.css' })
