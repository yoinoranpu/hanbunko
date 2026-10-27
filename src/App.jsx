import { useEffect } from "react";
import EditorCanvas from "./components/EditorCanvas";
import Toolbar from "./components/Toolbar";
import { useEditorStore } from "./store/useEditorStore";
import "./App.css";

export default function App() {
  const hydrate = useEditorStore((s) => s.hydrate);

  const error = useEditorStore((s) => s.error);
  const saveStates = useEditorStore((s) => s.saveStates);
  const hydrated = useEditorStore((s) => s.hydrated);
  const retrySave = useEditorStore((s) => s.retrySave);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <div className="app">
      <header className="app-header">
        <span className="app-logo-mark" aria-hidden="true">
          <i />
          <i />
        </span>
        <div>
          <h1>半分こ</h1>
          <p className="app-sub">L判1枚から手のひらサイズの写真を2枚</p>
        </div>
      </header>

      <ol className="steps">
        <li>
          <span className="steps-num">1</span>写真を選ぶ
        </li>
        <li>
          <span className="steps-num">2</span>配置を調整
        </li>
        <li>
          <span className="steps-num">3</span>保存して印刷
        </li>
      </ol>

      <main className="app-main">
        {error && <p className="app-notice" role="alert">{error}</p>}
        {saveStates.includes("error") && <p className="app-notice" role="alert">
          自動保存に失敗しました。写真を再読み込みすると編集内容が失われる可能性があります。JPEG・PDFを保存するか、
          <button onClick={retrySave}>自動保存を再試行</button>してください。
        </p>}
        {!hydrated && <p role="status">前回の写真を読み込み中…</p>}
        <EditorCanvas />
        <Toolbar />
      </main>

      <footer className="app-footer">
        <p role="status">{saveStates.includes("pending") ? "端末に自動保存中…" : saveStates.includes("error") ? "自動保存に失敗しました" : saveStates.includes("saved") ? "端末に自動保存しました" : "写真は端末内で処理され、サーバーには送信されません"}</p>
      </footer>
    </div>
  );
}
