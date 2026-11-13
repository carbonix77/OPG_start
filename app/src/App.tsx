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
    host.resize();
    requestAnimationFrame(() => host.resize());
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
    <div className="app battle-mode">
      <main className="battle-stage">
        <canvas ref={canvasRef} />
        <div className="battle-overlay">
          <div className="battle-status">
            <strong>Battle</strong>
            <span className="note">{status}</span>
          </div>
          <div className="battle-dock">
            <BattlePanel scene={ready ? sceneRef.current : null} active={ready} onStatus={setStatus} />
          </div>
        </div>
      </main>
    </div>
  );
}
