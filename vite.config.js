import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

const isProduction = process.env.NODE_ENV === 'production';

export default defineConfig({
  base: isProduction ? './' : '/',
  plugins: [react()],
  build: {
    outDir: '../frontend/dist',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});
