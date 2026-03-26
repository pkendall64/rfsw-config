/**
 * Chip profile registry for RF switch calculators.
 * LR1121 is fully implemented; LR2021 is a stub until ELRS defines bytes.
 */

import { lr1121Profile } from './lr1121.js'

const lr2021Profile = Object.freeze({
  id: 'lr2021',
  label: 'LR2021 (coming soon)',
  comingSoon: true,
})

export const chipProfiles = Object.freeze([lr1121Profile, lr2021Profile])

/** @param {string} id */
export function getChipProfile(id) {
  return chipProfiles.find((p) => p.id === id) ?? lr1121Profile
}
