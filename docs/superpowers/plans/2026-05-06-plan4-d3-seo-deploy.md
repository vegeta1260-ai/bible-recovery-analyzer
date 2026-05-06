# Plan 4: D3 Visualizations + SEO/AEO + OG Images + GitHub Actions Deploy

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 加入 D3.js 互動圖表（lemma 頻率、分析碼分佈、經節網絡），完善 SEO/AEO（meta tags、OG images），設定 GitHub Actions 自動部署到 GitHub Pages。

**Architecture:** D3 圖表封裝為 React Islands，使用 `client:visible` 或 `client:idle` 延遲載入。OG images 在 build time 用 satori 生成。GitHub Actions 在 push 到 main 且 web/ 有變更時觸發。

**Tech Stack:** D3.js 7, satori + sharp (OG image), GitHub Actions

**Spec reference:** `docs/superpowers/specs/2026-05-06-github-pages-frontend-design.md` sections 6.2, 14, 16
**Depends on:** Plan 1 + Plan 2 completed

---

## Tasks

### Task 1: 安裝 D3 依賴

- [ ] Install packages:
```bash
cd web
npm install d3
npm install -D @types/d3
```
- [ ] Commit: `feat(web): install D3.js`

### Task 2: LemmaFrequencyChart

- [ ] Create `web/src/components/islands/LemmaFrequencyChart.tsx` — D3 水平長條圖，顯示 lemma 出現頻率
- [ ] Uses `web/src/data/tokens.json` 統計各 lemma 出現次數
- [ ] OKLCH 暖色系配色，hover 顯示詳情
- [ ] Commit: `feat(web): add LemmaFrequencyChart D3 visualization`

### Task 3: AnalyticalCodePie

- [ ] Create `web/src/components/islands/AnalyticalCodePie.tsx` — D3 圓餅圖，顯示分析碼分佈
- [ ] 統計 tokens 中各 part_of_speech 的比例
- [ ] Commit: `feat(web): add AnalyticalCodePie D3 visualization`

### Task 4: RelatedVersesNetwork

- [ ] Create `web/src/components/islands/RelatedVersesNetwork.tsx` — D3 force-directed 網絡圖
- [ ] 節點 = verse_ref，邊 = 共享 lemma
- [ ] Commit: `feat(web): add RelatedVersesNetwork D3 visualization`

### Task 5: D3OccurrenceChart (for lexicon pages)

- [ ] Create `web/src/components/islands/D3OccurrenceChart.tsx` — 特定 Strong's ID 在各經卷的出現分佈
- [ ] Update `web/src/pages/lexicon/[id].astro` — 加入 D3OccurrenceChart island (`client:visible`)
- [ ] Commit: `feat(web): add D3OccurrenceChart to lexicon pages`

### Task 6: D3 圖表整合到 /study

- [ ] Update `web/src/components/islands/SearchBox.tsx` 或 `VerseResult.tsx` — 搜尋結果下方顯示 LemmaFrequencyChart + AnalyticalCodePie
- [ ] 桌面顯示圖表，手機用 `client:media="(min-width: 768px)"` 不載入
- [ ] Commit: `feat(web): integrate D3 charts into study results`

### Task 7: SEO Meta Tags 完善

- [ ] Update `web/src/layouts/BaseLayout.astro` — 加入完整 OG tags, Twitter Card tags
- [ ] Ensure all pages pass correct title + description
- [ ] Commit: `feat(web): enhance SEO meta tags across all pages`

### Task 8: GitHub Actions 部署

- [ ] Create `.github/workflows/deploy-pages.yml`:
```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
    paths: ['web/**']
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: web/package-lock.json
      - run: npm ci
        working-directory: web
      - run: npm run build
        working-directory: web
      - uses: actions/upload-pages-artifact@v3
        with:
          path: web/dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```
- [ ] Commit: `ci: add GitHub Actions workflow for Pages deployment`

### Task 9: Build 驗證 + 最終整合

- [ ] Run all tests: `npx vitest run`
- [ ] Full build: `npx astro build`
- [ ] Verify all pages output
- [ ] Commit: `feat(web): Plan 4 complete — D3 charts, SEO, deployment`

---

## Plan 4 完成條件

- [ ] 4 個 D3 圖表元件建立並整合
- [ ] Lexicon 頁面有 D3OccurrenceChart
- [ ] /study 結果下方有 LemmaFrequencyChart + AnalyticalCodePie
- [ ] 所有頁面有完整 SEO meta tags
- [ ] GitHub Actions workflow 建立
- [ ] Build 成功
