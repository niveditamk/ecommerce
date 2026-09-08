import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false
    /* There was a manual "three" chunk here holding three, @react-three/fiber
       and @react-three/drei — 1,090KB, the largest asset the site served. It
       existed for one component that rendered a single unlit plane behind the
       page; reading the canvas back with readPixels showed it painting 0 of
       1,296,000 pixels. All three packages are gone, so the chunk has nothing
       left to name. Vite's default splitting is right for what remains. */
  }
});
