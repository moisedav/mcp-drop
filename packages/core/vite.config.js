import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  root: 'demo',
  publicDir: false,
  resolve: {
    alias: {
      '/src': resolve(__dirname, 'src')
    }
  },
  build: {
    outDir: resolve(__dirname, 'dist'),
    lib: {
      entry: resolve(__dirname, 'src/index.js'),
      name: 'McpDrop',
      fileName: 'mcp-drop',
      formats: ['es', 'umd']
    }
  }
})