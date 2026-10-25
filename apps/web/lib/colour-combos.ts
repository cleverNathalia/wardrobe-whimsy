import type { Prisma } from '@prisma/client'
import type { ColourComboCreate, ColourComboUpdate } from '@wardrobe-whimsy/api-client'
import { prisma } from './prisma'
import { assertOutfitInWardrobe, getWardrobe, OutfitNotFoundError, toOutfitWithItems } from './wardrobe-db'
import type { ColourCombo, ColourComboWithOutfits, SwatchSource } from './wardrobe-types'

export class ColourComboNotFoundError extends Error {
  constructor() {
    super('Colour combo not found')
    this.name = 'ColourComboNotFoundError'
  }
}

const listInclude = {
  swatches: { orderBy: { order: 'asc' } },
  outfits: { select: { outfitId: true } },
} satisfies Prisma.ColourComboInclude

const detailInclude = {
  swatches: { orderBy: { order: 'asc' } },
  outfits: {
    include: {
      outfit: { include: { items: { include: { clothingItem: true }, orderBy: { zIndex: 'asc' } } } },
    },
  },
} satisfies Prisma.ColourComboInclude

type ComboRow = Prisma.ColourComboGetPayload<{ include: typeof listInclude }>
type ComboDetailRow = Prisma.ColourComboGetPayload<{ include: typeof detailInclude }>

function toSwatches(row: ComboRow | ComboDetailRow) {
  return row.swatches.map((swatch) => ({
    id: swatch.id,
    hex: swatch.hex,
    label: swatch.label,
    source: swatch.source as SwatchSource,
    order: swatch.order,
  }))
}

function toColourCombo(row: ComboRow | ComboDetailRow): ColourCombo {
  return {
    id: row.id,
    wardrobeId: row.wardrobeId,
    name: row.name,
    notes: row.notes,
    swatches: toSwatches(row),
    outfitIds: row.outfits.map((link) => link.outfitId),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function toColourComboWithOutfits(row: ComboDetailRow): ColourComboWithOutfits {
  return { ...toColourCombo(row), outfits: row.outfits.map((link) => toOutfitWithItems(link.outfit)) }
}

/** Swatch rows in the order given; an empty label is stored as no label. */
function swatchRows(swatches: ColourComboCreate['swatches']) {
  return swatches.map((swatch, order) => ({
    hex: swatch.hex,
    label: swatch.label || null,
    source: swatch.source,
    order,
  }))
}

/** Rejects outfit ids from another wardrobe, rather than linking across users. */
async function assertOutfitsInWardrobe(wardrobeId: string, outfitIds: string[]) {
  const unique = [...new Set(outfitIds)]
  const found = await prisma.outfit.count({ where: { wardrobeId, id: { in: unique } } })
  if (found !== unique.length) throw new OutfitNotFoundError()
  return unique
}

export async function listColourCombos(wardrobeId: string, userId: string): Promise<ColourCombo[]> {
  // Verify ownership
  await getWardrobe(wardrobeId, userId)

  const rows = await prisma.colourCombo.findMany({
    where: { wardrobeId },
    include: listInclude,
    orderBy: { updatedAt: 'desc' },
  })
  return rows.map(toColourCombo)
}

export async function getColourCombo(
  wardrobeId: string,
  userId: string,
  comboId: string
): Promise<ColourComboWithOutfits | null> {
  // Verify ownership
  await getWardrobe(wardrobeId, userId)

  const row = await prisma.colourCombo.findFirst({
    where: { id: comboId, wardrobeId },
    include: detailInclude,
  })
  return row ? toColourComboWithOutfits(row) : null
}

export async function createColourCombo(
  wardrobeId: string,
  userId: string,
  data: ColourComboCreate
): Promise<ColourCombo> {
  // Verify ownership
  await getWardrobe(wardrobeId, userId)
  const outfitIds = await assertOutfitsInWardrobe(wardrobeId, data.outfitIds ?? [])

  const row = await prisma.colourCombo.create({
    data: {
      wardrobeId,
      name: data.name || null,
      notes: data.notes || null,
      swatches: { create: swatchRows(data.swatches) },
      outfits: { create: outfitIds.map((outfitId) => ({ outfitId })) },
    },
    include: listInclude,
  })
  return toColourCombo(row)
}

/**
 * Fields left out are left alone. `swatches` and `outfitIds`, when sent,
 * replace the whole list — the form always sends the full set, which is
 * simpler and safer than diffing individual rows.
 */
export async function updateColourCombo(
  wardrobeId: string,
  userId: string,
  comboId: string,
  data: ColourComboUpdate
): Promise<ColourCombo | null> {
  // Verify ownership
  await getWardrobe(wardrobeId, userId)

  const existing = await prisma.colourCombo.findFirst({ where: { id: comboId, wardrobeId } })
  if (!existing) return null

  const outfitIds = data.outfitIds ? await assertOutfitsInWardrobe(wardrobeId, data.outfitIds) : null

  const row = await prisma.$transaction(async (tx) => {
    if (data.swatches) {
      await tx.colourSwatch.deleteMany({ where: { comboId } })
      await tx.colourSwatch.createMany({
        data: swatchRows(data.swatches).map((swatch) => ({ ...swatch, comboId })),
      })
    }

    if (outfitIds) {
      await tx.outfitColourCombo.deleteMany({ where: { comboId } })
      await tx.outfitColourCombo.createMany({ data: outfitIds.map((outfitId) => ({ outfitId, comboId })) })
    }

    return tx.colourCombo.update({
      where: { id: comboId },
      data: {
        ...(data.name !== undefined && { name: data.name || null }),
        ...(data.notes !== undefined && { notes: data.notes || null }),
      },
      include: listInclude,
    })
  })

  return toColourCombo(row)
}

export async function deleteColourCombo(wardrobeId: string, userId: string, comboId: string): Promise<boolean> {
  // Verify ownership
  await getWardrobe(wardrobeId, userId)

  // Swatches and outfit links go with it (onDelete: Cascade). No Drive files
  // to clean up: a colour sampled from a photo keeps the colour, not the photo.
  const { count } = await prisma.colourCombo.deleteMany({ where: { id: comboId, wardrobeId } })
  return count > 0
}

/**
 * The same many-to-many link, edited from the outfit's side: replaces which
 * combos this outfit belongs to.
 */
export async function setOutfitColourCombos(
  wardrobeId: string,
  userId: string,
  outfitId: string,
  comboIds: string[]
): Promise<void> {
  // Verify ownership
  await getWardrobe(wardrobeId, userId)
  await assertOutfitInWardrobe(wardrobeId, outfitId)

  const unique = [...new Set(comboIds)]
  const found = await prisma.colourCombo.count({ where: { wardrobeId, id: { in: unique } } })
  if (found !== unique.length) throw new ColourComboNotFoundError()

  await prisma.$transaction([
    prisma.outfitColourCombo.deleteMany({ where: { outfitId } }),
    prisma.outfitColourCombo.createMany({ data: unique.map((comboId) => ({ outfitId, comboId })) }),
  ])
}
