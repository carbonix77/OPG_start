import { useEffect, useRef, useState } from "react";
import { BattlePanel } from "./battle/BattlePanel";
import { BattleScene } from "./battle/BattleScene";

export function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<BattleScene | null>(null);
  const [status, setStatus] = useState("Loading battle…");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const host = new BattleScene(canvas);
    sceneRef.current = host;
    host.prepareBattleScene();
    setReady(true);
    setStatus("Battle ready.");
    const onResize = () => host.resize();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      host.dispose();
      sceneRef.current = null;
      setReady(false);
    };
  }, []);

  return (
    <div className="app battle-mode frame-wide">
      <aside>
        <h1>Battle</h1>
        <p className="note">{status}</p>
      </aside>
      <main>
        <canvas ref={canvasRef} />
        <div className="battle-dock">
          <BattlePanel scene={ready ? sceneRef.current : null} active={ready} onStatus={setStatus} />
        </div>
      </main>
    </div>
  );
}
