import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://product.example',
  output: 'static',
  integrations: [sitemap()],
});
