import { defineConfig } from 'vite';

export default defineConfig({
  optimizeDeps: {
    include: [
      'react-icons',
      'react-icons/fa',
      'react-icons/fa6',
    ],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-icons': ['react-icons'],
        },
      },
    },
  },
});
