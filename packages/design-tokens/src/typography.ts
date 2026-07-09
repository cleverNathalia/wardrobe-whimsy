export const fonts = {
  serif: 'Newsreader, Georgia, serif',
  sans: 'Figtree, system-ui, sans-serif',
  mono: '"IBM Plex Mono", "Courier New", monospace',
} as const

export const typeScale = {
  display: { size: '3.5rem', lineHeight: '1.04', weight: '500', family: 'serif' },
  h1: { size: '2.25rem', lineHeight: '1.15', weight: '500', family: 'serif' },
  h2: { size: '1.75rem', lineHeight: '1.22', weight: '600', family: 'sans' },
  h3: { size: '1.375rem', lineHeight: '1.30', weight: '600', family: 'sans' },
  h4: { size: '1.125rem', lineHeight: '1.40', weight: '600', family: 'sans' },
  body: { size: '1rem', lineHeight: '1.60', weight: '400', family: 'sans' },
  small: { size: '0.875rem', lineHeight: '1.50', weight: '400', family: 'sans' },
  caption: { size: '0.75rem', lineHeight: '1.35', weight: '500', family: 'sans' },
} as const
