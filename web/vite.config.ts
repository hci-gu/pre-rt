import path from 'path'
import { resourceReviewPlugin } from './resource-review-plugin'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss(), resourceReviewPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: {
    global: {},
  },
  build: {
    commonjsOptions: { transformMixedEsModules: true },
  },
})
