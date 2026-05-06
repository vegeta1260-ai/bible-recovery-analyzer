const STRONGS_CANONICAL = /^([GH])(\d{1,4})([A-Z]?)$/;
const SPECIAL_NORMALIZATION: Record<string, string> = { G3056A: 'G3056', H430A: 'H430' };

export function normalizeStrongs(raw: string): string {
  let text = raw.trim().toUpperCase().replace(/\u2018/g, '').replace(/\u2019/g, '');
  text = SPECIAL_NORMALIZATION[text] ?? text;
  const m = text.match(STRONGS_CANONICAL);
  if (!m) throw new Error(`Invalid Strong's ID: ${raw}`);
  const [, prefix, digits, suffix] = m;
  const normalized = `${prefix}${parseInt(digits, 10)}`;
  return suffix ? `${normalized}${suffix}` : normalized;
}
