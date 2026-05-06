import { useRef, useEffect, useMemo } from 'react';
import * as d3 from 'd3';
import tokensData from '@/data/tokens.json';

interface Token {
  verse_ref: string;
  strongs_primary: string;
  strongs_secondary: string | null;
}

interface BookCount {
  book: string;
  count: number;
}

interface Props {
  strongs: string;
}

// Warm color palette
const BAR_COLOR = '#C4783C';
const BAR_HOVER = '#8B4513';

export default function D3OccurrenceChart({ strongs }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  const bookData: BookCount[] = useMemo(() => {
    const tokens = tokensData as Token[];
    const countMap = new Map<string, number>();

    for (const t of tokens) {
      const matchesPrimary = t.strongs_primary === strongs;
      const matchesSecondary = t.strongs_secondary === strongs;
      if (!matchesPrimary && !matchesSecondary) continue;

      const book = t.verse_ref.split('.')[0] ?? 'Unknown';
      countMap.set(book, (countMap.get(book) ?? 0) + 1);
    }

    return Array.from(countMap.entries())
      .map(([book, count]) => ({ book, count }))
      .sort((a, b) => b.count - a.count);
  }, [strongs]);

  useEffect(() => {
    if (!svgRef.current) return;

    if (bookData.length === 0) {
      const svg = d3.select(svgRef.current);
      svg.selectAll('*').remove();
      svg.append('text')
        .attr('x', 10)
        .attr('y', 30)
        .attr('fill', '#8B6914')
        .attr('font-size', '14px')
        .text('此 Strong\'s ID 在資料集中無出現紀錄');
      return;
    }

    const container = svgRef.current.parentElement;
    const width = container ? Math.min(container.clientWidth, 560) : 560;
    const margin = { top: 16, right: 24, bottom: 48, left: 60 };
    const innerWidth = width - margin.left - margin.right;
    const barWidth = Math.max(20, Math.min(60, innerWidth / bookData.length - 8));
    const height = 200 + margin.top + margin.bottom;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    svg
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('role', 'img')
      .attr('aria-label', `Occurrence chart for ${strongs}`);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
    const chartWidth = bookData.length * (barWidth + 8);

    const xScale = d3.scaleBand()
      .domain(bookData.map(d => d.book))
      .range([0, chartWidth])
      .padding(0.25);

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(bookData, d => d.count) ?? 1])
      .nice()
      .range([200, 0]);

    // Tooltip
    let tooltip = d3.select('body').select<HTMLDivElement>('.occ-chart-tooltip');
    if (tooltip.empty()) {
      tooltip = d3.select('body')
        .append('div')
        .attr('class', 'occ-chart-tooltip')
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

    g.selectAll<SVGRectElement, BookCount>('rect.bar')
      .data(bookData)
      .join('rect')
      .attr('class', 'bar')
      .attr('x', d => xScale(d.book) ?? 0)
      .attr('y', d => yScale(d.count))
      .attr('width', xScale.bandwidth())
      .attr('height', d => 200 - yScale(d.count))
      .attr('fill', BAR_COLOR)
      .attr('rx', 3)
      .style('cursor', 'pointer')
      .on('mousemove', (event, d) => {
        d3.select(event.currentTarget).attr('fill', BAR_HOVER);
        tooltip
          .style('opacity', '1')
          .style('left', `${event.clientX + 12}px`)
          .style('top', `${event.clientY - 30}px`)
          .html(`<strong>${d.book}</strong><br/>${strongs} 出現 ${d.count} 次`);
      })
      .on('mouseleave', (event) => {
        d3.select(event.currentTarget).attr('fill', BAR_COLOR);
        tooltip.style('opacity', '0');
      });

    // X axis
    g.append('g')
      .attr('transform', `translate(0,200)`)
      .call(d3.axisBottom(xScale))
      .selectAll('text')
      .attr('fill', '#5a3e1b')
      .attr('font-size', '11px')
      .attr('transform', 'rotate(-30)')
      .attr('text-anchor', 'end');

    // Y axis
    g.append('g')
      .call(d3.axisLeft(yScale).ticks(5).tickFormat(d => String(d)))
      .selectAll('text')
      .attr('fill', '#5a3e1b')
      .attr('font-size', '11px');

    return () => {
      tooltip.remove();
    };
  }, [bookData, strongs]);

  return (
    <div style={{ width: '100%', overflowX: 'auto', marginTop: '1.5rem' }}>
      <h3 style={{ color: '#8B4513', marginBottom: '0.5rem', fontSize: '1rem' }}>
        {strongs} 在各書卷的出現次數
      </h3>
      <svg ref={svgRef} style={{ display: 'block' }} />
    </div>
  );
}
