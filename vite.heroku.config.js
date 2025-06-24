// Configuração do Vite específica para o Heroku
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import cartographer from '@replit/vite-plugin-cartographer';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    cartographer()
  ],
  server: {
    host: '0.0.0.0',
    port: process.env.PORT || 5000,
    strictPort: false,
    // Aceitar qualquer host em qualquer ambiente
    hmr: { clientPort: process.env.PORT || 5000 },
    cors: true,
    proxy: {
      '/api': {
        target: 'http://localhost:' + (process.env.PORT || 5000),
        changeOrigin: true,
        secure: false
      }
    }
  },
  preview: {
    host: '0.0.0.0',
    port: process.env.PORT || 5000,
    strictPort: true
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './client/src'),
      '@components': path.resolve(__dirname, './client/src/components'),
      '@assets': path.resolve(__dirname, './client/src/assets'),
      '@shared': path.resolve(__dirname, './shared')
    }
  },
  // Permitir qualquer host
  allowedHosts: 'all',
  optimizeDeps: {
    include: ['react', 'react-dom', 'wouter']
  },
  build: {
    outDir: 'dist/public'
  }
});