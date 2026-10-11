import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { copyFile } from 'node:fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ecoAgentApiUrl = process.env.ECO_AGENT_API_URL || 'http://localhost:3001'

function spaNotFoundFallback() {
  return {
    name: 'spa-not-found-fallback',
    apply: 'build',
    async closeBundle() {
      const dist = path.resolve(__dirname, 'dist')
      await copyFile(path.join(dist, 'index.html'), path.join(dist, '404.html'))
    },
  }
}

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  plugins: [react(), spaNotFoundFallback()],
  server: {
    proxy: {
      '/api': {
        target: ecoAgentApiUrl,
        changeOrigin: true,
      },
    },
  },
});
