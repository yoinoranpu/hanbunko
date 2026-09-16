import { useEffect, useRef } from "react";
import { useEditorStore } from "../store/useEditorStore";
import { CANVAS_W, CANVAS_H } from "../lib/constants";
import { drawScene } from "../lib/scene";
import { openFilePicker } from "../lib/filePicker";

// canvasの内部解像度(描画の鮮明さ用)。表示サイズはCSS側(aspect-ratio+max-width/height)で
// レイアウトに応じて自由に伸縮するため、ここは固定値でよい。
const BACKING_SCALE = 0.5;
const BACKING_W = Math.round(CANVAS_W * BACKING_SCALE);
const BACKING_H = Math.round(CANVAS_H * BACKING_SCALE);

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function midpoint(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export default function EditorCanvas() {
  const canvasRef = useRef(null);
  const dragRef = useRef(null);
  const pointersRef = useRef(new Map());
  const pinchRef = useRef(null);
  const cells = useEditorStore((s) => s.cells);
  const setActiveCell = useEditorStore((s) => s.setActiveCell);
  const setTransform = useEditorStore((s) => s.setTransform);
  const loadImageForCell = useEditorStore((s) => s.loadImageForCell);

  useEffect(() => {
    const ctx = canvasRef.current.getContext("2d");
    ctx.save();
    ctx.scale(BACKING_SCALE, BACKING_SCALE);
    drawScene(ctx, cells, { withGuide: true });
    ctx.restore();
  }, [cells]);

  function pointFromEvent(e, rect) {
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function cellIndexAt(x, rect) {
    return x < rect.width / 2 ? 0 : 1;
  }

  function handlePointerDown(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    const { x, y } = pointFromEvent(e, rect);
    const index = cellIndexAt(x, rect);

    if (pointersRef.current.size === 0) {
      setActiveCell(index);
      if (!cells[index].image) {
        openFilePicker((file) => loadImageForCell(index, file));
        return;
      }
    } else if (!cells[index].image) {
      return;
    }

    canvasRef.current.setPointerCapture(e.pointerId);
    pointersRef.current.set(e.pointerId, { x, y, index });

    if (pointersRef.current.size === 1) {
      pinchRef.current = null;
      dragRef.current = {
        index,
        startX: x,
        startY: y,
        startOffsetX: cells[index].transform.offsetX,
        startOffsetY: cells[index].transform.offsetY,
      };
    } else if (pointersRef.current.size === 2) {
      dragRef.current = null;
      const pts = [...pointersRef.current.values()];
      pinchRef.current = {
        index: pts[0].index,
        dist0: distance(pts[0], pts[1]),
        mid0: midpoint(pts[0], pts[1]),
        scale0: cells[pts[0].index].transform.scale,
        offset0X: cells[pts[0].index].transform.offsetX,
        offset0Y: cells[pts[0].index].transform.offsetY,
      };
    }
  }

  function handlePointerMove(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    const { x, y } = pointFromEvent(e, rect);
    // 表示サイズ(rect)がレイアウトで伸縮しても正しく変換できるよう、
    // world座標(=CANVAS_W×CANVAS_H基準)への換算は毎回rectから動的に算出する
    const worldPerPx = CANVAS_W / rect.width;

    if (pointersRef.current.has(e.pointerId)) {
      const p = pointersRef.current.get(e.pointerId);
      pointersRef.current.set(e.pointerId, { ...p, x, y });
    }

    if (pinchRef.current && pointersRef.current.size >= 2) {
      const pts = [...pointersRef.current.values()];
      const dist = distance(pts[0], pts[1]);
      const mid = midpoint(pts[0], pts[1]);
      const factor = dist / pinchRef.current.dist0;
      const dx = (mid.x - pinchRef.current.mid0.x) * worldPerPx;
      const dy = (mid.y - pinchRef.current.mid0.y) * worldPerPx;
      setTransform(pinchRef.current.index, {
        scale: Math.max(0.02, Math.min(20, pinchRef.current.scale0 * factor)),
        offsetX: pinchRef.current.offset0X + dx,
        offsetY: pinchRef.current.offset0Y + dy,
      });
      return;
    }

    if (!dragRef.current) return;
    const dx = (x - dragRef.current.startX) * worldPerPx;
    const dy = (y - dragRef.current.startY) * worldPerPx;
    setTransform(dragRef.current.index, {
      offsetX: dragRef.current.startOffsetX + dx,
      offsetY: dragRef.current.startOffsetY + dy,
    });
  }

  function handlePointerUp(e) {
    pointersRef.current.delete(e.pointerId);
    dragRef.current = null;
    pinchRef.current = null;
  }

  function handleWheel(e) {
    e.preventDefault();
    const rect = canvasRef.current.getBoundingClientRect();
    const { x } = pointFromEvent(e, rect);
    const index = cellIndexAt(x, rect);
    if (!cells[index].image) return;
    const factor = e.deltaY > 0 ? 0.95 : 1.05;
    const current = cells[index].transform.scale;
    setTransform(index, { scale: Math.max(0.02, Math.min(20, current * factor)) });
  }

  return (
    <div className="canvas-wrap">
      <canvas
        ref={canvasRef}
        width={BACKING_W}
        height={BACKING_H}
        className="editor-canvas"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
      />
    </div>
  );
}
