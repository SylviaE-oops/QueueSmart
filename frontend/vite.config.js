import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

export default defineConfig({
  plugins: [preact()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5001', // changed to 5001 for testing purpose 
        changeOrigin: true,
      },
    },
  },
});
