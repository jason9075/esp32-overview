import { defineConfig } from 'vite';

export default defineConfig({
  // Relative base so the bundle works both at a GitHub Pages project sub-path and at a domain root.
  base: './',
  server: {
    port: 5173,
    open: false,
  },
  preview: {
    port: 4173,
    strictPort: true,
  },
  build: {
    target: 'es2022',
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        // Keep Three.js in its own long-lived cacheable chunk, separate from app code.
        manualChunks: {
          three: ['three', 'three-mesh-bvh'],
        },
      },
    },
  },
});
