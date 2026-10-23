import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Relative, because GitHub Pages serves the site from /Canvas-OLC-Insights/, not the domain root.
  base: './',
  build: {
    outDir: '../docs',
    emptyOutDir: true,
  },
})
