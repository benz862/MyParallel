import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load environment variables
  const env = loadEnv(mode, process.cwd(), '');

  return {
    base: './', // Required for shared hosting compatibility

    plugins: [react()],

    define: {
      // Only expose the API_KEY if needed
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
      // Expose API URL for frontend
      'import.meta.env.VITE_API_URL': JSON.stringify(env.VITE_API_URL),
      'import.meta.env.VITE_USE_NGROK': JSON.stringify(env.VITE_USE_NGROK),
    },

    server: {
      port: 5173,       // ✔ FRONTEND runs on 5173
      host: true,
      strictPort: true,  // ✔ Force the port, no fallback to 3000
      proxy: {
        '/api': {
          target: 'http://localhost:8081',
          changeOrigin: true,
        },
      },
    },

    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: false,
      emptyOutDir: true,
    }
  };
});