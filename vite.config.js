/**
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (C) 2025 contributors to rfsw-config
 */

import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import vuetify from 'vite-plugin-vuetify'

export default defineConfig({
  // Set VITE_BASE_PATH in CI (e.g. /repo-name/) for GitHub Pages project sites; default '/' for local dev.
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [vue(), vuetify({ autoImport: true })],
  test: {
    environment: 'node',
  },
})
