import { LayoutDashboard, Shirt, Layers, Camera, Palette, Settings } from 'lucide-react'

export const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/wardrobe', label: 'Wardrobe', icon: Shirt },
  { href: '/outfits', label: 'Outfits', icon: Layers },
  { href: '/looks', label: 'Looks', icon: Camera },
  // "Colours", not "Colour combos": the bottom nav has six tabs on a 360px phone.
  { href: '/colour-combos', label: 'Colours', icon: Palette },
  { href: '/settings', label: 'Settings', icon: Settings },
] as const
