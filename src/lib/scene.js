import { CELL_W, CELL_H } from "./constants";

export function getEffectiveSize(image, rotation) {
  const w = image.width ?? image.naturalWidth;
  const h = image.height ?? image.naturalHeight;
  const swapped = rotation % 180 !== 0;
  return swapped ? { w: h, h: w } : { w, h };
}

function getBorderMetrics(frame) {
  if (!frame || frame.type === "none") {
    return { top: 0, left: 0, right: 0, bottom: 0 };
  }
  const t = frame.thickness ?? 0.5;
  const base = CELL_W * (0.02 + t * 0.06);
  if (frame.type === "cheki") {
    return { top: base, left: base, right: base, bottom: base * 3.2 };
  }
  return { top: base, left: base, right: base, bottom: base };
}

export function getInnerRect(frame, cellX = 0) {
  const b = getBorderMetrics(frame);
  return {
    x: cellX + b.left,
    y: b.top,
    w: CELL_W - b.left - b.right,
    h: CELL_H - b.top - b.bottom,
  };
}

export function coverFitScale(effSize, innerRect) {
  return Math.max(innerRect.w / effSize.w, innerRect.h / effSize.h);
}

function drawCell(ctx, cellIndex, cell) {
  const cellX = cellIndex * CELL_W;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(cellX, 0, CELL_W, CELL_H);

  if (!cell.image) {
    ctx.fillStyle = "#c9c9d6";
    ctx.font = "28px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("写真を選択", cellX + CELL_W / 2, CELL_H / 2);
    return;
  }

  const inner = getInnerRect(cell.frame, cellX);
  const { scale, offsetX, offsetY, rotation } = cell.transform;
  const w = cell.image.width ?? cell.image.naturalWidth;
  const h = cell.image.height ?? cell.image.naturalHeight;

  ctx.save();
  ctx.beginPath();
  ctx.rect(inner.x, inner.y, inner.w, inner.h);
  ctx.clip();

  const cx = inner.x + inner.w / 2 + offsetX;
  const cy = inner.y + inner.h / 2 + offsetY;
  ctx.translate(cx, cy);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.drawImage(cell.image, (-w * scale) / 2, (-h * scale) / 2, w * scale, h * scale);
  ctx.restore();
}

function drawGuide(ctx) {
  const w = CELL_W * 2;
  const h = CELL_H;

  ctx.save();

  // 中央カットライン
  ctx.setLineDash([10, 8]);
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(CELL_W, 0);
  ctx.lineTo(CELL_W, h);
  ctx.stroke();

  // カットのブレを見込んだ安全マージン(目安、片側約3mm)
  const margin = 35;
  ctx.strokeStyle = "rgba(255,90,90,0.55)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(CELL_W - margin, 0);
  ctx.lineTo(CELL_W - margin, h);
  ctx.moveTo(CELL_W + margin, 0);
  ctx.lineTo(CELL_W + margin, h);
  ctx.stroke();

  // 用紙外周の安全マージン(目安、約2mm)
  const outerInset = 24;
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.strokeRect(outerInset, outerInset, w - outerInset * 2, h - outerInset * 2);

  ctx.restore();
}

export function drawScene(ctx, cells, { withGuide = false } = {}) {
  ctx.clearRect(0, 0, CELL_W * 2, CELL_H);
  drawCell(ctx, 0, cells[0]);
  drawCell(ctx, 1, cells[1]);
  if (withGuide) drawGuide(ctx);
}
