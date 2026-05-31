import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/', // Changed from '/sia/' for Netlify deployment
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
});
