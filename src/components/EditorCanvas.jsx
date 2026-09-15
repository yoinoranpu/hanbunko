import { useEffect, useRef } from "react";
import { useEditorStore } from "../store/useEditorStore";
import { CANVAS_W, CANVAS_H } from "../lib/constants";
import { drawScene } from "../lib/scene";
import { openFilePicker } from "../lib/filePicker";

const DISPLAY_SCALE = 0.4;
const DISPLAY_W = Math.round(CANVAS_W * DISPLAY_SCALE);
const DISPLAY_H = Math.round(CANVAS_H * DISPLAY_SCALE);

export default function EditorCanvas() {
  const canvasRef = useRef(null);
  const dragRef = useRef(null);
  const cells = useEditorStore((s) => s.cells);
  const setActiveCell = useEditorStore((s) => s.setActiveCell);
  const setTransform = useEditorStore((s) => s.setTransform);
  const loadImageForCell = useEditorStore((s) => s.loadImageForCell);

  useEffect(() => {
    const ctx = canvasRef.current.getContext("2d");
    ctx.save();
    ctx.scale(DISPLAY_SCALE, DISPLAY_SCALE);
    drawScene(ctx, cells, { withGuide: true });
    ctx.restore();
  }, [cells]);

  function cellIndexAt(x) {
    return x < DISPLAY_W / 2 ? 0 : 1;
  }

  function handlePointerDown(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const index = cellIndexAt(x);
    setActiveCell(index);

    if (!cells[index].image) {
      openFilePicker((file) => loadImageForCell(index, file));
      return;
    }

    canvasRef.current.setPointerCapture(e.pointerId);
    dragRef.current = {
      index,
      startX: x,
      startY: y,
      startOffsetX: cells[index].transform.offsetX,
      startOffsetY: cells[index].transform.offsetY,
    };
  }

  function handlePointerMove(e) {
    if (!dragRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const dx = (x - dragRef.current.startX) / DISPLAY_SCALE;
    const dy = (y - dragRef.current.startY) / DISPLAY_SCALE;
    setTransform(dragRef.current.index, {
      offsetX: dragRef.current.startOffsetX + dx,
      offsetY: dragRef.current.startOffsetY + dy,
    });
  }

  function handlePointerUp() {
    dragRef.current = null;
  }

  function handleWheel(e) {
    e.preventDefault();
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const index = cellIndexAt(x);
    if (!cells[index].image) return;
    const factor = e.deltaY > 0 ? 0.95 : 1.05;
    const current = cells[index].transform.scale;
    setTransform(index, { scale: Math.max(0.02, Math.min(20, current * factor)) });
  }

  return (
    <canvas
      ref={canvasRef}
      width={DISPLAY_W}
      height={DISPLAY_H}
      className="editor-canvas"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onWheel={handleWheel}
    />
  );
}
