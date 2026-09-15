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
        <h1>半分こ</h1>
        <p className="app-sub">L判1枚から、手のひらサイズの写真を2枚。</p>
      </header>
      <main className="app-main">
        <EditorCanvas />
        <Toolbar />
      </main>
    </div>
  );
}
