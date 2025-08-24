import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
  build: {
    outDir: '../backend/public/assets',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/main.ts'),
        'file-manager': resolve(__dirname, 'src/components/file-manager.ts'),
        share: resolve(__dirname, 'src/features/share.ts'),
        'file-edit': resolve(__dirname, 'src/features/file-edit.ts'),
        'api-client': resolve(__dirname, 'src/api/client.ts'),
        'folder-manager': resolve(__dirname, 'src/features/folder-manager.ts'),
        'drag-drop': resolve(__dirname, 'src/features/drag-drop.ts'),
        'resumable-upload': resolve(__dirname, 'src/features/resumable-upload.ts'),
        'password-strength': resolve(__dirname, 'src/features/password-strength.ts'),
        // CSS files
        'common': resolve(__dirname, 'assets/styles/common.css'),
        'responsive': resolve(__dirname, 'assets/styles/responsive.css'),
        'responsive-extra': resolve(__dirname, 'assets/styles/responsive-extra.css'),
        'share-css': resolve(__dirname, 'assets/styles/share.css'),
        'dragdrop': resolve(__dirname, 'assets/styles/dragdrop.css'),
        'folders': resolve(__dirname, 'assets/styles/folders.css'),
        'file-manager-css': resolve(__dirname, 'assets/styles/file-manager.css'),
        'password-strength-css': resolve(__dirname, 'assets/styles/password-strength.css'),
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
      '@utils': resolve(__dirname, './src/utils'),
      '@features': resolve(__dirname, './src/features')
    }
  },
  server: {
    proxy: {
      '/api': 'http://localhost:2323',
      '/': 'http://localhost:2323'
    }
  }
});