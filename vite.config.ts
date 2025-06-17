import { defineConfig } from 'vite';
import preact from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [preact()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug'],
        passes: 2,
      },
      mangle: {
        // Preserve Chrome extension API globals and common web APIs
        reserved: ['chrome', 'browser', 'webkitURL', 'URL', 'document', 'window', 'location'],
        // Disable property mangling entirely to preserve Chrome API method names
        properties: false
      },
      format: {
        comments: false,
      },
    },
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup/popup.tsx'),
        background: resolve(__dirname, 'src/background/index.ts'),
        content: resolve(__dirname, 'src/content/index.ts'),
      },
      output: {
        entryFileNames: chunkInfo => {
          if (chunkInfo.name === 'popup') return 'popup.js';
          if (chunkInfo.name === 'background') return 'background.js';
          if (chunkInfo.name === 'content') return 'content.js';
          return '[name].js';
        },
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]',
      },
    },
  },
  css: {
    modules: {
      localsConvention: 'camelCase',
    },
  },
  publicDir: 'public',
});
