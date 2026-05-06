import codesData from '@/data/analyticalCodes.json';

const { analyticalCodeLegend } = codesData as {
  analyticalCodeLegend: Record<string, string>;
  abbreviationLegend: Record<string, string>;
  grammarNotes: Record<string, string>;
};

export interface AnalyticalCodeInfo {
  code: string;
  expanded: Record<string, string>;
  legend: Record<string, string>;
  methodologyNote: string;
}

export function parseAnalyticalCode(code: string): AnalyticalCodeInfo {
  const parts = code.replace(/\//g, '-').split('-').filter(Boolean);
  const expanded: Record<string, string> = {};
  for (const p of parts) {
    expanded[p] = analyticalCodeLegend[p] ?? 'unknown';
  }
  if (code.includes('M/P')) {
    expanded['M/P'] = analyticalCodeLegend['M/P'];
  }
  return {
    code,
    expanded,
    legend: analyticalCodeLegend,
    methodologyNote: 'Code expansion follows form-first strategy; function-based overrides are flagged in grammar notes.',
  };
}
