import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  site: 'https://vegeta1260-ai.github.io',
  base: '/bible-recovery-analyzer',
  integrations: [
    react(),
    // sitemap 權重分級：全站 ~15k URL 中，逐章研經頁與首頁是高價值內容，
    // 14k+ lexicon 字典頁是長尾索引。用 priority/changefreq 引導爬蟲預算。
    sitemap({
      serialize(item) {
        const url = item.url;
        // lastmod = 本次部署日：靜態頁每次 deploy 皆重新產生，屬實；給爬蟲新鮮度訊號。
        item.lastmod = new Date().toISOString();
        if (/\/bible-recovery-analyzer\/?$/.test(url)) {
          item.priority = 1.0;
          item.changefreq = 'weekly';
        } else if (url.includes('/study/')) {
          item.priority = 0.8;
          item.changefreq = 'monthly';
        } else if (url.includes('/lexicon/') && !/\/lexicon\/?$/.test(url)) {
          item.priority = 0.4;
          item.changefreq = 'yearly';
        } else {
          // /books, /study, /lexicon, /faq, /legend, /resources, /maps 等樞紐頁
          item.priority = 0.7;
          item.changefreq = 'monthly';
        }
        return item;
      },
    }),
  ],
  output: 'static',
  // hover/viewport 預取站內連結，加快導覽（engagement 訊號）。
  prefetch: { prefetchAll: true, defaultStrategy: 'hover' },
  vite: {
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
  },
});
