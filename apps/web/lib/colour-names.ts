/**
 * Plain-English names for hex colours, so a combo the user did not name can
 * still be told apart: "Navy, Mustard, Cream" rather than "Untitled".
 *
 * Deliberately a short list of names people actually use for clothes, not the
 * 140 CSS names — "Mustard" is useful here, "PapayaWhip" is not.
 */
const NAMED_COLOURS: ReadonlyArray<readonly [name: string, hex: string]> = [
  ['Black', '#000000'],
  ['Charcoal', '#36454f'],
  ['Grey', '#8e8e8e'],
  ['Silver', '#c0c0c0'],
  ['White', '#ffffff'],
  ['Cream', '#f5f0dc'],
  ['Beige', '#d9c7a7'],
  ['Tan', '#c19a6b'],
  ['Brown', '#6f4e37'],
  ['Burgundy', '#800020'],
  ['Red', '#d0312d'],
  ['Coral', '#ff7f50'],
  ['Pink', '#f4a6c0'],
  ['Hot pink', '#e0218a'],
  ['Orange', '#f28c28'],
  ['Mustard', '#e1ad01'],
  ['Yellow', '#f7e04b'],
  ['Gold', '#d4af37'],
  ['Olive', '#708238'],
  ['Green', '#3a9d23'],
  ['Sage', '#9caf88'],
  ['Mint', '#a8e6cf'],
  ['Teal', '#008080'],
  ['Turquoise', '#40e0d0'],
  ['Sky blue', '#87ceeb'],
  ['Blue', '#1f5fbf'],
  ['Navy', '#1f2a44'],
  ['Lavender', '#b9a6e0'],
  ['Purple', '#6a3d9a'],
  ['Plum', '#8e4585'],
]

const MAX_NAMES_SHOWN = 3

function toRgb(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.replace('#', ''), 16)
  return [(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff]
}

/**
 * The "redmean" weighting: a cheap approximation of how different two colours
 * look to a person, much closer than plain RGB distance without the cost of
 * converting to a perceptual colour space.
 */
function perceivedDistance(a: [number, number, number], b: [number, number, number]): number {
  const redMean = (a[0] + b[0]) / 2
  const [dr, dg, db] = [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
  return Math.sqrt((2 + redMean / 256) * dr * dr + 4 * dg * dg + (2 + (255 - redMean) / 256) * db * db)
}

const NAMED_RGB = NAMED_COLOURS.map(([name, hex]) => ({ name, rgb: toRgb(hex) }))

export function nearestColourName(hex: string): string {
  const rgb = toRgb(hex)
  let best = NAMED_RGB[0]
  let bestDistance = Infinity

  for (const named of NAMED_RGB) {
    const distance = perceivedDistance(rgb, named.rgb)
    if (distance < bestDistance) {
      best = named
      bestDistance = distance
    }
  }

  return best.name
}

/**
 * What to call a combo: its own name if it has one, otherwise its colours'
 * names, de-duplicated so two shades of navy read as "Navy" once.
 */
export function comboDisplayName(name: string | null | undefined, hexes: string[]): string {
  const own = name?.trim()
  if (own) return own
  if (hexes.length === 0) return 'Untitled combo'

  const names = [...new Set(hexes.map(nearestColourName))]
  const shown = names.slice(0, MAX_NAMES_SHOWN).join(', ')
  return names.length > MAX_NAMES_SHOWN ? `${shown} +${names.length - MAX_NAMES_SHOWN}` : shown
}
