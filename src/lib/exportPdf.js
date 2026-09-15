import { jsPDF } from "jspdf";
import { CANVAS_W, CANVAS_H, DPI } from "./constants";
import { drawScene } from "./scene";

export async function exportPdf(cells, filename = "hanbunko.pdf") {
  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  const ctx = canvas.getContext("2d");
  drawScene(ctx, cells, { withGuide: false });
  const dataUrl = canvas.toDataURL("image/jpeg", 0.95);

  const widthMm = (CANVAS_W / DPI) * 25.4; // 127mm
  const heightMm = (CANVAS_H / DPI) * 25.4; // 約89mm

  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: [widthMm, heightMm],
  });
  pdf.addImage(dataUrl, "JPEG", 0, 0, widthMm, heightMm);
  pdf.save(filename);
}
