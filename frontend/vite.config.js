import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  base: process.env.VERCEL ? '/' : mode === 'production' ? '/TicketBookingSystem/' : '/',
  plugins: [react()],
}))
