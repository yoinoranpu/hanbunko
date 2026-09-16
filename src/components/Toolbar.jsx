import { useEditorStore } from "../store/useEditorStore";
import { openFilePicker } from "../lib/filePicker";
import { exportJpeg } from "../lib/exportImage";
import { exportPdf } from "../lib/exportPdf";
import { PhotoIcon, DocumentIcon } from "./icons";

const FRAME_OPTIONS = [
  { value: "none", label: "フレームなし" },
  { value: "white", label: "白フチ" },
  { value: "cheki", label: "チェキ風" },
];

export default function Toolbar() {
  const cells = useEditorStore((s) => s.cells);
  const activeCell = useEditorStore((s) => s.activeCell);
  const setTransform = useEditorStore((s) => s.setTransform);
  const rotateCell = useEditorStore((s) => s.rotateCell);
  const setFrame = useEditorStore((s) => s.setFrame);
  const applyFrameToBoth = useEditorStore((s) => s.applyFrameToBoth);
  const loadImageForCell = useEditorStore((s) => s.loadImageForCell);

  const cell = cells[activeCell];

  function zoom(factor) {
    if (!cell.image) return;
    setTransform(activeCell, { scale: Math.max(0.02, Math.min(20, cell.transform.scale * factor)) });
  }

  return (
    <div className="toolbar">
      <div className="toolbar-section">
        <span className="toolbar-section-title">写真</span>
        <div className="toolbar-row">
          <span className="selected-badge">選択中: {activeCell === 0 ? "左" : "右"}の写真</span>
          <button onClick={() => openFilePicker((file) => loadImageForCell(activeCell, file))}>
            <PhotoIcon />
            画像を{cell.image ? "変更" : "選択"}
          </button>
        </div>
      </div>

      <div className="toolbar-section">
        <span className="toolbar-section-title">配置</span>
        <div className="toolbar-row">
          <button onClick={() => zoom(1.1)} disabled={!cell.image}>
            ＋ 拡大
          </button>
          <button onClick={() => zoom(0.9)} disabled={!cell.image}>
            － 縮小
          </button>
          <button onClick={() => rotateCell(activeCell)} disabled={!cell.image}>
            ⟳ 回転
          </button>
        </div>
      </div>

      <div className="toolbar-section">
        <span className="toolbar-section-title">フレーム</span>
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
          <button className="ghost" onClick={() => applyFrameToBoth(activeCell)}>
            このフレームを両方に適用
          </button>
        </div>
      </div>

      <div className="toolbar-section">
        <span className="toolbar-section-title">書き出し</span>
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
    </div>
  );
}
