/**
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (C) 2025 contributors to rfsw-config
 */

/**
 * LR2021 `radio_rfsw_ctrl`: 7 bytes, one per DIO5–DIO11.
 * Each byte is a 5-bit mask (LSB→MSB): Standby, SubG RX, SubG TX, 2.4 RX, 2.4 TX — pin HIGH in those RF states.
 * Index `i` is DIO `5 + i`. Interrupt DIO uses `0xFF` for that slot.
 */

/** ExpressLRS LR2021 firmware default for `radio_rfsw_ctrl` (7 bytes). */
export const LR2021_ELRS_DEFAULT_BYTES = Object.freeze([16, 8, 2, 4, 255, 0, 0])

export const LR2021_DIO_LABELS = Object.freeze([
  'DIO5',
  'DIO6',
  'DIO7',
  'DIO8',
  'DIO9',
  'DIO10',
  'DIO11',
])

/** Row keys in bit order (bit 0 = LSB). Matches UI / schematic rows. */
export const LR2021_MODE_ROWS = Object.freeze([
  { key: 'standby', label: 'Standby' },
  { key: 'rx900', label: 'SubG Receive' },
  { key: 'tx900', label: 'SubG Transmit' },
  { key: 'rx24', label: '2.4G Receive' },
  { key: 'tx24', label: '2.4G Transmit' },
])

const MODE_KEYS = LR2021_MODE_ROWS.map((r) => r.key)

/**
 * @typedef {Object} Lr2021Rows
 * @property {number[]} standby
 * @property {number[]} rx900
 * @property {number[]} tx900
 * @property {number[]} rx24
 * @property {number[]} tx24
 */

/**
 * @typedef {Object} Lr2021EncodeState
 * @property {Lr2021Rows} rows — five arrays of seven 0/1 values (columns DIO5–DIO11)
 * @property {number | null} interruptDioIndex — column index 0–6, or null if no interrupt pin
 */

/**
 * @param {Lr2021Rows} rows
 * @param {number} dioIndex 0–6
 */
function columnBit(rows, dioIndex, modeKey) {
  return rows[modeKey][dioIndex] ? 1 : 0
}

/**
 * @param {Lr2021Rows} rows
 * @param {number} dioIndex
 * @returns {number} mask 0–31
 */
export function packColumnMask(rows, dioIndex) {
  let m = 0
  for (let bit = 0; bit < 5; bit++) {
    if (columnBit(rows, dioIndex, MODE_KEYS[bit])) m |= 1 << bit
  }
  return m & 0x1f
}

/**
 * @param {Lr2021EncodeState} state
 * @returns {number[]}
 */
export function encodeLr2021(state) {
  const { rows, interruptDioIndex } = state
  const out = []
  for (let d = 0; d < 7; d++) {
    if (interruptDioIndex === d) {
      out.push(255)
    } else {
      out.push(packColumnMask(rows, d))
    }
  }
  return out
}

/**
 * @param {number[]} bytes — length 7
 * @returns {{ rows: Lr2021Rows, interruptDioIndex: number | null }}
 */
export function decodeLr2021(bytes) {
  if (bytes.length !== 7) {
    throw new Error(`decodeLr2021: expected 7 bytes, got ${bytes.length}`)
  }

  let interruptDioIndex = null
  for (let d = 0; d < 7; d++) {
    if (bytes[d] === 255) {
      interruptDioIndex = d
      break
    }
  }

  const emptyCol = () => Array(7).fill(0)

  /** @type {Lr2021Rows} */
  const rows = {
    standby: emptyCol(),
    rx900: emptyCol(),
    tx900: emptyCol(),
    rx24: emptyCol(),
    tx24: emptyCol(),
  }

  for (let d = 0; d < 7; d++) {
    const v = bytes[d]
    if (v === 255) continue
    const m = v & 0x1f
    for (let bit = 0; bit < 5; bit++) {
      rows[MODE_KEYS[bit]][d] = (m >> bit) & 1
    }
  }

  return { rows, interruptDioIndex }
}

/** @param {number[]} bytes */
export function validateLr2021(bytes) {
  const warnings = []
  if (bytes.length !== 7) {
    warnings.push('Array length must be exactly 7 for LR2021.')
    return warnings
  }

  let ffCount = 0
  for (let i = 0; i < 7; i++) {
    const v = bytes[i]
    if (!Number.isInteger(v) || v < 0 || v > 255) {
      warnings.push(`Byte ${i} must be an integer from 0 to 255.`)
      continue
    }
    if (v === 255) {
      ffCount++
    } else if (v > 0x1f) {
      warnings.push(
        `Byte ${i} is 0x${v.toString(16)}; RF mask bytes must be 0–31 (0x00–0x1F) or 255 (0xFF) for interrupt.`,
      )
    }
  }
  if (ffCount > 1) {
    warnings.push('At most one DIO may be marked as interrupt (0xFF).')
  }

  return warnings
}

export const lr2021Profile = Object.freeze({
  id: 'lr2021',
  label: 'LR2021',
  comingSoon: false,
  dioLabels: LR2021_DIO_LABELS,
  modeRows: LR2021_MODE_ROWS,
  elrsDefaultBytes: LR2021_ELRS_DEFAULT_BYTES,
  encode: (state) => encodeLr2021(state),
  decode: (bytes) => decodeLr2021(bytes),
  validate: validateLr2021,
})
