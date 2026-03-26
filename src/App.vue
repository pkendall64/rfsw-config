<script setup>
import { ref, computed, watch } from 'vue'
import { chipProfiles, getChipProfile } from './chips/types.js'

const MODE_ROWS = [
  { key: 'standby', label: 'Standby' },
  { key: 'rx900', label: 'SubG Receive' },
  { key: 'tx900', label: 'SubG Transmit' },
  { key: 'tx900hp', label: 'SubG Transmit High Power' },
  { key: 'tx24', label: '2.4G Transmit' },
  { key: 'rx24', label: '2.4G Receive' },
]

const selectedChipId = ref('lr1121')
const profile = computed(() => getChipProfile(selectedChipId.value))

const rowLevels = ref({
  standby: [0, 0, 0, 0, 0],
  rx900: [0, 1, 0, 0, 0],
  tx900: [0, 0, 0, 1, 0],
  tx900hp: [0, 0, 0, 1, 0],
  tx24: [0, 0, 1, 0, 0],
  rx24: [1, 0, 0, 0, 0],
})

function loadElrsDefaults() {
  const p = getChipProfile('lr1121')
  const st = p.decode([...p.elrsDefaultBytes])
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

watch(selectedChipId, (id) => {
  if (id === 'lr1121') loadElrsDefaults()
})

const bytes = computed(() => {
  if (profile.value.comingSoon) return []
  return profile.value.encode({
    rows: {
      standby: rowLevels.value.standby,
      rx900: rowLevels.value.rx900,
      tx900: rowLevels.value.tx900,
      tx900hp: rowLevels.value.tx900hp,
      tx24: rowLevels.value.tx24,
      rx24: rowLevels.value.rx24,
    },
  })
})

const validationWarnings = computed(() => {
  if (profile.value.comingSoon || !profile.value.validate) return []
  return profile.value.validate(bytes.value)
})

const jsonLine = computed(() => {
  const b = bytes.value
  if (!b.length) return ''
  return `"radio_rfsw_ctrl": [ ${b.join(', ')} ],`
})

const copyFeedback = ref(false)

async function copyJsonLine() {
  try {
    await navigator.clipboard.writeText(jsonLine.value)
    copyFeedback.value = true
  } catch {
    copyFeedback.value = false
  }
}

function toggleLevel(rowKey, dioIndex) {
  const row = rowLevels.value[rowKey]
  row[dioIndex] = row[dioIndex] ? 0 : 1
}

/** @param {0|1} bit */
function levelLabel(bit) {
  return bit ? 'HIGH' : 'LOW'
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

        <v-alert v-if="profile.comingSoon" type="info" variant="tonal" class="mb-6" border="start">
          <strong>{{ profile.label }}</strong> layout is not defined in ExpressLRS yet. LR1121 is fully
          supported below.
        </v-alert>

        <template v-if="!profile.comingSoon">
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

          <v-card class="mb-6" variant="outlined">
            <v-card-title class="text-subtitle-1">Truth table</v-card-title>
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
                    <th class="text-left" style="min-width: 9rem">Mode</th>
                    <th v-for="d in profile.dioLabels" :key="d" class="text-center text-caption">
                      {{ d }}
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
                        :aria-label="`${mr.label}, ${profile.dioLabels[dioIndex - 1]}, ${levelLabel(rowLevels[mr.key][dioIndex - 1])}`"
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

          <v-row>
            <v-col cols="12" md="6">
              <v-card variant="outlined">
                <v-card-title class="text-subtitle-1">Live output</v-card-title>
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
              <v-card variant="outlined" color="surface-variant">
                <v-card-title class="text-subtitle-1">ELRS firmware default (reference)</v-card-title>
                <v-card-text>
                  <p class="text-body-2 mb-3">
                    Values from <code>LR1121::SetDioAsRfSwitch</code> when
                    <code>LR1121_RFSW_CTRL_COUNT != 8</code>. They target a <strong>4-DIO</strong> pattern
                    (<code>RfswEnable</code> <code>0x0F</code>) and may not match boards that use five DIOs
                    (DIO5–8 + DIO10).
                  </p>
                  <pre class="text-body-2 overflow-x-auto mb-2">[ {{ [...profile.elrsDefaultBytes].join(', ') }} ]</pre>
                  <v-btn class="mt-4" size="small" variant="text" @click="loadElrsDefaults">
                    Reset form to this preset
                  </v-btn>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </template>
      </v-container>
    </v-main>

    <v-snackbar v-model="copyFeedback" :timeout="2000" location="bottom">
      Copied to clipboard
    </v-snackbar>
  </v-app>
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
