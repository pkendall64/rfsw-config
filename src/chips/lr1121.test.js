import { describe, it, expect } from 'vitest'
import {
  LR1121_ELRS_DEFAULT_BYTES,
  computeUsedDioMaskFromRows,
  encodeLr1121,
  decodeLr1121,
  packDioLevels,
  unpackDioLevels,
  validateLr1121,
} from './lr1121.js'

describe('LR1121_ELRS_DEFAULT_BYTES', () => {
  it('matches ExpressLRS LR1121.cpp else-branch defaults', () => {
    expect([...LR1121_ELRS_DEFAULT_BYTES]).toEqual([15, 0, 4, 8, 8, 2, 0, 1])
  })
})

describe('packDioLevels / unpackDioLevels', () => {
  it('round-trips', () => {
    const levels = [1, 0, 1, 0, 1]
    expect(unpackDioLevels(packDioLevels(levels))).toEqual(levels)
  })

  it('maps LSB to DIO5 (hand-checked 5-DIO example)', () => {
    // Only DIO5 high → bit 0 set → value 1
    expect(packDioLevels([1, 0, 0, 0, 0])).toBe(1)
    // DIO10 high → bit 4 → 16
    expect(packDioLevels([0, 0, 0, 0, 1])).toBe(16)
  })
})

describe('computeUsedDioMaskFromRows', () => {
  it('matches ELRS default rows (OR = 0x0F)', () => {
    const st = decodeLr1121([...LR1121_ELRS_DEFAULT_BYTES])
    expect(computeUsedDioMaskFromRows(st.rows)).toBe(0x0f)
    expect(st.usedDioMask).toBe(0x0f)
  })
})

describe('encodeLr1121 / decodeLr1121', () => {
  it('round-trips ELRS firmware defaults', () => {
    const state = decodeLr1121([...LR1121_ELRS_DEFAULT_BYTES])
    const { rows } = state
    const bytes = encodeLr1121({ rows })
    expect(bytes).toEqual([...LR1121_ELRS_DEFAULT_BYTES])
  })

  it('encode matches known vector (byte 0 derived from rows only)', () => {
    const state = decodeLr1121([15, 0, 4, 8, 8, 2, 0, 1])
    expect(encodeLr1121({ rows: state.rows })).toEqual([15, 0, 4, 8, 8, 2, 0, 1])
  })

  it('always sets byte 0 to OR(rows)', () => {
    const rows = decodeLr1121([...LR1121_ELRS_DEFAULT_BYTES]).rows
    expect(encodeLr1121({ rows })[0]).toBe(0x0f)
  })
})

describe('validateLr1121', () => {
  it('warns on wrong length', () => {
    expect(validateLr1121([1, 2, 3]).length).toBeGreaterThan(0)
  })

  it('is quiet for consistent defaults', () => {
    expect(validateLr1121([...LR1121_ELRS_DEFAULT_BYTES])).toEqual([])
  })

  it('warns when byte 0 is not OR of mode rows', () => {
    const bad = [0, 0, 4, 8, 8, 2, 0, 1]
    const w = validateLr1121(bad)
    expect(w.some((m) => m.includes('bitwise OR'))).toBe(true)
  })
})
