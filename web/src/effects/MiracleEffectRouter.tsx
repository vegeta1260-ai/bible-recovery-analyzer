/**
 * MiracleEffectRouter — selects and renders the appropriate miracle effect
 * based on book/ref/normalizedForms matching the trigger rules from spec §8.2.
 *
 * Uses normalized_form (no diacritics) for semantic matching, NOT lemma.
 */

import { useState, useCallback } from 'react';
import GenesisLight from './GenesisLight';
import PartingWaters from './PartingWaters';
import PentecostFlames from './PentecostFlames';
import ResurrectionQuake from './ResurrectionQuake';
import TreeOfLife from './TreeOfLife';
import CosmicFirmament from './CosmicFirmament';
import DoveDescending from './DoveDescending';

// Greek pneuma in normalized form (no diacritics)
const PNEUMA = '\u03C0\u03BD\u03B5\u03C5\u03BC\u03B1';

export type EffectKey =
  | 'genesis-light'
  | 'parting-waters'
  | 'pentecost-flames'
  | 'resurrection-quake'
  | 'tree-of-life'
  | 'cosmic-firmament'
  | 'dove-descending'
  | 'particle-text'
  | null;

export interface MiracleContext {
  /** OSIS book abbreviation, e.g. "Gen", "John" */
  book: string;
  /** Full OSIS ref, e.g. "Matt.28.1" */
  ref: string;
  /** normalized_form values from Token[] for the verse */
  normalizedForms: string[];
}

interface EffectRule {
  match: (ctx: MiracleContext) => boolean;
  effect: EffectKey;
}

/** Ordered rules — first match wins (except particle-text fallback). */
// first-match 下同條件重複規則永不可達，已刪 Gen→cosmic-firmament、pneuma→pentecost-flames（兩效果仍分別由 Ps／Acts 規則觸達）
export const EFFECT_RULES: EffectRule[] = [
  // Book-level
  { match: ctx => ctx.book === 'Gen',  effect: 'genesis-light' },
  { match: ctx => ctx.book === 'Exod', effect: 'parting-waters' },
  { match: ctx => ctx.book === 'Ps',   effect: 'cosmic-firmament' },
  { match: ctx => ctx.book === 'Acts', effect: 'pentecost-flames' },
  { match: ctx => ctx.book === 'Rev',  effect: 'tree-of-life' },

  // Chapter-level — resurrection passages
  {
    match: ctx =>
      ['Matt.28', 'Mark.16', 'Luke.24', 'John.20'].some(p => ctx.ref.startsWith(p)),
    effect: 'resurrection-quake',
  },

  // Semantic-level — normalized pneuma form
  { match: ctx => ctx.normalizedForms.includes(PNEUMA), effect: 'dove-descending' },

  // Default fallback
  { match: () => true, effect: 'particle-text' },
];

/** Returns the first matching effect key for a given context. */
export function resolveEffect(ctx: MiracleContext): EffectKey {
  const rule = EFFECT_RULES.find(r => r.match(ctx));
  return rule?.effect ?? null;
}

interface Props {
  context: MiracleContext;
  /** Called when the effect animation completes */
  onComplete?: () => void;
}

export default function MiracleEffectRouter({ context, onComplete }: Props) {
  const [visible, setVisible] = useState(true);

  const handleComplete = useCallback(() => {
    setVisible(false);
    onComplete?.();
  }, [onComplete]);

  if (!visible) return null;

  const effect = resolveEffect(context);

  switch (effect) {
    case 'genesis-light':
      return <GenesisLight onComplete={handleComplete} />;
    case 'parting-waters':
      return <PartingWaters onComplete={handleComplete} />;
    case 'pentecost-flames':
      return <PentecostFlames onComplete={handleComplete} />;
    case 'resurrection-quake':
      return <ResurrectionQuake onComplete={handleComplete} />;
    case 'tree-of-life':
      return <TreeOfLife onComplete={handleComplete} />;
    case 'cosmic-firmament':
      return <CosmicFirmament onComplete={handleComplete} />;
    case 'dove-descending':
      return <DoveDescending onComplete={handleComplete} />;
    case 'particle-text':
      // Particle text is rendered inline in VerseResult, not as overlay
      return null;
    default:
      return null;
  }
}
