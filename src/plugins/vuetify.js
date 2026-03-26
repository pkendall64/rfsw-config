/**
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (C) 2025 contributors to rfsw-config
 */

import 'vuetify/styles'
import { createVuetify } from 'vuetify'

export default createVuetify({
  theme: {
    defaultTheme: 'dark',
    themes: {
      dark: {
        colors: {
          primary: '#26A69A',
          surface: '#1c1c1e',
          'surface-variant': '#2a2a2d',
        },
      },
    },
  },
})
