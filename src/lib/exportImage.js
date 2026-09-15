import { CANVAS_W, CANVAS_H, DPI } from "./constants";
import { drawScene } from "./scene";

function embedJpegDpi(arrayBuffer, dpi) {
  const bytes = new Uint8Array(arrayBuffer);
  // canvas.toBlob("image/jpeg")が出力するJPEGはSOI(FFD8)直後にJFIF(APP0)を持つのが一般的
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff || bytes[3] !== 0xe0) {
    return bytes;
  }
  const isJfif =
    bytes[6] === 0x4a && bytes[7] === 0x46 && bytes[8] === 0x49 && bytes[9] === 0x46 && bytes[10] === 0x00;
  if (!isJfif) return bytes;

  bytes[13] = 1; // units = 1 (dots per inch)
  bytes[14] = (dpi >> 8) & 0xff;
  bytes[15] = dpi & 0xff;
  bytes[16] = (dpi >> 8) & 0xff;
  bytes[17] = dpi & 0xff;
  return bytes;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function exportJpeg(cells, filename = "hanbunko.jpg") {
  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  const ctx = canvas.getContext("2d");
  drawScene(ctx, cells, { withGuide: false });

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.95));
  const patched = embedJpegDpi(await blob.arrayBuffer(), DPI);
  downloadBlob(new Blob([patched], { type: "image/jpeg" }), filename);
}
