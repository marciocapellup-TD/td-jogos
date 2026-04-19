import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true, // falha se 5173 ocupada em vez de pular
    host: true,       // expõe na rede local (acesso do celular via IP)
  },
});
