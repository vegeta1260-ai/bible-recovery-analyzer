const HEBREW_RULES: [string, string][] = [
  ['sh', 'ㄕ'], ['ts', 'ㄘ'], ['ch', 'ㄏ'],
  ['\u02BE', 'ㄚ'], ['ă', 'ㄚ'], ['ā', 'ㄚ'],
  ['e', 'ㄝ'], ['ē', 'ㄟ'], ['i', 'ㄧ'], ['î', 'ㄧ'],
  ['o', 'ㄛ'], ['ō', 'ㄡ'], ['u', 'ㄨ'], ['û', 'ㄨ'],
  ['b', 'ㄅ'], ['g', 'ㄍ'], ['d', 'ㄉ'], ['h', 'ㄏ'],
  ['w', 'ㄨ'], ['z', 'ㄗ'], ['y', 'ㄧ'], ['k', 'ㄎ'],
  ['l', 'ㄌ'], ['m', 'ㄇ'], ['n', 'ㄋ'], ['p', 'ㄆ'],
  ['r', 'ㄖ'], ['s', 'ㄙ'], ['t', 'ㄊ'],
];

const GREEK_RULES: [string, string][] = [
  ['th', 'ㄙ'], ['ph', 'ㄈ'], ['ch', 'ㄎ'], ['ps', 'ㄆㄙ'],
  ['ou', 'ㄨ'], ['ai', 'ㄞ'], ['ei', 'ㄟ'], ['oi', 'ㄛㄧ'],
  ['a', 'ㄚ'], ['e', 'ㄝ'], ['ē', 'ㄟ'], ['i', 'ㄧ'],
  ['o', 'ㄛ'], ['u', 'ㄨ'],
  ['b', 'ㄅ'], ['g', 'ㄍ'], ['d', 'ㄉ'], ['z', 'ㄗ'],
  ['k', 'ㄎ'], ['l', 'ㄌ'], ['m', 'ㄇ'], ['n', 'ㄋ'],
  ['p', 'ㄆ'], ['r', 'ㄖ'], ['s', 'ㄙ'], ['t', 'ㄊ'],
  ['x', 'ㄎㄙ'],
];

export function transliterationToZhuyinLike(text: string, language: string): string {
  const rules = language.toLowerCase() === 'hebrew' ? HEBREW_RULES : GREEK_RULES;
  const sorted = [...rules].sort((a, b) => b[0].length - a[0].length);
  let out = text.toLowerCase();
  for (const [source, target] of sorted) {
    out = out.split(source).join(target);
  }
  return out;
}
