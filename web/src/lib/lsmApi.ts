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

async function doFetch(ref: string): Promise<RecoveryResult> {
  const params = new URLSearchParams({ String: ref, Out: 'json' });
  const resp = await fetch(`${LSM_API_URL}?${params}`, {
    headers: { Authorization: LSM_AUTH },
  });
  if (!resp.ok) {
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

export async function fetchRecoveryText(ref: string): Promise<RecoveryResult> {
  try {
    return await doFetch(ref);
  } catch (err) {
    // Retry once
    try {
      return await doFetch(ref);
    } catch (retryErr) {
      return errorResult(retryErr instanceof Error ? retryErr.message : 'Unknown error');
    }
  }
}
