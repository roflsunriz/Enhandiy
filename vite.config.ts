import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: './src',
  build: {
    outDir: '../asset/dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/main.ts'),
        'file-manager': resolve(__dirname, 'src/file-manager.ts'),
        share: resolve(__dirname, 'src/share.ts'),
        'file-edit': resolve(__dirname, 'src/file-edit.ts'),
        'api-client': resolve(__dirname, 'src/api/client.ts'),
        'folder-manager': resolve(__dirname, 'src/folder-manager.ts'),
        'drag-drop': resolve(__dirname, 'src/drag-drop.ts'),
        'resumable-upload': resolve(__dirname, 'src/resumable-upload.ts'),
        'password-strength': resolve(__dirname, 'src/password-strength.ts'),
        // CSS files
        'common': resolve(__dirname, 'src/styles/common.css'),
        'responsive': resolve(__dirname, 'src/styles/responsive.css'),
        'responsive-extra': resolve(__dirname, 'src/styles/responsive-extra.css'),
        'share-css': resolve(__dirname, 'src/styles/share.css'),
        'dragdrop': resolve(__dirname, 'src/styles/dragdrop.css'),
        'folders': resolve(__dirname, 'src/styles/folders.css'),
        'file-manager-css': resolve(__dirname, 'src/styles/file-manager.css'),
        'password-strength-css': resolve(__dirname, 'src/styles/password-strength.css'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]'
      }
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@components': resolve(__dirname, './src/components'),
      '@types': resolve(__dirname, './src/types'),
      '@utils': resolve(__dirname, './src/utils')
    }
  },
  server: {
    proxy: {
      '/api': 'http://localhost:2323',
      '/': 'http://localhost:2323'
    }
  }
});