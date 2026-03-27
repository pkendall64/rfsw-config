<!--
  SPDX-License-Identifier: GPL-3.0-or-later
  Copyright (C) 2025 contributors to rfsw-config
-->

<script setup>
import { ref, computed, watch } from 'vue'
import { lr1121Profile } from '../chips/lr1121.js'

const emit = defineEmits(['update:bytes'])

const MODE_ROWS = [
  { key: 'standby', label: 'Standby' },
  { key: 'rx900', label: 'SubG Receive' },
  { key: 'tx900', label: 'SubG Transmit' },
  { key: 'tx900hp', label: 'SubG Transmit High Power' },
  { key: 'tx24', label: '2.4G Transmit' },
  { key: 'rx24', label: '2.4G Receive' },
]

const rowLevels = ref({
  standby: [0, 0, 0, 0, 0],
  rx900: [0, 1, 0, 0, 0],
  tx900: [0, 0, 0, 1, 0],
  tx900hp: [0, 0, 0, 1, 0],
  tx24: [0, 0, 1, 0, 0],
  rx24: [1, 0, 0, 0, 0],
})

function loadElrsDefaults() {
  const st = lr1121Profile.decode([...lr1121Profile.elrsDefaultBytes])
  rowLevels.value = {
    standby: [...st.rows.standby],
    rx900: [...st.rows.rx900],
    tx900: [...st.rows.tx900],
    tx900hp: [...st.rows.tx900hp],
    tx24: [...st.rows.tx24],
    rx24: [...st.rows.rx24],
  }
}

loadElrsDefaults()

const bytes = computed(() =>
  lr1121Profile.encode({
    rows: {
      standby: rowLevels.value.standby,
      rx900: rowLevels.value.rx900,
      tx900: rowLevels.value.tx900,
      tx900hp: rowLevels.value.tx900hp,
      tx24: rowLevels.value.tx24,
      rx24: rowLevels.value.rx24,
    },
  }),
)

watch(
  bytes,
  (b) => emit('update:bytes', b),
  { immediate: true },
)

function toggleLevel(rowKey, dioIndex) {
  const row = rowLevels.value[rowKey]
  row[dioIndex] = row[dioIndex] ? 0 : 1
}

/** @param {0|1} bit */
function levelLabel(bit) {
  return bit ? 'HIGH' : 'LOW'
}

const dioLabels = lr1121Profile.dioLabels

defineExpose({ loadElrsDefaults })
</script>

<template>
  <div>
    <v-card variant="outlined">
      <v-card-title class="text-subtitle-1 d-flex align-center ga-2">
        <v-icon icon="mdi-table-large" size="small" class="text-medium-emphasis" />
        Truth table
      </v-card-title>
      <v-card-subtitle class="text-wrap pb-2">
        Each cell is <strong>LOW</strong> or <strong>HIGH</strong> (click to toggle).
      </v-card-subtitle>
      <v-card-subtitle class="text-wrap pb-2 text-body-2 text-medium-emphasis mb-6">
        Derive the eight-byte <code>radio_rfsw_ctrl</code> array for unified hardware
        <code>hardware.json</code> from your schematic truth table. Each byte packs DIO levels with
        <strong>bit 0 = DIO5</strong> through <strong>bit 4 = DIO10</strong> (DIO9 is used as the interrupt pin).
      </v-card-subtitle>
      <v-card-text class="pa-0">
        <v-table density="compact" class="rfsw-table">
          <thead>
            <tr>
              <th class="text-left" style="min-width: 9rem">
                <span class="d-inline-flex align-center ga-2">
                  <v-icon icon="mdi-antenna" size="small" class="text-medium-emphasis" />
                  RF State
                </span>
              </th>
              <th v-for="d in dioLabels" :key="d" class="text-center text-caption">
                <span class="d-inline-flex align-center justify-center ga-1 flex-wrap">
                  <v-icon icon="mdi-square-wave" size="x-small" class="text-medium-emphasis" />
                  {{ d }}
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="mr in MODE_ROWS" :key="mr.key">
              <td>{{ mr.label }}</td>
              <td v-for="dioIndex in 5" :key="mr.key + '-' + dioIndex" class="text-center dio-cell">
                <v-chip
                  :color="rowLevels[mr.key][dioIndex - 1] ? 'primary' : undefined"
                  :variant="rowLevels[mr.key][dioIndex - 1] ? 'flat' : 'outlined'"
                  size="small"
                  class="dio-bit px-3 font-weight-medium"
                  role="button"
                  tabindex="0"
                  :aria-label="`${mr.label}, ${dioLabels[dioIndex - 1]}, ${levelLabel(rowLevels[mr.key][dioIndex - 1])}`"
                  @click="toggleLevel(mr.key, dioIndex - 1)"
                  @keydown.enter.prevent="toggleLevel(mr.key, dioIndex - 1)"
                  @keydown.space.prevent="toggleLevel(mr.key, dioIndex - 1)"
                >
                  {{ levelLabel(rowLevels[mr.key][dioIndex - 1]) }}
                </v-chip>
              </td>
            </tr>
          </tbody>
        </v-table>
      </v-card-text>
    </v-card>
  </div>
</template>

<style scoped>
.rfsw-table :deep(th),
.rfsw-table :deep(td) {
  vertical-align: middle;
}

.dio-cell {
  padding-top: 6px !important;
  padding-bottom: 6px !important;
}

.dio-bit {
  min-width: 3.75rem;
  justify-content: center;
  cursor: pointer;
  user-select: none;
}

.dio-bit:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 2px;
}
</style>
