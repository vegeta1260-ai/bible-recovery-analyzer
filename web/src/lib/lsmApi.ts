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
