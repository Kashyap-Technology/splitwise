import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import path from 'path' // 1. Import the path module

export default defineConfig({
  server:{
    port:3000
  },
  plugins: [
    tanstackRouter({
      routesDirectory: './src/routes', // Fixed a tiny typo here too!
      generatedRouteTree: './src/routeTree.gen.ts',
      target: 'react', 
      autoCodeSplitting: true
    }), 
    react(), 
    tailwindcss()
  ],
  resolve: {
    alias: {
      // 2. Change '/src' to use path.resolve
      '@': path.resolve(import.meta.dirname, './src'),
    }
  }
})
