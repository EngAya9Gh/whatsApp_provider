import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3003',
      '/uploads': 'http://localhost:3003',
      '/socket.io': {
        target: 'http://localhost:3003',
        ws: true
      }
    }
  }
})
