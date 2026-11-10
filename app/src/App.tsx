import { useEffect, useRef, useState } from "react";
import { LOCAL_ASSETS } from "./inspector/assets";
import { InspectorScene, type MeshSample, type SceneFacts } from "./inspector/InspectorScene";
import type { TextureNote } from "./inspector/textures";

const EMPTY: SceneFacts = {
  assetId: "",
  meshes: 0,
  materials: 0,
  skeletons: 0,
  joints: 0,
  followNode: "",
  clips: [],
  meshRows: [],
  error: "",
};

export function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<InspectorScene | null>(null);
  const [assetId, setAssetId] = useState(LOCAL_ASSETS[0].id);
  const [facts, setFacts] = useState<SceneFacts>(EMPTY);
  const [clip, setClip] = useState("");
  const [loop, setLoop] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [scrub, setScrub] = useState(0);
  const [follow, setFollow] = useState(false);
  const [bones, setBones] = useState(false);
  const [textures, setTextures] = useState(false);
  const [recenter, setRecenter] = useState(false);
  const [sheet, setSheet] = useState("");
  const [sheetNote, setSheetNote] = useState("");
  const [preset, setPreset] = useState<"all" | "hide-static">("all");
  const [textureNotes, setTextureNotes] = useState<TextureNote[]>([]);
  const [samples, setSamples] = useState<MeshSample[]>([]);
  const [status, setStatus] = useState("Loading");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const inspector = new InspectorScene(canvas);
    sceneRef.current = inspector;
    (window as unknown as { __inspector?: InspectorScene }).__inspector = inspector;
    const onResize = () => inspector.resize();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      inspector.dispose();
      sceneRef.current = null;
    };
  }, []);

  useEffect(() => {
    const inspector = sceneRef.current;
    const asset = LOCAL_ASSETS.find((item) => item.id === assetId);
    if (!inspector || !asset) return;
    let cancel = false;
    setStatus(`Loading ${asset.label}`);
    setSamples([]);
    setTextures(false);
    setTextureNotes([]);
    setSheet("");
    setSheetNote("");
    setPreset("all");
    void inspector.load(asset).then((next) => {
      if (cancel) return;
      setFacts(next);
      setClip(next.clips[0]?.name ?? "");
      setScrub(0);
      setStatus(next.error ? next.error : `${asset.label} loaded`);
    });
    return () => {
      cancel = true;
    };
  }, [assetId]);

  const asset = LOCAL_ASSETS.find((item) => item.id === assetId);

  return (
    <div className="app">
      <aside>
        <h1>Zoro inspection</h1>
        <p className="note">Neither file is the canonical runtime model. Bind pose is not a verified idle.</p>
        <label>
          Model
          <select value={assetId} onChange={(event) => setAssetId(event.target.value)}>
            {LOCAL_ASSETS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <p className="note">{asset?.note}</p>
        <label>
          Animation
          <select value={clip} onChange={(event) => setClip(event.target.value)}>
            {facts.clips.length === 0 ? <option value="">No clips in this file</option> : null}
            {facts.clips.map((item) => (
              <option key={item.name} value={item.name}>
                {item.name} ({item.seconds.toFixed(2)} s)
              </option>
            ))}
          </select>
        </label>
        <div className="row">
          <button type="button" onClick={() => sceneRef.current?.play(clip, loop)} disabled={!clip}>
            Play
          </button>
          <button type="button" onClick={() => sceneRef.current?.pause()} disabled={!clip}>
            Pause
          </button>
          <button type="button" onClick={() => sceneRef.current?.showBindPose()}>
            Bind pose
          </button>
        </div>
        <label className="check">
          <input type="checkbox" checked={loop} onChange={(event) => setLoop(event.target.checked)} />
          Loop. Root motion replays from the start.
        </label>
        <label>
          Speed {speed.toFixed(2)}
          <input
            type="range"
            min="0.1"
            max="2"
            step="0.05"
            value={speed}
            onChange={(event) => {
              const value = Number(event.target.value);
              setSpeed(value);
              sceneRef.current?.setSpeed(value);
            }}
          />
        </label>
        <label>
          Time {scrub.toFixed(2)}
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={scrub}
            onChange={(event) => {
              const value = Number(event.target.value);
              setScrub(value);
              sceneRef.current?.scrub(clip, value);
            }}
          />
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={follow}
            onChange={(event) => {
              setFollow(event.target.checked);
              sceneRef.current?.setFollow(event.target.checked);
            }}
          />
          Camera follows the root. Motion stays in the clip.
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={recenter}
            onChange={(event) => {
              setRecenter(event.target.checked);
              sceneRef.current?.setRecenter(event.target.checked);
            }}
          />
          Preview recenter on X and Z. The clip is unchanged.
        </label>
        <label>
          Mesh 36 test sheet
          <select
            value={sheet}
            onChange={(event) => {
              const value = event.target.value;
              setSheet(value);
              setSheetNote(sceneRef.current?.setMeshSheet("Mesh_36", value) ?? "");
            }}
          >
            <option value="">Map assignment</option>
            {["cloth", "weapon", "weapon00", "weapon01", "weapon02", "weapon03", "weapon04"].map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        {sheetNote ? <p className="note">{sheetNote}</p> : null}
        <label>
          Sword view
          <select
            value={preset}
            onChange={(event) => {
              const value = event.target.value === "hide-static" ? "hide-static" : "all";
              setPreset(value);
              sceneRef.current?.setVisibilityPreset(value);
            }}
          >
            <option value="all">Show all meshes</option>
            <option value="hide-static">Hide tiny world-static meshes</option>
          </select>
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={textures}
            onChange={(event) => {
              const enabled = event.target.checked;
              setTextures(enabled);
              void sceneRef.current?.setTemporaryTextures(enabled).then((notes) => {
                if (sceneRef.current) setTextureNotes(notes);
              });
            }}
          />
          Temporary textures. Sword sheets are guessed.
        </label>
        {textureNotes.length > 0 ? (
          <p className="note">
            {textureNotes
              .filter((note) => note.sheet)
              .map((note) => `${note.material} ${note.sheet}${note.guessed ? " guessed" : ""}${note.normal ? " +n" : ""}`)
              .join(" · ")}
          </p>
        ) : null}
        <label className="check">
          <input
            type="checkbox"
            checked={bones}
            onChange={(event) => {
              setBones(event.target.checked);
              sceneRef.current?.setSkeletonVisible(event.target.checked);
            }}
          />
          Skeleton debug
        </label>
        <button
          type="button"
          disabled={!clip}
          onClick={() => setSamples(sceneRef.current?.sampleMeshTravel(clip) ?? [])}
        >
          Sample mesh travel
        </button>
        <h2>Meshes</h2>
        <p className="note">All loaded meshes start visible. A toggle here is temporary.</p>
        <ul className="meshes">
          {facts.meshRows.map((mesh) => (
            <li key={mesh.name}>
              <label>
                <input
                  type="checkbox"
                  checked={mesh.enabled}
                  onChange={(event) => {
                    const enabled = event.target.checked;
                    sceneRef.current?.setMeshEnabled(mesh.name, enabled);
                    setFacts((current) => ({
                      ...current,
                      meshRows: current.meshRows.map((row) => (row.name === mesh.name ? { ...row, enabled } : row)),
                    }));
                  }}
                />
                {mesh.name} ({mesh.vertices})
              </label>
            </li>
          ))}
        </ul>
      </aside>
      <main>
        <canvas ref={canvasRef} />
        <section className="facts">
          <p>{status}</p>
          <p>
            Meshes {facts.meshes} · materials {facts.materials} · skeletons {facts.skeletons} · joints {facts.joints} · follow{" "}
            {facts.followNode}
          </p>
          <p>{facts.clips.map((item) => `${item.name} ${item.seconds.toFixed(3)}s`).join(" · ") || "No animation groups"}</p>
          {samples.length > 0 ? (
            <table>
              <caption>
                Largest motion relative to {facts.followNode}. Offsets are at 0, 0.35, 0.65, and 1. Root travel is not included.
              </caption>
              <thead>
                <tr>
                  <th>Mesh</th>
                  <th>Travel</th>
                  <th>Offsets</th>
                </tr>
              </thead>
              <tbody>
                {samples.slice(0, 12).map((sample) => (
                  <tr key={sample.name}>
                    <td>{sample.name}</td>
                    <td>{sample.travel}</td>
                    <td>{sample.offsetAt.map((point) => `${point.t}:${point.x},${point.y},${point.z}`).join(" ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </section>
      </main>
    </div>
  );
}
