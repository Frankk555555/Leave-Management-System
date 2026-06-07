import { defineConfig } from 'vite';

export default defineConfig({
  optimizeDeps: {
    include: [
      'react-icons',
      'react-icons/fa',
      'react-icons/fa6', // including fa6 just in case it is used
    ],
  },
});
