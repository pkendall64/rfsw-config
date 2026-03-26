/**
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (C) 2025 contributors to rfsw-config
 */

import { describe, it, expect } from 'vitest'
import {
  LR2021_ELRS_DEFAULT_BYTES,
  encodeLr2021,
  decodeLr2021,
  validateLr2021,
  packColumnMask,
} from './lr2021.js'

function emptyRows() {
  const z = () => Array(7).fill(0)
  return {
    standby: z(),
    rx900: z(),
    tx900: z(),
    rx24: z(),
    tx24: z(),
  }
}

describe('encodeLr2021 / decodeLr2021', () => {
  it('round-trips without interrupt', () => {
    const rows = emptyRows()
    rows.standby[0] = 1
    rows.rx900[1] = 1
    rows.tx24[6] = 1
    const bytes = encodeLr2021({ rows, interruptDioIndex: null })
    const back = decodeLr2021(bytes)
    expect(back.interruptDioIndex).toBe(null)
    expect(back.rows.standby).toEqual(rows.standby)
    expect(back.rows.rx900).toEqual(rows.rx900)
    expect(back.rows.tx900).toEqual(rows.tx900)
    expect(back.rows.rx24).toEqual(rows.rx24)
    expect(back.rows.tx24).toEqual(rows.tx24)
  })

  it('round-trips with interrupt column (255)', () => {
    const rows = emptyRows()
    rows.tx900[3] = 1
    rows.rx900[5] = 1
    const bytes = encodeLr2021({ rows, interruptDioIndex: 2 })
    expect(bytes[2]).toBe(255)
    const back = decodeLr2021(bytes)
    expect(back.interruptDioIndex).toBe(2)
    expect(back.rows.tx900[3]).toBe(1)
    expect(back.rows.rx900[5]).toBe(1)
  })

  it('matches default array decode (DIO9 interrupt)', () => {
    const st = decodeLr2021([...LR2021_ELRS_DEFAULT_BYTES])
    expect(st.interruptDioIndex).toBe(4)
    expect(encodeLr2021({ ...st, interruptDioIndex: st.interruptDioIndex })).toEqual([
      ...LR2021_ELRS_DEFAULT_BYTES,
    ])
  })

  it('packColumnMask matches independent bits', () => {
    const rows = emptyRows()
    rows.standby[0] = 1
    rows.rx24[0] = 1
    expect(packColumnMask(rows, 0)).toBe((1 << 0) | (1 << 3))
  })
})

describe('validateLr2021', () => {
  it('warns on wrong length', () => {
    expect(validateLr2021([1, 2, 3]).length).toBeGreaterThan(0)
  })

  it('is quiet for consistent defaults', () => {
    expect(validateLr2021([...LR2021_ELRS_DEFAULT_BYTES])).toEqual([])
  })

  it('warns when mask byte exceeds 5 bits', () => {
    const w = validateLr2021([32, 0, 0, 0, 0, 0, 0])
    expect(w.some((m) => m.includes('0–31'))).toBe(true)
  })

  it('warns on multiple 0xFF', () => {
    const w = validateLr2021([255, 0, 0, 255, 0, 0, 0])
    expect(w.some((m) => m.includes('At most one'))).toBe(true)
  })
})
