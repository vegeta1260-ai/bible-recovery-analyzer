import { useRef, useEffect, useMemo } from 'react';
import * as d3 from 'd3';

interface Token {
  lemma: string;
  strongs_primary: string;
  literal_gloss_en: string;
  part_of_speech: string;
}

interface LemmaCount {
  lemma: string;
  count: number;
  strongs: string;
  gloss: string;
}

// Warm color palette — hex equivalents of OKLCH warm tones
const WARM_COLORS = [
  '#8B4513', '#A0522D', '#C4783C', '#D4A017', '#C4956A',
  '#8B6914', '#B8860B', '#CD853F', '#D2691E', '#A67C52',
];

export default function LemmaFrequencyChart({ tokens }: { tokens: Token[] }) {
  const svgRef = useRef<SVGSVGElement>(null);

  const lemmaData: LemmaCount[] = useMemo(() => {
    const countMap = new Map<string, { count: number; strongs: string; gloss: string }>();
    for (const t of tokens) {
      if (!t.lemma) continue;
      const existing = countMap.get(t.lemma);
      if (existing) {
        existing.count++;
      } else {
        countMap.set(t.lemma, { count: 1, strongs: t.strongs_primary, gloss: t.literal_gloss_en });
      }
    }
    return Array.from(countMap.entries())
      .map(([lemma, { count, strongs, gloss }]) => ({ lemma, count, strongs, gloss }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);
  }, [tokens]);

  useEffect(() => {
    if (!svgRef.current || lemmaData.length === 0) return;

    const container = svgRef.current.parentElement;
    const width = container ? container.clientWidth : 600;
    const margin = { top: 20, right: 30, bottom: 20, left: 120 };
    const barHeight = 28;
    const height = lemmaData.length * barHeight + margin.top + margin.bottom;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    svg
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('role', 'img')
      .attr('aria-label', 'Lemma frequency bar chart');

    const innerWidth = width - margin.left - margin.right;
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const xScale = d3.scaleLinear()
      .domain([0, d3.max(lemmaData, d => d.count) ?? 1])
      .range([0, innerWidth]);

    const yScale = d3.scaleBand()
      .domain(lemmaData.map(d => d.lemma))
      .range([0, lemmaData.length * barHeight])
      .padding(0.2);

    const colorScale = d3.scaleOrdinal<string>()
      .domain(lemmaData.map(d => d.lemma))
      .range(WARM_COLORS);

    // Tooltip
    let tooltip = d3.select('body').select<HTMLDivElement>('.lemma-chart-tooltip');
    if (tooltip.empty()) {
      tooltip = d3.select('body')
        .append('div')
        .attr('class', 'lemma-chart-tooltip')
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

    // Bars
    g.selectAll<SVGRectElement, LemmaCount>('rect.bar')
      .data(lemmaData)
      .join('rect')
      .attr('class', 'bar')
      .attr('x', 0)
      .attr('y', d => yScale(d.lemma) ?? 0)
      .attr('width', d => xScale(d.count))
      .attr('height', yScale.bandwidth())
      .attr('fill', d => colorScale(d.lemma))
      .attr('rx', 3)
      .style('cursor', 'pointer')
      .on('mousemove', (event, d) => {
        tooltip
          .style('opacity', '1')
          .style('left', `${event.clientX + 12}px`)
          .style('top', `${event.clientY - 30}px`)
          .html(`<strong>${d.lemma}</strong><br/>${d.strongs} — ${d.gloss}<br/>出現 ${d.count} 次`);
      })
      .on('mouseleave', () => {
        tooltip.style('opacity', '0');
      });

    // Count labels on bars
    g.selectAll<SVGTextElement, LemmaCount>('text.count-label')
      .data(lemmaData)
      .join('text')
      .attr('class', 'count-label')
      .attr('x', d => xScale(d.count) + 4)
      .attr('y', d => (yScale(d.lemma) ?? 0) + yScale.bandwidth() / 2 + 4)
      .text(d => d.count)
      // 主題色一律走 style 而非 attr：SVG presentation attribute 不支援 var()
      .style('fill', 'var(--color-text-secondary)')
      .attr('font-size', '12px');

    // Y axis — lemma labels
    g.append('g')
      .call(d3.axisLeft(yScale).tickSize(0))
      .call(axis => axis.select('.domain').remove())
      .selectAll('text')
      .attr('font-size', '13px')
      .style('fill', 'var(--color-text)')
      .attr('dx', '-4');

    // X axis
    g.append('g')
      .attr('transform', `translate(0,${lemmaData.length * barHeight})`)
      .call(d3.axisBottom(xScale).ticks(5).tickFormat(d => String(d)))
      .call(axis => axis.select('.domain').style('stroke', 'var(--color-border)'))
      .selectAll('text')
      .style('fill', 'var(--color-text-secondary)')
      .attr('font-size', '11px');

    return () => {
      tooltip.remove();
    };
  }, [lemmaData]);

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <h3 style={{ color: 'var(--color-primary)', marginBottom: '0.5rem', fontSize: '1rem' }}>
        Lemma 出現頻率
      </h3>
      <svg ref={svgRef} style={{ display: 'block' }} />
    </div>
  );
}
