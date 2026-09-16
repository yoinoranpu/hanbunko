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

function captionHeight(baseH) {
  return Math.max(34, baseH * 0.09);
}

function drawPlaceholder(ctx, cellX) {
  const pad = CELL_W * 0.08;
  const cx = cellX + CELL_W / 2;
  const cy = CELL_H / 2;

  ctx.save();
  ctx.strokeStyle = "#e6ddd0";
  ctx.lineWidth = 3;
  ctx.setLineDash([16, 12]);
  ctx.beginPath();
  ctx.roundRect(cellX + pad, pad, CELL_W - pad * 2, CELL_H - pad * 2, 28);
  ctx.stroke();

  ctx.setLineDash([]);
  ctx.strokeStyle = "#c7bcac";
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  const r = 20;
  const plusY = cy - 20;
  ctx.beginPath();
  ctx.moveTo(cx - r, plusY);
  ctx.lineTo(cx + r, plusY);
  ctx.moveTo(cx, plusY - r);
  ctx.lineTo(cx, plusY + r);
  ctx.stroke();

  ctx.fillStyle = "#9c9284";
  ctx.font = "600 30px 'M PLUS Rounded 1c', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("写真を選ぶ", cx, cy + 40);
  ctx.restore();
}

function drawCell(ctx, cellIndex, cell) {
  const cellX = cellIndex * CELL_W;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(cellX, 0, CELL_W, CELL_H);

  if (!cell.image) {
    drawPlaceholder(ctx, cellX);
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

// 写真の領域(frameRect)は一切変えず、フレームの下側に既にある余白の中にだけ文字を書く。
// フレームが「なし」など余白がほぼ無い場合は、写真とかぶらないよう何も描かない。
function drawCaptionMargin(ctx, frameRect, text) {
  const spaceY = frameRect.y + frameRect.h;
  const spaceH = CELL_H - spaceY;
  if (spaceH < 16) return;

  ctx.save();
  ctx.fillStyle = "#4a4438";
  ctx.font = `600 ${Math.round(spaceH * 0.42)}px 'M PLUS Rounded 1c', sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, frameRect.x + frameRect.w / 2, spaceY + spaceH / 2, frameRect.w - 16);
  ctx.restore();
}

function drawCaptionCorner(ctx, frameRect, text, corner) {
  const pad = 18;
  const fontSize = Math.round(CELL_W * 0.045);

  ctx.save();
  ctx.beginPath();
  ctx.rect(frameRect.x, frameRect.y, frameRect.w, frameRect.h);
  ctx.clip();

  ctx.font = `700 ${fontSize}px 'M PLUS Rounded 1c', sans-serif`;
  ctx.textAlign = "right";
  ctx.textBaseline = corner === "br" ? "bottom" : "top";
  const x = frameRect.x + frameRect.w - pad;
  const y = corner === "br" ? frameRect.y + frameRect.h - pad : frameRect.y + pad;

  ctx.shadowColor = "rgba(0,0,0,0.6)";
  ctx.shadowBlur = 8;
  ctx.fillStyle = "#ffffff";
  ctx.fillText(text, x, y, frameRect.w - pad * 2);
  ctx.restore();
}

function drawCaptionOverlay(ctx, frameRect, text) {
  const barH = captionHeight(frameRect.h);
  const barY = frameRect.y + frameRect.h - barH;

  ctx.save();
  ctx.beginPath();
  ctx.rect(frameRect.x, frameRect.y, frameRect.w, frameRect.h);
  ctx.clip();

  ctx.fillStyle = "rgba(20,16,12,0.45)";
  ctx.fillRect(frameRect.x, barY, frameRect.w, barH);

  ctx.fillStyle = "#ffffff";
  ctx.font = `600 ${Math.round(barH * 0.5)}px 'M PLUS Rounded 1c', sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, frameRect.x + frameRect.w / 2, barY + barH / 2, frameRect.w - 24);
  ctx.restore();
}

function drawCaption(ctx, cellIndex, cell) {
  const text = cell.text?.content?.trim();
  if (!text) return;

  const cellX = cellIndex * CELL_W;
  const frameRect = getInnerRect(cell.frame, cellX);
  const position = cell.text.position || "overlay-bottom";

  if (position === "margin-bottom") {
    drawCaptionMargin(ctx, frameRect, text);
  } else if (position === "corner-tr") {
    drawCaptionCorner(ctx, frameRect, text, "tr");
  } else if (position === "corner-br") {
    drawCaptionCorner(ctx, frameRect, text, "br");
  } else {
    drawCaptionOverlay(ctx, frameRect, text);
  }
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
  ctx.strokeStyle = "rgba(226,102,92,0.6)";
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
  drawCaption(ctx, 0, cells[0]);
  drawCaption(ctx, 1, cells[1]);
  if (withGuide) drawGuide(ctx);
}
