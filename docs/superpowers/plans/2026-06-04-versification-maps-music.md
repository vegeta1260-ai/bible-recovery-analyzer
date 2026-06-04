# 全經節對映 / 聖經地圖 / 逐章頁聖樂 實作計劃

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development 或 superpowers:executing-plans 逐任務實作。步驟用 checkbox（`- [ ]`）追蹤。

**Goal:** 修正原文↔恢復本分節錯位（詩篇題注/3John 末節），並新增聖經地圖與逐章頁聖樂。

**Architecture:** 功能一掃描驅動產 `versification.json`，`ChapterRecovery` 套對映把恢復本節號轉成正確原文 slot。功能二 Leaflet + 古地圖 ImageOverlay。功能三接 `musicManager` 到逐章頁 + 換開放授權音源。

**Tech Stack:** Astro、TypeScript、vitest、Node fetch（LSM）、Leaflet、Howler.js。

依賴關係：**功能一可立即全程執行**（僅依賴 LSM，已有）。功能二待底圖圖片素材；功能三待音源定案。故本計劃詳列功能一；功能二三在素材就緒後以同樣 TDD 粒度補完。

---

## 功能一：全經節對映

**File Structure**
- Create `web/scripts/scan-versification.mjs` — 掃描全經，產差異清單與 `versification.json`（手動工具，不進 CI）。
- Create `web/src/data/versification.json` — 對映資料（掃描產出 + 人工複核）。
- Create `web/src/lib/versification.ts` — 純函式 `recoveryVerseToOrigSlots()`，讀對映。
- Create `web/tests/lib/versification.test.ts` — 對映函式單元測試（進 CI）。
- Modify `web/src/components/islands/ChapterRecovery.tsx` — 填 slot 前套對映。
- Modify `web/src/pages/study/[book]/[chapter].astro` — 題注空格顯示「〔詩篇題注〕」標記。

### Task 1：掃描腳本，產出差異範圍

**Files:** Create `web/scripts/scan-versification.mjs`

- [ ] **Step 1: 寫掃描腳本**（讀 token 原文節號、打 LSM 取恢復本節號、比對、推導 type、輸出 `versification.json` + 摘要）
- [ ] **Step 2: 跑** `node scripts/scan-versification.mjs` —— 預期印出差異卷章摘要並寫出 `src/data/versification.json`
- [ ] **Step 3: 人工複核**摘要：確認詩篇題注皆 offset、3John 為 merge、其餘 review 項歸類正確
- [ ] **Step 4: commit** 腳本與 `versification.json`

### Task 2：對映純函式 + 單元測試（TDD）

**Files:** Create `web/src/lib/versification.ts`、`web/tests/lib/versification.test.ts`

- [ ] **Step 1: 寫失敗測試** —— offset：`recoveryVerseToOrigSlots('Ps',3,1)` → `[2]`；merge：`recoveryVerseToOrigSlots('3John',1,14)` → `[14,15]`；無差異：`recoveryVerseToOrigSlots('John',3,16)` → `[16]`
- [ ] **Step 2: 跑測試確認失敗**（函式未定義）
- [ ] **Step 3: 實作** `recoveryVerseToOrigSlots`（讀 `versification.json`，offset 回 `[rec+k]`，merge 回對應陣列，預設回 `[rec]`）
- [ ] **Step 4: 跑測試確認通過**
- [ ] **Step 5: commit**

### Task 3：ChapterRecovery 套對映

**Files:** Modify `web/src/components/islands/ChapterRecovery.tsx`

- [ ] **Step 1:** 填 slot 時，把恢復本節號經 `recoveryVerseToOrigSlots(osis,ch,recVerse)` 轉成原文 slot 節號（可多格）後填入；island 需新增 `osis`/`chapter` props。
- [ ] **Step 2:** 逐章頁傳入 `osis`/`chapter` 給 island。
- [ ] **Step 3:** 題注空格（原文 v1 未被任何恢復本節對應到）顯示「〔詩篇題注〕」。
- [ ] **Step 4: build + 線上驗證** Ps3/Ps51/3John 對齊正確、無錯位、末節不空。
- [ ] **Step 5: commit**

### Task 4：CI gate

**Files:** Modify `web/tests/lib/versification.test.ts`、`web/scripts/check-recovery-coverage.mjs`

- [ ] **Step 1:** vitest 加「`versification.json` 對掃描出的每個差異章都有條目」。
- [ ] **Step 2:** `check:recovery` 加抽驗 Ps3/Ps51 套對映後 `recoveryVerseToOrigSlots` 對齊。
- [ ] **Step 3:** 全 gate（test/build/smoke）綠 → commit → push → CI 部署 → 線上驗證。

---

## 功能二：聖經地圖（待底圖素材就緒後細化）

骨架（素材到位後補 bite-sized）：Leaflet 入 deps → `MapView.tsx`（ImageOverlay）→ `maps/*.json` 資料 + `public/maps/*` 底圖 → `/maps` 頁 → smoke gate。先做 1 張（出埃及路線）打通管線，再複製其餘。

## 功能三：逐章頁聖樂（待音源定案後細化）

骨架：(A) 逐章頁 mount 呼叫 `musicManager.playForBook(osis)`（尊重靜音預設）+ `getBookType` 單元測試；(B) 用定案的 PD/CC0 素歌替換 `public/audio/ambient-*.mp3`，smoke 維持。

---

## Self-Review
- **Spec coverage:** 功能一全部步驟對應 spec；功能二三骨架對應 spec，細節待素材（spec 已標素材依賴）。
- **Placeholder:** 功能一無；功能二三刻意延後（blocked on 外部素材，非遺漏）。
- **Type consistency:** `recoveryVerseToOrigSlots(osis,chapter,recVerse): number[]` 全程一致。
