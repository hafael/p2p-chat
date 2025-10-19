// vite.config.js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    nodePolyfills({
      // Inclui polyfills para todos os módulos nativos do Node
      // como 'stream', 'buffer', 'crypto', etc.
      globals: {
        Buffer: true, // Habilita o polyfill global do Buffer
        global: true,
        process: true,
      },
    }),
  ],
})