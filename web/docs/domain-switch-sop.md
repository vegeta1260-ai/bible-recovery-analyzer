# 換正式網域 SOP（從 github.io 子路徑 → 自訂網域）

> **📜 歷史紀錄**：2026-06-21 已依本 SOP 將程式層遷移至自架主機 `https://bible.weiqi.kids`（`site`/`base`/robots/smoke 皆已改，rsync over SSH 部署）。
> 本檔保留作參考。**尚未完成的收尾**（部署成功後執行）：
> 1. GSC / Bing 對新網域建資源、提交 sitemap；
> 2. 舊 GitHub Pages 站改發 canonical + meta-refresh 轉址殼站（GitHub Pages 專案站無法真 301 到外部網域，本檔第 7 節的「自動 301」假設不適用自架路線）；
> 3. Rich Results 驗證、社群分享卡重抓。
>
> 原始清單盤點時間：2026-06-19。改 code 前先 `grep -rn "vegeta1260-ai.github.io\|/bible-recovery-analyzer" web/src web/scripts web/public web/astro.config.mjs` 復查，避免日後新增遺漏。

---

## 前提：先決定網域形態

| 形態 | 範例 | `site` | `base` |
|------|------|--------|--------|
| **頂層網域 / 子網域**（最常見） | `https://bible.example.com` | 該網址 | `/`（根目錄，**不再有子路徑**） |
| 仍掛在 github.io 但換 repo 名 | `https://x.github.io/new-name` | `https://x.github.io` | `/new-name` |

⚠️ 下列步驟以**自訂網域、`base` 改為根目錄 `/`** 為預設（最常見情境）。若仍是子路徑，把下文的 `/`（根）替換成新的 `/<base>`。

---

## 1. `astro.config.mjs`（單一真實來源）

```js
site: 'https://bible.example.com',   // L10：改成正式網址
base: '/',                            // L11：自訂網域改根目錄；仍子路徑則填 /<new-base>
```

> 站內所有 `import.meta.env.BASE_URL` 與 `Astro.site` 都源自這裡，改這兩行後**大多數頁面/連結自動跟著變**（BookGrid、Header、canonical、OG URL、breadcrumb…）。下面要手動改的只剩「寫死 fallback」與「smoke 斷言」。

## 2. 寫死的 fallback 網址（Astro.site 取不到時的退路）

兩處 `?? 'https://vegeta1260-ai.github.io'` fallback，改成新網址（保險，正常 build 走 `Astro.site` 不會用到，但別留舊值誤導）：

- `src/layouts/BaseLayout.astro` L24
- `src/pages/study/[book]/[chapter].astro` L136

## 3. `public/robots.txt`

Sitemap 那行改成新網址（`base` 改根目錄時不再有 `/bible-recovery-analyzer`）：

```
Sitemap: https://bible.example.com/sitemap-index.xml
```

> 自訂網域的一大好處：`robots.txt` 落在**網域根**，爬蟲一定讀得到（github.io 子路徑站的根 robots 不在本 repo，是已知坑）。

## 4. GitHub Pages 自訂網域綁定（CNAME）

GitHub Pages 自訂網域需要 `CNAME` 檔，且**走 gh-pages action 部署時必須放在 `public/CNAME`** 才會被一起發佈、不被每次 deploy 覆蓋掉：

```
# web/public/CNAME（內容只有一行網域，無 https://、無斜線）
bible.example.com
```

同時：GitHub repo → Settings → Pages → Custom domain 填入網域；DNS 端設 `CNAME` 指向 `vegeta1260-ai.github.io`（或 apex 網域設 A/AAAA 指 GitHub Pages IP）；等 GitHub 簽發 HTTPS 憑證後勾 **Enforce HTTPS**。

## 5. smoke test 內寫死的 base path 斷言

`base` 改根目錄後，這些斷言的 `/bible-recovery-analyzer/...` 會全失敗，逐條改成新 base（根目錄即 `/study`、`/books`…）：

- `scripts/smoke-test-build.sh` L160, L179–183（og:image 含 base、各導覽連結）
- `scripts/smoke-test-deployed.sh` L7（`BASE` 預設值）、L101–103

> 改完務必本地 `npm run build && npm run test:smoke` 跑綠再 push。

## 6. 其他連帶檢查

- **OG 卡 PNG 不用重產**：圖檔本身與網域無關；URL 由 `BaseLayout` 用 `siteUrl + base` 動態組（步驟 1 改完即正確）。
- **Cloudflare Web Analytics**（若有用）：CF 儀表板的 site 設定換成新網域，否則 beacon 資料對不上。
- 根 `web/README.md`、`CLAUDE.md` 內提到舊網址的說明段落順手更新。

---

## 7. 上線後才做（順序很重要，域名定案前別做）

1. **Google Search Console / Bing Webmaster** 用**新網域**建立資源，提交 `https://bible.example.com/sitemap-index.xml`。
   - 若舊 github.io 已被索引過：在舊資源設「網站變更地址（Change of Address）」，並保留 301（自訂網域生效後 github.io 子路徑會自動轉址）。
2. **Rich Results Test** 驗證：首頁 `Organization`+`WebSite`、`/faq` `FAQPage`、`/study/John/3` `Breadcrumb`+`Article`。
3. 社群分享卡：用 Facebook Sharing Debugger / X Card Validator 重新抓取，清掉舊網址快取。

---

## 一行驗收

```bash
cd web && npm run build && npm run test:smoke   # 必須全綠
grep -rn "vegeta1260-ai.github.io" src scripts public astro.config.mjs   # 應只剩刻意保留處（理想為 0）
```
