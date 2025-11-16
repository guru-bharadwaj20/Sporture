import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// ✅ Add proxy to redirect API requests to the backend
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:5000'
    }
  }
})
