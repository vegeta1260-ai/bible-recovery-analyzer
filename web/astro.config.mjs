import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

export default defineConfig({
  site: 'https://vegeta1260-ai.github.io',
  base: '/bible-recovery-analyzer',
  integrations: [react()],
  output: 'static',
});
