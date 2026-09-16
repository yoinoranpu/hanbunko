import { useEffect } from "react";
import EditorCanvas from "./components/EditorCanvas";
import Toolbar from "./components/Toolbar";
import { useEditorStore } from "./store/useEditorStore";
import "./App.css";

export default function App() {
  const hydrate = useEditorStore((s) => s.hydrate);

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
        <EditorCanvas />
        <Toolbar />
      </main>

      <footer className="app-footer">
        <p>写真は端末内で処理され、サーバーには送信されません</p>
      </footer>
    </div>
  );
}
