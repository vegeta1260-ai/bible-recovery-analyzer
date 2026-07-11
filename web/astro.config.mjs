import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import path from 'path';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 內容真實最後變更日（git commit 日，由 scripts/build-lastmod.mjs 產生並 commit）。
// 資料檔變更後須重跑該腳本，否則 sitemap lastmod 會停在舊日期。
const lastmod = JSON.parse(
  readFileSync(path.resolve(__dirname, 'src/data/lastmod.json'), 'utf-8'),
);

export default defineConfig({
  site: 'https://bible.weiqi.kids',
  base: '/',
  integrations: [
    react(),
    // sitemap 權重分級：全站 ~15k URL 中，逐章研經頁與首頁是高價值內容，
    // 14k+ lexicon 字典頁是長尾索引。用 priority/changefreq 引導爬蟲預算。
    sitemap({
      serialize(item) {
        const url = item.url;
        // lastmod = 內容來源檔的 git 最後 commit 日（非 build 日）：
        // 全站假更新會讓 Google 折價 lastmod，改用真實日期才保得住重爬訊號。
        const studyMatch = url.match(/\/study\/([^/]+)\//);
        if (studyMatch && lastmod.books[studyMatch[1]]) {
          item.lastmod = lastmod.books[studyMatch[1]];
        } else if (url.includes('/lexicon')) {
          item.lastmod = lastmod.lexicon;
        } else {
          item.lastmod = lastmod.site;
        }
        if (/^https?:\/\/[^/]+\/?$/.test(url)) {
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
