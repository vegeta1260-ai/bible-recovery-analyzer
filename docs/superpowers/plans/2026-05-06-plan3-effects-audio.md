# Plan 3: Effects & Audio — 12 視覺特效 + 環境音樂系統

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 實作 12 個視覺特效（古卷展開、光粒子、活水、創世之光、紅海、火焰、復活震動、生命樹、星空、鴿子）+ 環境音樂系統（Howler.js）+ 程序化音效（Web Audio API）+ MiracleEffectRouter 自動選擇特效。

**Architecture:** 特效分為 CSS-only（活水、火焰基礎）和 JS-powered（粒子、D3 樹、Lottie）。所有特效封裝為 React 元件，透過 MiracleEffectRouter 根據書卷/lemma 自動觸發。音效引擎在使用者首次點擊互動元素時啟動。

**Tech Stack:** tsparticles, Motion (motion/react), lottie-react, Howler.js, Web Audio API, CSS @keyframes

**Spec reference:** `docs/superpowers/specs/2026-05-06-github-pages-frontend-design.md` sections 8, 9
**Depends on:** Plan 1 + Plan 2 completed

---

## Tasks

### Task 1: 安裝特效依賴

- [ ] Install packages:
```bash
cd web
npm install motion tsparticles @tsparticles/react @tsparticles/slim howler lottie-react
npm install -D @types/howler
```
- [ ] Commit: `feat(web): install effect and audio dependencies`

### Task 2: Web Audio API 程序化音效

- [ ] Create `web/src/audio/webAudioEffects.ts` — 封裝三個音效：紙張聲(noise+filter)、鐘聲(oscillator decay)、環境 pad(gain fade)
- [ ] Create `web/src/audio/audioStore.ts` — 音效狀態管理（開/關、localStorage 持久化）
- [ ] Create `web/tests/lib/audioStore.test.ts` — 測試 localStorage 讀寫
- [ ] Commit: `feat(web): add Web Audio API procedural sound effects`

### Task 3: Howler.js 環境音樂管理器

- [ ] Create `web/src/audio/musicManager.ts` — 根據書卷類型切換音樂風格，淡入淡出
- [ ] Create placeholder audio files in `web/public/audio/` (可先用空的 mp3 或極短靜音檔作佔位)
- [ ] Commit: `feat(web): add Howler.js music manager with book-type switching`

### Task 4: AudioController 元件

- [ ] Create `web/src/components/islands/AudioController.tsx` — 右上角音樂控制器（開/關 + 音量 + M 鍵快捷鍵 + aria-live）
- [ ] Update `web/src/components/static/Header.astro` — 加入 AudioController island
- [ ] Append CSS to `web/src/styles/global.css`
- [ ] Commit: `feat(web): add AudioController with mute toggle and keyboard shortcut`

### Task 5: 活水流動進度條 (#3)

- [ ] Create `web/src/effects/LivingWaterLoader.tsx` — SVG path + CSS stroke-dashoffset 動畫，純 CSS 為主
- [ ] Commit: `feat(web): add LivingWaterLoader SVG animation`

### Task 6: 光粒子聚合文字 (#2)

- [ ] Create `web/src/effects/ParticleText.tsx` — tsparticles 粒子從散亂匯聚到文字位置
- [ ] Commit: `feat(web): add ParticleText effect using tsparticles`

### Task 7: 古卷展開 (#1)

- [ ] Create `web/src/effects/ScrollUnfold.tsx` — CSS clip-path 動畫 + Motion 序列
- [ ] Commit: `feat(web): add ScrollUnfold ancient scroll animation`

### Task 8: 書卷神蹟特效 (#4-#10)

- [ ] Create `web/src/effects/GenesisLight.tsx` — CSS radial-gradient + mix-blend-mode
- [ ] Create `web/src/effects/PartingWaters.tsx` — Motion + SVG feTurbulence
- [ ] Create `web/src/effects/PentecostFlames.tsx` — CSS @keyframes + filter: blur
- [ ] Create `web/src/effects/ResurrectionQuake.tsx` — CSS transform shake + Motion
- [ ] Create `web/src/effects/TreeOfLife.tsx` — SVG path stroke-dasharray 逐步繪製
- [ ] Create `web/src/effects/CosmicFirmament.tsx` — Canvas 星空粒子
- [ ] Create `web/src/effects/DoveDescending.tsx` — CSS/SVG 鴿子動畫 (不用 Lottie 以減少依賴)
- [ ] Commit: `feat(web): add 7 book-specific miracle effects`

### Task 9: MiracleEffectRouter

- [ ] Create `web/src/effects/MiracleEffectRouter.tsx` — 根據 book/ref/normalizedForms 選擇並渲染對應特效
- [ ] Create `web/tests/lib/miracleEffects.test.ts` — 測試觸發規則匹配
- [ ] Commit: `feat(web): add MiracleEffectRouter with trigger rules`

### Task 10: 整合到 SearchBox + /study

- [ ] Modify `web/src/components/islands/SearchBox.tsx` — 搜尋結果出現時觸發 MiracleEffectRouter + 音效
- [ ] Modify `web/src/components/islands/VerseResult.tsx` — 加入特效渲染區域
- [ ] Update `web/src/pages/index.astro` — 首頁加入 ScrollUnfold 效果
- [ ] Verify build: `npx astro build`
- [ ] Commit: `feat(web): integrate effects and audio into search flow`

---

## Plan 3 完成條件

- [ ] 12 個特效元件全部建立
- [ ] Web Audio API 程序化音效可播放
- [ ] Howler.js 環境音樂管理器可根據書卷切換
- [ ] AudioController 含靜音按鈕 + M 鍵 + localStorage
- [ ] MiracleEffectRouter 根據觸發規則自動選擇特效
- [ ] prefers-reduced-motion 時關閉動畫
- [ ] Build 成功
