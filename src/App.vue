<!--
  SPDX-License-Identifier: GPL-3.0-or-later
  Copyright (C) 2025 contributors to rfsw-config
-->

<script setup>
import { ref, computed } from 'vue'
import { chipProfiles, getChipProfile } from './chips/types.js'
import Lr1121Panel from './components/Lr1121Panel.vue'
import Lr2021Panel from './components/Lr2021Panel.vue'

const selectedChipId = ref('lr1121')
const profile = computed(() => getChipProfile(selectedChipId.value))

const panelMap = {
  lr1121: Lr1121Panel,
  lr2021: Lr2021Panel,
}

const panelComponent = computed(() => panelMap[selectedChipId.value] ?? Lr1121Panel)

const bytes = ref([])

function onBytesUpdate(b) {
  bytes.value = b
}

const validationWarnings = computed(() => {
  if (!profile.value.validate || !bytes.value.length) return []
  return profile.value.validate(bytes.value)
})

const jsonLine = computed(() => {
  const b = bytes.value
  if (!b.length) return ''
  return `"radio_rfsw_ctrl": [ ${b.join(', ')} ],`
})

const matchesFirmwareDefault = computed(() => {
  const b = bytes.value
  const def = profile.value.elrsDefaultBytes
  if (!b.length || b.length !== def.length) return false
  return b.every((v, i) => v === def[i])
})

const copyFeedback = ref(false)

const chipPanelRef = ref(null)

function resetToFirmwareDefaults() {
  chipPanelRef.value?.loadElrsDefaults?.()
}

async function copyJsonLine() {
  try {
    await navigator.clipboard.writeText(jsonLine.value)
    copyFeedback.value = true
  } catch {
    copyFeedback.value = false
  }
}
</script>

<template>
  <v-app>
    <v-app-bar color="primary" density="comfortable">
      <v-app-bar-title class="text-h6 font-weight-regular">
        ExpressLRS <code class="text-body-2">radio_rfsw_ctrl</code> calculator
      </v-app-bar-title>
    </v-app-bar>

    <v-main>
      <v-container class="py-6" style="max-width: 1100px">
        <v-row class="mb-4">
          <v-col cols="12" md="6">
            <v-select
              v-model="selectedChipId"
              :items="chipProfiles"
              item-title="label"
              item-value="id"
              label="Chip profile"
              variant="outlined"
              density="comfortable"
              hide-details
            />
          </v-col>
        </v-row>

        <v-alert
          v-for="(w, i) in validationWarnings"
          :key="i"
          type="warning"
          variant="tonal"
          density="compact"
          class="mb-2"
          border="start"
        >
          {{ w }}
        </v-alert>

        <component
          ref="chipPanelRef"
          :is="panelComponent"
          :key="selectedChipId"
          @update:bytes="onBytesUpdate"
        />

        <v-row class="mt-6" align="stretch">
          <v-col cols="12" md="6">
            <v-card variant="outlined" class="fill-height">
              <v-card-title class="text-subtitle-1 d-flex align-center flex-wrap ga-2">
                Live output
                <v-chip
                  v-if="bytes.length"
                  size="small"
                  :color="matchesFirmwareDefault ? 'success' : 'warning'"
                  variant="tonal"
                >
                  {{ matchesFirmwareDefault ? 'Default' : 'Custom' }}
                </v-chip>
              </v-card-title>
              <v-card-text>
                <div class="text-caption text-medium-emphasis mb-1">Decimal (JSON)</div>
                <pre class="text-body-2 mb-4 overflow-x-auto">[ {{ bytes.join(', ') }} ]</pre>
                <div class="d-flex flex-wrap ga-2">
                  <v-btn color="primary" @click="copyJsonLine">Copy line</v-btn>
                </div>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="12" md="6">
            <v-card variant="outlined" class="fill-height">
              <v-card-title class="text-subtitle-1">Firmware defaults</v-card-title>
              <v-card-text>
                <p class="text-body-2 mb-3">
                  These values are used if no <code>radio_rfsw_ctrl</code> entry is present in
                  <code>hardware.json</code>.
                </p>
                <pre class="text-body-2 overflow-x-auto mb-2">[ {{ [...profile.elrsDefaultBytes].join(', ') }} ]</pre>
                <v-btn
                  class="mt-2"
                  color="primary"
                  variant="outlined"
                  @click="resetToFirmwareDefaults"
                >
                  Reset to Defaults
                </v-btn>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </v-main>

    <v-snackbar v-model="copyFeedback" :timeout="2000" location="bottom">
      Copied to clipboard
    </v-snackbar>
  </v-app>
</template>
