<!--
  SPDX-License-Identifier: GPL-3.0-or-later
  Copyright (C) 2025 contributors to rfsw-config
-->

<script setup>
import { ref, computed, watch } from 'vue'
import {
  lr2021Profile,
  LR2021_MODE_ROWS,
  LR2021_DIO_LABELS,
} from '../chips/lr2021.js'

const emit = defineEmits(['update:bytes'])

const rowLevels = ref(LR2021_MODE_ROWS.map(() => Array(7).fill(0)))

const interruptDioIndex = ref(null)

const modeKeyByRow = LR2021_MODE_ROWS.map((r) => r.key)

function decodeToState(bytes) {
  const st = lr2021Profile.decode(bytes)
  interruptDioIndex.value = st.interruptDioIndex
  for (let r = 0; r < 5; r++) {
    const key = modeKeyByRow[r]
    rowLevels.value[r] = [...st.rows[key]]
  }
}

function loadElrsDefaults() {
  decodeToState([...lr2021Profile.elrsDefaultBytes])
}

loadElrsDefaults()

const rowsForEncode = computed(() => ({
  standby: [...rowLevels.value[0]],
  rx900: [...rowLevels.value[1]],
  tx900: [...rowLevels.value[2]],
  rx24: [...rowLevels.value[3]],
  tx24: [...rowLevels.value[4]],
}))

const bytes = computed(() =>
  lr2021Profile.encode({
    rows: rowsForEncode.value,
    interruptDioIndex: interruptDioIndex.value,
  }),
)

watch(
  bytes,
  (b) => emit('update:bytes', b),
  { immediate: true },
)

watch(interruptDioIndex, () => {
  const idx = interruptDioIndex.value
  if (idx !== null) {
    for (let r = 0; r < 5; r++) {
      rowLevels.value[r][idx] = 0
    }
  }
})

function toggleLevel(rowIndex, dioIndex) {
  if (interruptDioIndex.value === dioIndex) return
  const row = rowLevels.value[rowIndex]
  row[dioIndex] = row[dioIndex] ? 0 : 1
}

/** @param {0|1} bit */
function levelLabel(bit) {
  return bit ? 'HIGH' : 'LOW'
}

const interruptItems = [
  { title: 'None', value: null },
  ...LR2021_DIO_LABELS.map((label, value) => ({ title: label, value })),
]

defineExpose({ loadElrsDefaults })
</script>

<template>
  <div>
    <v-row class="mb-4">
      <v-col cols="12" md="6">
        <v-select
          v-model="interruptDioIndex"
          :items="interruptItems"
          item-title="title"
          item-value="value"
          label="Interrupt pin"
          prepend-inner-icon="mdi-bell-ring-outline"
          variant="outlined"
          density="comfortable"
          hide-details
        />
      </v-col>
    </v-row>

    <v-card variant="outlined">
      <v-card-title class="text-subtitle-1 d-flex align-center ga-2">
        <v-icon icon="mdi-table-large" size="small" class="text-medium-emphasis" />
        Truth table
      </v-card-title>
      <v-card-subtitle class="text-wrap pb-2">
        Each cell is <strong>LOW</strong> or <strong>HIGH</strong> for that RF state and DIO (click to toggle).
        Interrupt column is not used for RF switching.
      </v-card-subtitle>
      <v-card-subtitle class="text-wrap pb-2 text-body-2 text-medium-emphasis mb-6">
        Seven-byte <code>radio_rfsw_ctrl</code>: index <code>i</code> corresponds to <code>DIO(5+i)</code>. Each value is a
        5-bit mask — bit 0 Standby through bit 4 2.4G TX — indicating which RF states drive that pin
        <strong>HIGH</strong>. The interrupt DIO is <code>255</code>.
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
              <th v-for="d in LR2021_DIO_LABELS" :key="d" class="text-center text-caption">
                <span class="d-inline-flex align-center justify-center ga-1 flex-wrap">
                  <v-icon icon="mdi-square-wave" size="x-small" class="text-medium-emphasis" />
                  {{ d }}
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(mr, rowIndex) in LR2021_MODE_ROWS" :key="mr.key">
              <td>{{ mr.label }}</td>
              <td v-for="dioIndex in 7" :key="mr.key + '-' + dioIndex" class="text-center dio-cell">
                <template v-if="interruptDioIndex === dioIndex - 1">
                  <v-chip size="small" variant="tonal" class="dio-bit px-2" disabled> INT </v-chip>
                </template>
                <v-chip
                  v-else
                  :color="rowLevels[rowIndex][dioIndex - 1] ? 'primary' : undefined"
                  :variant="rowLevels[rowIndex][dioIndex - 1] ? 'flat' : 'outlined'"
                  size="small"
                  class="dio-bit px-3 font-weight-medium"
                  role="button"
                  tabindex="0"
                  :aria-label="`${mr.label}, ${LR2021_DIO_LABELS[dioIndex - 1]}, ${levelLabel(rowLevels[rowIndex][dioIndex - 1])}`"
                  @click="toggleLevel(rowIndex, dioIndex - 1)"
                  @keydown.enter.prevent="toggleLevel(rowIndex, dioIndex - 1)"
                  @keydown.space.prevent="toggleLevel(rowIndex, dioIndex - 1)"
                >
                  {{ levelLabel(rowLevels[rowIndex][dioIndex - 1]) }}
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
