import { defineConfig } from 'vite';
export default defineConfig({ worker: { format: 'es' }, build: { target: 'es2022', chunkSizeWarningLimit: 2500 }, server: { host: '127.0.0.1', port: 4317, strictPort: true } });
