// LSM = Living Stream Ministry（水流職事站），恢復本聖經的出版者 —— 與 AI/LLM 無關。
// 恢復本中文經文為 LSM 版權所有，不可離線打包，必須 runtime 向 LSM API 認證後取得。
//
// 以下 APP_ID / TOKEN 是 LSM 針對「網頁應用」核發、設計即供瀏覽器端公開使用的 web token
// （token 的 `web_` 前綴即為此用途分級），已確認可公開隨靜態 bundle 上線，不視為機密洩漏。
// 純靜態站（GitHub Pages）無 server 可代理，故憑證必然落在 client 端，此為預期取捨。
//
// 注意：這與後端 bible_recovery_analyzer/ 使用的 LSM 憑證是「不同來源、不同機制」——
// 後端走 env 變數、禁止寫進 repo；該規則只適用後端，不適用此公開 web token。
const LSM_API_URL = 'https://api.lsm.org/recver/txo.php';
const LSM_APP_ID = 'ai.vegeta1260.biblerecoveryanalyzer';
const LSM_TOKEN = 'web_9972c275-24f4-4720-bd42-8b5c0d9c6fd7';
const LSM_AUTH = 'Basic ' + btoa(`${LSM_APP_ID}:${LSM_TOKEN}`);

export interface RecoveryVerse {
  ref: string;
  text: string;
}

export interface RecoveryResult {
  verses: RecoveryVerse[];
  text: string;
  inputstring: string;
  detected: string;
  message: string;
  copyright: string;
  error?: boolean;
  errorMessage?: string;
}

function emptyResult(): RecoveryResult {
  return { verses: [], text: '', inputstring: '', detected: '', message: '', copyright: '' };
}

function errorResult(msg: string): RecoveryResult {
  return { ...emptyResult(), error: true, errorMessage: msg };
}

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
const RETRY_DELAY_MS = 2000;
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

async function doFetch(ref: string): Promise<RecoveryResult> {
  const params = new URLSearchParams({ String: ref, Out: 'json' });
  const resp = await fetch(`${LSM_API_URL}?${params}`, {
    headers: { Authorization: LSM_AUTH },
  });
  if (!resp.ok) {
    // 5xx/429 視為可重試 → 丟出讓上層退避重試；其餘（401/404…）直接回錯，不重試。
    if (RETRYABLE_STATUS.has(resp.status)) {
      throw new Error(`LSM API returned ${resp.status} (retryable)`);
    }
    return errorResult(`LSM API returned ${resp.status}`);
  }
  const data = await resp.json();
  const verses: RecoveryVerse[] = [];
  if (Array.isArray(data.verses)) {
    for (const v of data.verses) {
      if (v && typeof v.text === 'string' && v.text.trim()) {
        verses.push({ ref: v.ref || '', text: v.text.trim() });
      }
    }
  }
  const text = typeof data.text === 'string' ? data.text.trim()
    : verses.map(v => v.text).join('\n');

  return {
    verses,
    text,
    inputstring: data.inputstring || '',
    detected: data.detected || '',
    message: data.message || '',
    copyright: data.copyright || '',
  };
}

// 同一 ref 的去重與成功快取：純靜態站無 server 可代理，公開 web token 落在 client，
// 這層讓並發/重複查詢只打一次 LSM，保護 token 配額、避免被濫用拖垮。
const inflight = new Map<string, Promise<RecoveryResult>>();
const successCache = new Map<string, RecoveryResult>();

/** 測試用：清掉模組層去重/快取狀態（Map 會跨測試殘留，導致互相污染）。 */
export function __resetLsmCache(): void {
  inflight.clear();
  successCache.clear();
}

export async function fetchRecoveryText(ref: string): Promise<RecoveryResult> {
  const key = ref.trim();

  const cached = successCache.get(key);
  if (cached) return cached;

  const pending = inflight.get(key);
  if (pending) return pending;

  const task = (async (): Promise<RecoveryResult> => {
    try {
      return await doFetch(key);
    } catch {
      // 網路例外或可重試狀態 → 退避 2 秒後重試一次
      await sleep(RETRY_DELAY_MS);
      try {
        return await doFetch(key);
      } catch (retryErr) {
        return errorResult(retryErr instanceof Error ? retryErr.message : 'Unknown error');
      }
    }
  })();

  inflight.set(key, task);
  try {
    const result = await task;
    if (!result.error) successCache.set(key, result); // 只快取成功結果
    return result;
  } finally {
    inflight.delete(key);
  }
}
