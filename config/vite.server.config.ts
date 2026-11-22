import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  build: {
    outDir: path.resolve(__dirname, '../dist/server'),
    emptyOutDir: true,
    minify: false,
    lib: {
      entry: path.resolve(__dirname, '../src/server/services/gas_server.ts'),
      name: '_ServerBundle',
      formats: ['iife'],
      fileName: () => 'code.js'
    },
    rollupOptions: {
      output: {
        extend: false
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../src'),
      '@server': path.resolve(__dirname, '../src/server'),
      '@client': path.resolve(__dirname, '../src/client')
    }
  }
});
