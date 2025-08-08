
import React, { useRef, useEffect } from 'react';
import { Difference } from '../types';
import { PDFPageProxy } from 'pdfjs-dist/types/src/display/api';

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

interface Props {
  page: PDFPageProxy;
  scale: number;
  highlights: Difference[];
  highlightColor: string;
  activeDiffIndex: number | null;
  pageIndex: number;
  fileId: string;
  activeDiffId?: string; // 新增：当前激活的差异ID
}

const PdfPage: React.FC<Props> = ({ page, scale, highlights, highlightColor, activeDiffIndex, pageIndex, fileId, activeDiffId }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const devicePixelRatio = window.devicePixelRatio || 1;
    const viewport = page.getViewport({ scale: scale * devicePixelRatio });
    const context = canvas.getContext('2d')!;

    canvas.height = viewport.height;
    canvas.width = viewport.width;
    canvas.style.width = `${viewport.width / devicePixelRatio}px`;
    canvas.style.height = `${viewport.height / devicePixelRatio}px`;

    const renderTask = page.render({ canvas, canvasContext: context, viewport });

    renderTask.promise.catch(err => {
      if (err.name !== 'RenderingCancelledException') {
        console.error('Render failed', err);
      }
    });

    return () => {
      renderTask.cancel();
    };
  }, [page, scale]);

  const getHighlightStyle = (bbox: number[], isActive: boolean, diffId: string): React.CSSProperties => {
    const viewport = page.getViewport({ scale });
    const [x0, y0, x1, y1] = bbox;
    const isCurrentlyActive = activeDiffId === diffId;
    
    return {
      position: 'absolute',
      left: `${x0 * (viewport.width / page.view[2])}px`,
      top: `${y0 * (viewport.height / page.view[3])}px`,
      width: `${(x1 - x0) * (viewport.width / page.view[2])}px`,
      height: `${(y1 - y0) * (viewport.height / page.view[3])}px`,
      backgroundColor: hexToRgba(highlightColor, isActive ? 0.6 : 0.3),
      border: isCurrentlyActive ? '4px solid #ff0000' : `3px solid ${isActive ? '#ff0000' : highlightColor}`,
      transition: 'all 0.3s ease-in-out',
      mixBlendMode: 'multiply',
      boxShadow: isCurrentlyActive ? '0 0 15px rgba(255, 0, 0, 0.8), 0 0 30px rgba(255, 0, 0, 0.4)' : 'none',
      animation: isCurrentlyActive ? 'pulse 1.5s ease-in-out infinite' : 'none',
      zIndex: isCurrentlyActive ? 10 : 1,
    };
  };

  return (
    <div id={`${fileId}-page-${page.pageNumber}`} className="page-container" style={{ position: 'relative' }}>
      <canvas ref={canvasRef} />
      <div className="highlight-layer" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }}>
        {highlights.map((h, i) => {
          if (h.page_index !== pageIndex) return null;
          const bbox = h.bbox_a || h.bbox_b;
          if (!bbox) return null;

          const diffId = `${fileId}-${pageIndex}-${i}`;
          return (
            <div
              key={i}
              style={getHighlightStyle(bbox, activeDiffIndex === i, diffId)}
            />
          );
        })}
      </div>
    </div>
  );
};

export default PdfPage;
