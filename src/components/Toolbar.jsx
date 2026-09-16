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

  const cell = cells[activeCell];

  function zoom(factor) {
    if (!cell.image) return;
    setTransform(activeCell, { scale: Math.max(0.02, Math.min(20, cell.transform.scale * factor)) });
  }

  function insertDate() {
    const date = todayString();
    const current = cell.text.content;
    setText(activeCell, current ? `${current} ${date}` : date);
  }

  return (
    <div className="toolbar">
      <div className="toolbar-row">
        <span className="side-badge">{activeCell === 0 ? "L" : "R"}</span>
        <button onClick={() => openFilePicker((file) => loadImageForCell(activeCell, file))}>
          <PhotoIcon />
          {cell.image ? "変更" : "選択"}
        </button>
        <button className="icon-only" aria-label="拡大" onClick={() => zoom(1.1)} disabled={!cell.image}>
          ＋
        </button>
        <button className="icon-only" aria-label="縮小" onClick={() => zoom(0.9)} disabled={!cell.image}>
          －
        </button>
        <button className="icon-only" aria-label="回転" onClick={() => rotateCell(activeCell)} disabled={!cell.image}>
          ⟳
        </button>
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
        <input
          type="text"
          value={cell.text.content}
          onChange={(e) => setText(activeCell, e.target.value)}
          placeholder="キャプション(任意)"
          maxLength={40}
        />
        <button className="icon-only" aria-label="今日の日付を挿入" title="今日の日付を挿入" onClick={insertDate}>
          <CalendarIcon />
        </button>
      </div>

      <div className="toolbar-row export-row">
        <button className="primary" onClick={() => exportPdf(cells)}>
          <DocumentIcon />
          PDFを保存
        </button>
        <button onClick={() => exportJpeg(cells)}>
          <PhotoIcon />
          JPEGを保存
        </button>
      </div>
    </div>
  );
}
