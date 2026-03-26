/**
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (C) 2025 contributors to rfsw-config
 */

/**
 * Chip profile registry for RF switch calculators.
 */

import { lr1121Profile } from './lr1121.js'
import { lr2021Profile } from './lr2021.js'

export const chipProfiles = Object.freeze([lr1121Profile, lr2021Profile])

/** @param {string} id */
export function getChipProfile(id) {
  return chipProfiles.find((p) => p.id === id) ?? lr1121Profile
}
