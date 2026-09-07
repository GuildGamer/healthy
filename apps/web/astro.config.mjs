import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://healthy.example',
  output: 'static',
  integrations: [sitemap()],
});
