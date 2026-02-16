import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    // In dev mode, redirect /privy-mount.js to the source TSX file
    {
      name: 'privy-dev-redirect',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url === '/privy-mount.js') {
            req.url = '/src/privy-mount.tsx';
          }
          next();
        });
      },
    },
  ],
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        privy: path.resolve(__dirname, 'src/privy-mount.tsx'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'privy') return 'privy-mount.js';
          return 'assets/[name]-[hash].js';
        },
      },
    },
  },
});
