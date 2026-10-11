import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ecoAgentApiUrl = process.env.ECO_AGENT_API_URL || 'http://localhost:3001'

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: ecoAgentApiUrl,
        changeOrigin: true,
      },
    },
  },
});
