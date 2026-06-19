import { useRef, useEffect, useMemo } from 'react';
import * as d3 from 'd3';

interface Token {
  verse_ref: string;
  lemma: string;
  strongs_primary: string;
}

interface Node extends d3.SimulationNodeDatum {
  id: string;
}

interface Link extends d3.SimulationLinkDatum<Node> {
  source: string | Node;
  target: string | Node;
  lemma: string;
}

// Warm color palette
const NODE_COLOR = '#C4956A';
const NODE_STROKE = '#8B4513';
const LINK_COLOR = '#D4A017';
const LABEL_COLOR = '#3a2810';

export default function RelatedVersesNetwork({ tokens }: { tokens: Token[] }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { nodes, links } = useMemo(() => {
    // 安全上限：避免結果跨大量經文時，O(節點²) 連線把瀏覽器卡死。
    const MAX_VERSES = 40;       // 只取前 N 節經文進網絡
    const MAX_LEMMA_VERSES = 12; // 出現在過多節的 lemma（多為虛詞）跳過，省去稠密噪音邊
    const MAX_LINKS = 1500;      // 連線總數硬上限

    // 取結果中出現順序的前 MAX_VERSES 節相異經文
    const allowedVerses = new Set<string>();
    for (const t of tokens) {
      if (t.verse_ref) allowedVerses.add(t.verse_ref);
      if (allowedVerses.size >= MAX_VERSES) break;
    }

    // Build map: lemma -> Set of verse_refs（僅限 allowedVerses）
    const lemmaToVerses = new Map<string, Set<string>>();
    for (const t of tokens) {
      if (!t.lemma || !t.verse_ref || !allowedVerses.has(t.verse_ref)) continue;
      if (!lemmaToVerses.has(t.lemma)) lemmaToVerses.set(t.lemma, new Set());
      lemmaToVerses.get(t.lemma)!.add(t.verse_ref);
    }

    const nodeSet = new Set<string>();
    const linkList: Link[] = [];

    for (const [lemma, verses] of lemmaToVerses.entries()) {
      const verseArr = Array.from(verses);
      if (verseArr.length < 2 || verseArr.length > MAX_LEMMA_VERSES) continue; // 需 ≥2 才成邊；過多則跳過
      for (let i = 0; i < verseArr.length && linkList.length < MAX_LINKS; i++) {
        nodeSet.add(verseArr[i]);
        for (let j = i + 1; j < verseArr.length && linkList.length < MAX_LINKS; j++) {
          nodeSet.add(verseArr[j]);
          linkList.push({ source: verseArr[i], target: verseArr[j], lemma });
        }
      }
    }

    // 無連線時，至少把（受限的）經節列為節點
    if (nodeSet.size === 0) {
      allowedVerses.forEach(v => nodeSet.add(v));
    }

    const nodeList: Node[] = Array.from(nodeSet).map(id => ({ id }));
    return { nodes: nodeList, links: linkList };
  }, [tokens]);

  useEffect(() => {
    if (!svgRef.current) return;

    const container = containerRef.current;
    const width = container ? container.clientWidth : 600;
    const height = 360;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    svg
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('role', 'img')
      .attr('aria-label', 'Related verses force-directed network');

    // Arrow marker
    svg.append('defs').append('marker')
      .attr('id', 'arrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 18)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', LINK_COLOR);

    const g = svg.append('g');

    // Zoom
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 4])
      .on('zoom', event => g.attr('transform', event.transform));
    svg.call(zoom);

    // Simulation
    const simulation = d3.forceSimulation<Node>(nodes)
      .force('link', d3.forceLink<Node, Link>(links).id(d => d.id).distance(90))
      .force('charge', d3.forceManyBody().strength(-180))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide(30));

    // Tooltip
    let tooltip = d3.select('body').select<HTMLDivElement>('.network-tooltip');
    if (tooltip.empty()) {
      tooltip = d3.select('body')
        .append('div')
        .attr('class', 'network-tooltip')
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

    // Links
    const linkSel = g.append('g')
      .selectAll<SVGLineElement, Link>('line')
      .data(links)
      .join('line')
      .attr('stroke', LINK_COLOR)
      .attr('stroke-width', 1.5)
      .attr('stroke-opacity', 0.7)
      .attr('marker-end', 'url(#arrow)');

    // Nodes
    const nodeSel = g.append('g')
      .selectAll<SVGGElement, Node>('g.node')
      .data(nodes)
      .join('g')
      .attr('class', 'node')
      .style('cursor', 'grab')
      .call(
        d3.drag<SVGGElement, Node>()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on('drag', (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          }) as unknown as Parameters<typeof nodeSel.call>[0]
      );

    nodeSel.append('circle')
      .attr('r', 14)
      .attr('fill', NODE_COLOR)
      .attr('stroke', NODE_STROKE)
      .attr('stroke-width', 2);

    nodeSel.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('font-size', '8px')
      .attr('fill', '#fff')
      .text(d => d.id.split('.').slice(0, 2).join('.'));

    nodeSel
      .on('mousemove', (event, d) => {
        const sharedLinks = links.filter(l => {
          const src = typeof l.source === 'object' ? (l.source as Node).id : l.source;
          const tgt = typeof l.target === 'object' ? (l.target as Node).id : l.target;
          return src === d.id || tgt === d.id;
        });
        const lemmas = [...new Set(sharedLinks.map(l => l.lemma))].join(', ');
        tooltip
          .style('opacity', '1')
          .style('left', `${event.clientX + 12}px`)
          .style('top', `${event.clientY - 30}px`)
          .html(`<strong>${d.id}</strong>${lemmas ? `<br/>共享 Lemma: ${lemmas}` : ''}`);
      })
      .on('mouseleave', () => {
        tooltip.style('opacity', '0');
      });

    simulation.on('tick', () => {
      linkSel
        .attr('x1', d => (d.source as Node).x ?? 0)
        .attr('y1', d => (d.source as Node).y ?? 0)
        .attr('x2', d => (d.target as Node).x ?? 0)
        .attr('y2', d => (d.target as Node).y ?? 0);

      nodeSel.attr('transform', d => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });

    return () => {
      simulation.stop();
      tooltip.remove();
    };
  }, [nodes, links]);

  return (
    <div ref={containerRef} style={{ width: '100%', overflowX: 'auto' }}>
      <h3 style={{ color: '#8B4513', marginBottom: '0.5rem', fontSize: '1rem' }}>
        相關經節網絡（共享 Lemma）
      </h3>
      <p style={{ fontSize: '12px', color: '#8B6914', marginBottom: '0.5rem' }}>
        可拖曳節點、滾輪縮放
      </p>
      <svg ref={svgRef} style={{ display: 'block', background: '#fdf6ec', borderRadius: '8px' }} />
    </div>
  );
}
