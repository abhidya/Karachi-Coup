import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: mode === 'production' ? '/Karachi-Coup/' : '/',
  test: {
    environment: 'jsdom',
  },
}));
