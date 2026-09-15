import { LayoutDashboard, Shirt, Layers, Camera, Settings } from 'lucide-react'

export const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/wardrobe', label: 'Wardrobe', icon: Shirt },
  { href: '/outfits', label: 'Outfits', icon: Layers },
  { href: '/looks', label: 'Looks', icon: Camera },
  { href: '/settings', label: 'Settings', icon: Settings },
] as const
