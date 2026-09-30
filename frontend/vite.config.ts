import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
  plugins: [{
    name: 'strip-generated-trailing-whitespace',
    renderChunk(code) {
      return {
        code: code.replace(/[\t ]+$/gm, ''),
        map: null
      };
    }
  }],
  build: {
    outDir: '../backend/public/assets',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'src/main.ts'),
        'file-edit': resolve(import.meta.dirname, 'src/features/file-edit.ts'),
        'folder-manager': resolve(import.meta.dirname, 'src/features/folder-manager.ts'),
        'drag-drop': resolve(import.meta.dirname, 'src/features/drag-drop.ts'),
        'resumable-upload': resolve(import.meta.dirname, 'src/features/resumable-upload.ts'),
        // CSS files
        'common': resolve(import.meta.dirname, 'assets/styles/common.css'),
        'responsive': resolve(import.meta.dirname, 'assets/styles/responsive.css'),
        'responsive-extra': resolve(import.meta.dirname, 'assets/styles/responsive-extra.css'),
        'share-css': resolve(import.meta.dirname, 'assets/styles/share.css'),
        'dragdrop': resolve(import.meta.dirname, 'assets/styles/dragdrop.css'),
        'folders': resolve(import.meta.dirname, 'assets/styles/folders.css'),
        'file-manager-css': resolve(import.meta.dirname, 'assets/styles/file-manager.css'),
        'password-strength-css': resolve(import.meta.dirname, 'assets/styles/password-strength.css'),
        'fluent': resolve(import.meta.dirname, 'assets/styles/fluent.css'),
        'fluent-content': resolve(import.meta.dirname, 'assets/styles/fluent-content.css'),
        'fluent-responsive': resolve(import.meta.dirname, 'assets/styles/fluent-responsive.css'),
        'workspace': resolve(import.meta.dirname, 'assets/styles/workspace.css'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name]-[hash].js',
        assetFileNames: '[name].[ext]'
      }
    }
  },
  resolve: {
    alias: {
      '@': resolve(import.meta.dirname, './src'),
      '@components': resolve(import.meta.dirname, './src/components'),
      '@types': resolve(import.meta.dirname, './src/types'),
      '@utils': resolve(import.meta.dirname, './src/utils'),
      '@features': resolve(import.meta.dirname, './src/features')
    }
  },
  server: {
    proxy: {
      '/api': 'http://localhost:2323',
      '/': 'http://localhost:2323'
    }
  }
});
