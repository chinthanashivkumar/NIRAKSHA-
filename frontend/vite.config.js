import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Fixed port; fail if unavailable
    port: 5179,
    strictPort: true,
    hmr: {
      overlay: false
    }
  }
})
