/**
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (C) 2025 contributors to rfsw-config
 */

/**
 * LR1121 `radio_rfsw_ctrl`: 8 bytes, DIO5–DIO8 + DIO10 (LSB = DIO5, bit 4 = DIO10).
 * @see ExpressLRS LR1121Driver::SetDioAsRfSwitch
 */

/** Firmware default when LR1121_RFSW_CTRL_COUNT != 8 (4-DIO-oriented pattern). */
export const LR1121_ELRS_DEFAULT_BYTES = Object.freeze([
  0b00001111,
  0b00000000,
  0b00000100,
  0b00001000,
  0b00001000,
  0b00000010,
  0,
  0b00000001,
])

export const LR1121_DIO_LABELS = Object.freeze(['DIO5', 'DIO6', 'DIO7', 'DIO8', 'DIO10'])

/** @param {number[]} levels — five values 0 (LOW) or 1 (HIGH), index = DIO bit */
export function packDioLevels(levels) {
  let b = 0
  for (let i = 0; i < 5; i++) {
    if (levels[i]) b |= 1 << i
  }
  return b & 0xff
}

/** @param {number} byte */
export function unpackDioLevels(byte) {
  const levels = []
  for (let i = 0; i < 5; i++) {
    levels.push((byte >> i) & 1)
  }
  return levels
}

/**
 * Bitwise OR of packed mode rows — any DIO that is HIGH in at least one RF mode.
 * DIOs that are LOW in every mode get mask bit 0 (Semtech may still enable the pin in hardware).
 * @param {Object} rows
 * @param {number[]} rows.standby
 * @param {number[]} rows.rx900
 * @param {number[]} rows.tx900
 * @param {number[]} rows.tx900hp
 * @param {number[]} rows.tx24
 * @param {number[]} rows.rx24
 * @returns {number} lower 5 bits meaningful
 */
export function computeUsedDioMaskFromRows(rows) {
  let m = 0
  m |= packDioLevels(rows.standby)
  m |= packDioLevels(rows.rx900)
  m |= packDioLevels(rows.tx900)
  m |= packDioLevels(rows.tx900hp)
  m |= packDioLevels(rows.tx24)
  m |= packDioLevels(rows.rx24)
  return m & 0x1f
}

/**
 * @typedef {Object} Lr1121EncodeState
 * @property {Object} rows
 * @property {number[]} rows.standby
 * @property {number[]} rows.rx900
 * @property {number[]} rows.tx900
 * @property {number[]} rows.tx900hp
 * @property {number[]} rows.tx24
 * @property {number[]} rows.rx24
 */

/** @param {Lr1121EncodeState} state */
export function encodeLr1121(state) {
  const { rows } = state
  const usedDioMask = computeUsedDioMaskFromRows(rows)
  return [
    usedDioMask,
    packDioLevels(rows.standby),
    packDioLevels(rows.rx900),
    packDioLevels(rows.tx900),
    packDioLevels(rows.tx900hp),
    packDioLevels(rows.tx24),
    0,
    packDioLevels(rows.rx24),
  ]
}

/** @param {number[]} bytes — length 8 */
export function decodeLr1121(bytes) {
  if (bytes.length !== 8) {
    throw new Error(`decodeLr1121: expected 8 bytes, got ${bytes.length}`)
  }
  const rows = {
    standby: unpackDioLevels(bytes[1]),
    rx900: unpackDioLevels(bytes[2]),
    tx900: unpackDioLevels(bytes[3]),
    tx900hp: unpackDioLevels(bytes[4]),
    tx24: unpackDioLevels(bytes[5]),
    rx24: unpackDioLevels(bytes[7]),
  }
  return {
    usedDioMask: computeUsedDioMaskFromRows(rows),
    rows,
  }
}

/** @param {number[]} bytes */
export function validateLr1121(bytes) {
  const warnings = []
  if (bytes.length !== 8) {
    warnings.push('Array length must be exactly 8 for LR1121.')
    return warnings
  }
  const rowIndices = [1, 2, 3, 4, 5, 7]
  let expectedMask = 0
  for (const ri of rowIndices) {
    expectedMask |= bytes[ri] & 0x1f
  }
  const maskFromByte0 = bytes[0] & 0x1f
  for (let i = 0; i < bytes.length; i++) {
    const v = bytes[i]
    if (v < 0 || v > 255 || !Number.isInteger(v)) {
      warnings.push(`Byte ${i} must be an integer from 0 to 255.`)
    }
  }
  if (maskFromByte0 !== expectedMask) {
    warnings.push(
      `Byte 0 (0x${maskFromByte0.toString(16)}) is not the bitwise OR of mode rows 1–5 and 7 (expected 0x${expectedMask.toString(16)} from those rows).`,
    )
  }
  for (const ri of rowIndices) {
    const rowBits = bytes[ri] & 0x1f
    const outside = rowBits & ~maskFromByte0
    if (outside !== 0) {
      warnings.push(
        `Byte ${ri} sets DIO levels for pins not marked in byte 0 (mask 0x${maskFromByte0.toString(16)}).`,
      )
    }
  }
  return warnings
}

export const lr1121Profile = Object.freeze({
  id: 'lr1121',
  label: 'LR1121',
  comingSoon: false,
  dioLabels: LR1121_DIO_LABELS,
  elrsDefaultBytes: LR1121_ELRS_DEFAULT_BYTES,
  encode: encodeLr1121,
  decode: decodeLr1121,
  validate: validateLr1121,
})
