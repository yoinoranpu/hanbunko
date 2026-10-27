import { useState } from "react";
import { useEditorStore } from "../store/useEditorStore";
import { openFilePicker } from "../lib/filePicker";
import { exportJpeg } from "../lib/exportImage";
import { exportPdf } from "../lib/exportPdf";
import { PhotoIcon, DocumentIcon, CalendarIcon } from "./icons";

const FRAME_OPTIONS = [
  { value: "none", label: "なし" },
  { value: "white", label: "白フチ" },
  { value: "cheki", label: "チェキ風" },
];

const TEXT_POSITION_OPTIONS = [
  { value: "overlay-bottom", label: "写真に重ねる" },
  { value: "margin-bottom", label: "下の余白" },
  { value: "corner-tr", label: "右上" },
  { value: "corner-br", label: "右下" },
];

function todayString() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}.${m}.${day}`;
}

export default function Toolbar() {
  const cells = useEditorStore((s) => s.cells);
  const activeCell = useEditorStore((s) => s.activeCell);
  const setTransform = useEditorStore((s) => s.setTransform);
  const rotateCell = useEditorStore((s) => s.rotateCell);
  const setFrame = useEditorStore((s) => s.setFrame);
  const applyFrameToBoth = useEditorStore((s) => s.applyFrameToBoth);
  const loadImageForCell = useEditorStore((s) => s.loadImageForCell);
  const setText = useEditorStore((s) => s.setText);

  const clearCell = useEditorStore((s) => s.clearCell);
  const stored = useEditorStore((s) => s.storedCells[activeCell]);
  const deleting = useEditorStore((s) => s.deleting[activeCell]);
  const hydrated = useEditorStore((s) => s.hydrated);
  const setError = useEditorStore((s) => s.setError);
  const [exporting, setExporting] = useState(false);
  const cell = cells[activeCell];

  async function save(exporter) {
    if (exporting) return;
    setExporting(true);
    setError("");
    try { await exporter(cells); }
    catch { setError("書き出しに失敗しました。写真のサイズを小さくするか、別の保存形式を試してください。"); }
    finally { setExporting(false); }
  }

  function zoom(factor) {
    if (!cell.image) return;
    setTransform(activeCell, { scale: Math.max(0.02, Math.min(20, cell.transform.scale * factor)) });
  }

  function insertDate() {
    const date = todayString();
    const current = cell.text.content;
    setText(activeCell, { content: current ? `${current} ${date}` : date });
  }

  return (
    <div className="toolbar">
      <div className="toolbar-row">
        <span className="side-badge">{activeCell === 0 ? "L" : "R"}</span>
        <button disabled={!hydrated || deleting} onClick={() => openFilePicker((file) => loadImageForCell(activeCell, file))}>
          <PhotoIcon />
          {cell.image ? "変更" : "選択"}
        </button>
        <button className="icon-only" aria-label="拡大" onClick={() => zoom(1.1)} disabled={!cell.image || deleting}>
          ＋
        </button>
        <button className="icon-only" aria-label="縮小" onClick={() => zoom(0.9)} disabled={!cell.image || deleting}>
          －
        </button>
        <button className="icon-only" aria-label="回転" onClick={() => rotateCell(activeCell)} disabled={!cell.image || deleting}>
          ⟳
        </button>
        <button disabled={(!cell.image && !stored) || deleting} onClick={() => {
          if (window.confirm("選択中の写真と編集内容を、このブラウザの保存領域から削除しますか？")) clearCell(activeCell);
        }}>{deleting ? "削除中…" : "削除"}</button>
      </div>

      <div className="toolbar-row">
        {FRAME_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            className={cell.frame.type === opt.value ? "active" : ""}
            onClick={() => setFrame(activeCell, { type: opt.value })}
          >
            {opt.label}
          </button>
        ))}
        <button className="ghost icon-only" aria-label="両方に適用" title="両方に適用" onClick={() => applyFrameToBoth(activeCell)}>
          ⇄
        </button>
      </div>

      {cell.frame.type !== "none" && (
        <label className="range-label">
          太さ
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={cell.frame.thickness}
            onChange={(e) => setFrame(activeCell, { thickness: Number(e.target.value) })}
          />
        </label>
      )}

      <div className="toolbar-row">
        {TEXT_POSITION_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            className={cell.text.position === opt.value ? "active" : ""}
            onClick={() => setText(activeCell, { position: opt.value })}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="toolbar-row">
        <input
          type="text"
          value={cell.text.content}
          onChange={(e) => setText(activeCell, { content: e.target.value })}
          placeholder="キャプション(任意)"
          maxLength={40}
        />
        <button className="icon-only" aria-label="今日の日付を挿入" title="今日の日付を挿入" onClick={insertDate}>
          <CalendarIcon />
        </button>
      </div>

      {cell.text.content && (
        <label className="range-label">
          文字サイズ
          <input
            type="range"
            min="0.6"
            max="1.8"
            step="0.05"
            value={cell.text.fontScale ?? 1}
            onChange={(e) => setText(activeCell, { fontScale: Number(e.target.value) })}
          />
        </label>
      )}

      <details className="print-help">
        <summary>保存・印刷のヒント</summary>
        <p>PDFはL判・横向き・倍率100％（実際のサイズ）で印刷してください。JPEGは印刷サービス側でL判を選び、切り抜き範囲を確認してください。まず1枚試し刷りするのがおすすめです。</p>
        <p>写真はこのブラウザに自動保存されます。共有端末では使い終わったら左右それぞれの写真を削除してください。</p>
      </details>
      <div className="toolbar-row export-row">
        <button className="primary" disabled={!hydrated || exporting || !cells.some((c) => c.image)} onClick={() => save(exportPdf)}>
          <DocumentIcon />
          PDFを保存
        </button>
        <button disabled={!hydrated || exporting || !cells.some((c) => c.image)} onClick={() => save(exportJpeg)}>
          <PhotoIcon />
          JPEGを保存
        </button>
      </div>
    </div>
  );
}
