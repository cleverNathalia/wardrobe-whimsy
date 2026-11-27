import { LayoutDashboard, Shirt, Layers, Luggage, Camera, Palette, Settings } from 'lucide-react'

export const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/wardrobe', label: 'Wardrobe', icon: Shirt },
  { href: '/outfits', label: 'Outfits', icon: Layers },
  { href: '/trips', label: 'Trips', icon: Luggage },
  { href: '/looks', label: 'Looks', icon: Camera },
  // "Colours", not "Colour combos": bottom-nav tabs are 72px wide. The bottom nav
  // scrolls, so order matters there — the most-used tabs go first.
  { href: '/colour-combos', label: 'Colours', icon: Palette },
  { href: '/settings', label: 'Settings', icon: Settings },
] as const
