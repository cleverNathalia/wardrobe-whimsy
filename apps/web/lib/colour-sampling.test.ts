import { describe, expect, it } from 'vitest'
import { averageColourAt, rgbToHex } from './colour-sampling'

/** An RGBA image filled with one colour, with optional per-pixel overrides. */
function image(width: number, height: number, fill: number[], overrides: Record<string, number[]> = {}) {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      data.set(overrides[`${x},${y}`] ?? fill, (y * width + x) * 4)
    }
  }
  return data
}

describe('rgbToHex', () => {
  it('pads each channel to two digits', () => {
    expect(rgbToHex(0, 15, 255)).toBe('#000fff')
  })

  it('rounds fractional averages', () => {
    expect(rgbToHex(127.6, 0.4, 254.5)).toBe('#8000ff')
  })
})

describe('averageColourAt', () => {
  it('reads a flat colour as itself', () => {
    expect(averageColourAt(image(10, 10, [79, 121, 66, 255]), 10, 10, 5, 5)).toBe('#4f7942')
  })

  it('averages out a single stray pixel in the 5×5 square', () => {
    // 24 black pixels and one white one: (255 / 25) ≈ 10 per channel.
    const data = image(10, 10, [0, 0, 0, 255], { '5,5': [255, 255, 255, 255] })
    expect(averageColourAt(data, 10, 10, 5, 5)).toBe('#0a0a0a')
  })

  it('ignores pixels outside the square', () => {
    const data = image(10, 10, [0, 0, 0, 255], { '9,9': [255, 255, 255, 255] })
    expect(averageColourAt(data, 10, 10, 2, 2)).toBe('#000000')
  })

  it('clips the square at the edge of the image instead of wrapping', () => {
    // At the far right, a wrapped square would reach the white left column.
    const data = image(10, 10, [0, 0, 255, 255], { '0,0': [255, 255, 255, 255], '0,1': [255, 255, 255, 255] })
    expect(averageColourAt(data, 10, 10, 9, 0)).toBe('#0000ff')
  })

  it('clamps a tap that lands just outside the image', () => {
    expect(averageColourAt(image(4, 4, [200, 0, 0, 255]), 4, 4, -3, 12)).toBe('#c80000')
  })

  it('skips transparent pixels, and gives up if there is nothing else', () => {
    const cutOut = image(10, 10, [0, 0, 0, 0], { '5,5': [255, 0, 0, 255] })
    expect(averageColourAt(cutOut, 10, 10, 5, 5)).toBe('#ff0000')
    expect(averageColourAt(image(10, 10, [0, 0, 0, 0]), 10, 10, 5, 5)).toBeNull()
  })
})
