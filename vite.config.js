import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// In development the API runs on :4000 (npm run dev starts both).
const api = 'http://localhost:4000'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // also reachable from other devices on the network (http://172.18.60.12:5173)
    proxy: { '/api': api, '/uploads': api },
  },
})
