import { useEffect, useRef } from 'react';

export interface Place {
  zh: string;       // 中文地名
  x: number;        // 在底圖上的像素座標（左→右）
  y: number;        // 在底圖上的像素座標（上→下）
}

interface Props {
  /** 底圖圖片 URL（古地圖） */
  image: string;
  /** 底圖原始像素寬 */
  width: number;
  /** 底圖原始像素高 */
  height: number;
  /** 要標註的中文地名點 */
  places?: Place[];
  /** 行程路線（依序連線的像素座標 [x,y]） */
  route?: [number, number][];
}

/**
 * 古地圖互動檢視：Leaflet ImageOverlay（L.CRS.Simple 像素座標系）把古地圖當底，
 * 可縮放/平移，並疊上自繪的中文地名點與行程路線。
 * Leaflet 存取 window，故在 useEffect 內「動態 import」（避免 Astro SSR/Node 建置時載入而報錯）。
 * 座標為底圖像素 (x 左→右, y 上→下)；以 [height - y, x] 轉成 Leaflet LatLng。
 */
export default function MapView({ image, width, height, places = [], route }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let map: any;
    let cancelled = false;

    (async () => {
      const L = (await import('leaflet')).default;
      // @ts-expect-error CSS 副作用匯入無型別
      await import('leaflet/dist/leaflet.css');
      if (cancelled || !el) return;

      const bounds: any = [[0, 0], [height, width]];
      map = L.map(el, {
        crs: L.CRS.Simple,
        minZoom: -3,
        maxZoom: 1.5,
        zoomSnap: 0.25,
        attributionControl: false,
      });
      L.imageOverlay(image, bounds).addTo(map);
      map.fitBounds(bounds);
      map.setMaxBounds(bounds);

      const toLatLng = (x: number, y: number): any => [height - y, x];

      if (route && route.length > 1) {
        L.polyline(route.map(([x, y]) => toLatLng(x, y)), {
          color: '#b5651d', weight: 3, opacity: 0.85, dashArray: '8 6',
        }).addTo(map);
      }

      for (const p of places) {
        const ll = toLatLng(p.x, p.y);
        L.circleMarker(ll, {
          radius: 6, color: '#7a1f1f', weight: 2, fillColor: '#c0392b', fillOpacity: 0.9,
        }).addTo(map);
        L.tooltip({ permanent: true, direction: 'right', offset: [8, 0], className: 'map-zh-label' })
          .setLatLng(ll).setContent(p.zh).addTo(map);
      }
    })();

    return () => { cancelled = true; if (map) map.remove(); };
  }, [image, width, height, places, route]);

  return <div ref={ref} style={{ width: '100%', height: '78vh', background: '#f3eee2', borderRadius: '6px' }} />;
}
