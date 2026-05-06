import { useRef, useEffect, useMemo } from 'react';
import * as d3 from 'd3';
import tokensData from '@/data/tokens.json';

interface Token {
  part_of_speech: string;
}

interface PosSlice {
  pos: string;
  count: number;
}

// Warm color palette — hex equivalents of OKLCH warm tones
const WARM_PALETTE = [
  '#8B4513', '#D4A017', '#C4956A', '#8B6914', '#CD853F',
  '#A0522D', '#B8860B', '#C4783C', '#A67C52', '#D2691E',
];

const LABEL_MAP: Record<string, string> = {
  noun: '名詞',
  verb: '動詞',
  adverb: '副詞',
  adjective: '形容詞',
  pronoun: '代詞',
  preposition: '介詞',
  conjunction: '連詞',
  particle: '語助詞',
  article: '冠詞',
};

export default function AnalyticalCodePie() {
  const svgRef = useRef<SVGSVGElement>(null);

  const posData: PosSlice[] = useMemo(() => {
    const tokens = tokensData as Token[];
    const countMap = new Map<string, number>();
    for (const t of tokens) {
      if (!t.part_of_speech) continue;
      countMap.set(t.part_of_speech, (countMap.get(t.part_of_speech) ?? 0) + 1);
    }
    return Array.from(countMap.entries())
      .map(([pos, count]) => ({ pos, count }))
      .sort((a, b) => b.count - a.count);
  }, []);

  useEffect(() => {
    if (!svgRef.current || posData.length === 0) return;

    const size = 320;
    const radius = size / 2 - 30;
    const innerRadius = radius * 0.5; // donut

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    svg
      .attr('width', size)
      .attr('height', size)
      .attr('viewBox', `0 0 ${size} ${size}`)
      .attr('role', 'img')
      .attr('aria-label', 'Part of speech donut chart');

    const g = svg.append('g').attr('transform', `translate(${size / 2},${size / 2})`);

    const colorScale = d3.scaleOrdinal<string>()
      .domain(posData.map(d => d.pos))
      .range(WARM_PALETTE);

    const pie = d3.pie<PosSlice>()
      .value(d => d.count)
      .sort(null);

    const arc = d3.arc<d3.PieArcDatum<PosSlice>>()
      .innerRadius(innerRadius)
      .outerRadius(radius);

    const arcHover = d3.arc<d3.PieArcDatum<PosSlice>>()
      .innerRadius(innerRadius)
      .outerRadius(radius + 8);

    const labelArc = d3.arc<d3.PieArcDatum<PosSlice>>()
      .innerRadius(radius + 14)
      .outerRadius(radius + 14);

    const total = posData.reduce((s, d) => s + d.count, 0);

    // Tooltip
    let tooltip = d3.select('body').select<HTMLDivElement>('.pie-chart-tooltip');
    if (tooltip.empty()) {
      tooltip = d3.select('body')
        .append('div')
        .attr('class', 'pie-chart-tooltip')
        .style('position', 'fixed')
        .style('pointer-events', 'none')
        .style('background', '#2a1a0a')
        .style('color', '#f5e6c8')
        .style('padding', '8px 12px')
        .style('border-radius', '6px')
        .style('font-size', '13px')
        .style('opacity', '0')
        .style('z-index', '9999')
        .style('transition', 'opacity 0.15s');
    }

    const slices = g.selectAll<SVGPathElement, d3.PieArcDatum<PosSlice>>('path.slice')
      .data(pie(posData))
      .join('path')
      .attr('class', 'slice')
      .attr('d', arc)
      .attr('fill', d => colorScale(d.data.pos))
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer');

    slices
      .on('mousemove', (event, d) => {
        d3.select(event.currentTarget).attr('d', arcHover(d) ?? '');
        const pct = ((d.data.count / total) * 100).toFixed(1);
        const label = LABEL_MAP[d.data.pos] ?? d.data.pos;
        tooltip
          .style('opacity', '1')
          .style('left', `${event.clientX + 12}px`)
          .style('top', `${event.clientY - 30}px`)
          .html(`<strong>${label}</strong><br/>${d.data.count} 個 (${pct}%)`);
      })
      .on('mouseleave', (event, d) => {
        d3.select(event.currentTarget).attr('d', arc(d) ?? '');
        tooltip.style('opacity', '0');
      });

    // Slice labels (only for slices large enough)
    g.selectAll<SVGTextElement, d3.PieArcDatum<PosSlice>>('text.slice-label')
      .data(pie(posData).filter(d => d.data.count / total > 0.05))
      .join('text')
      .attr('class', 'slice-label')
      .attr('transform', d => `translate(${labelArc.centroid(d)})`)
      .attr('text-anchor', 'middle')
      .attr('font-size', '11px')
      .attr('fill', '#3a2810')
      .text(d => LABEL_MAP[d.data.pos] ?? d.data.pos);

    // Center text
    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '-0.2em')
      .attr('font-size', '18px')
      .attr('font-weight', 'bold')
      .attr('fill', '#8B4513')
      .text(total);

    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '1.1em')
      .attr('font-size', '11px')
      .attr('fill', '#8B6914')
      .text('總 tokens');

    return () => {
      tooltip.remove();
    };
  }, [posData]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <h3 style={{ color: '#8B4513', marginBottom: '0.5rem', fontSize: '1rem', alignSelf: 'flex-start' }}>
        詞性分佈
      </h3>
      <svg ref={svgRef} style={{ display: 'block' }} />
    </div>
  );
}
