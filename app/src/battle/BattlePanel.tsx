import { useEffect, useMemo, useState } from "react";
import {
  BattleEngine,
  DUMMY_MANIFEST,
  ZORO_MANIFEST,
  skillOf,
  type BattleEvent,
  type BattleState,
} from "../combat";
import type { InspectorScene } from "../inspector/InspectorScene";
import { previewForAsset } from "../inspector/previewConfig";

const ZORO_ID = "zoro";
const DUMMY_ID = "dummy";
const SEED = 11;

function formatEvent(event: BattleEvent): string {
  switch (event.type) {
    case "battle-started":
      return `Battle seed ${event.seed}. Order ${event.order.join(", ")}.`;
    case "turn":
      return `Turn ${event.turnIndex}: ${event.actorId}`;
    case "action-started":
      return `${event.actorId} starts ${event.skillId} → ${event.targetId}`;
    case "contact":
      return `Contact ${event.damage} dmg. ${event.targetId} HP ${event.targetHp}`;
    case "action-finished":
      return `${event.actorId} finished ${event.skillId}`;
    case "blocked":
      return `Blocked: ${event.reason}`;
    case "unit-defeated":
      return `${event.unitId} defeated`;
    case "battle-ended":
      return `Winner ${event.winner}`;
  }
}

export function BattlePanel(props: {
  scene: InspectorScene | null;
  ready: boolean;
  onStatus: (text: string) => void;
}) {
  const engine = useMemo(
    () =>
      new BattleEngine(SEED, [
        { id: ZORO_ID, manifestId: ZORO_MANIFEST.id, team: "alpha", speed: 20 },
        { id: DUMMY_ID, manifestId: DUMMY_MANIFEST.id, team: "bravo", speed: 1 },
      ]),
    [],
  );
  const [state, setState] = useState<BattleState>(() => engine.getState());
  const [busy, setBusy] = useState(false);
  const [skillId, setSkillId] = useState("basic");
  const [log, setLog] = useState<string[]>([]);

  useEffect(() => {
    if (!props.ready || !props.scene) return;
    props.scene.setBattleDummy(true);
    props.scene.setRecenter(true);
    props.scene.setBodyFrame(true);
    props.scene.setTemporaryTextures(true, previewForAsset("noesis-roster")).catch(() => undefined);
    const preview = previewForAsset("noesis-roster");
    if (preview) props.scene.playProvisionalIdle(preview);
    return () => {
      props.scene?.clearBattleDummy();
      props.scene?.setBodyFrame(false);
    };
  }, [props.ready, props.scene]);

  const refresh = (events: BattleEvent[] = []) => {
    setState(engine.getState());
    if (events.length) setLog((prev) => [...events.map(formatEvent), ...prev].slice(0, 24));
  };

  const actorIsZoro = state.phase !== "ended" && engine.currentActorId() === ZORO_ID;
  const skill = skillOf(ZORO_MANIFEST, skillId);
  const canBasic =
    props.ready && !busy && actorIsZoro && skill !== null && engine.canAct(ZORO_ID, skillId, DUMMY_ID).ok;

  const runSkill = (id: string) => {
    if (!props.scene || busy) return;
    const chosen = skillOf(ZORO_MANIFEST, id);
    if (!chosen) return;
    const check = engine.canAct(ZORO_ID, id, DUMMY_ID);
    if (!check.ok) {
      refresh([{ type: "blocked", reason: check.reason ?? "Blocked." }]);
      return;
    }
    setBusy(true);
    const started = engine.beginAction(ZORO_ID, id, DUMMY_ID);
    refresh(started);
    const preview = previewForAsset("noesis-roster");
    const note = props.scene.playBattleSkill(
      preview,
      chosen.clipId,
      chosen.contact,
      () => {
        const contact = engine.applyContact();
        props.scene?.flashBattleDummy();
        refresh(contact);
      },
      () => {
        const finished = engine.finishAction();
        refresh(finished);
        // Auto-resolve the dummy turn so Zoro can act again without a second UI.
        const after = engine.getState();
        if (after.phase === "idle" && engine.currentActorId() === DUMMY_ID) {
          const auto = engine.resolveFully(DUMMY_ID, "dummy-poke", ZORO_ID);
          refresh(auto);
          if (preview) props.scene?.playProvisionalIdle(preview);
        }
        setBusy(false);
        props.onStatus(`Skill ${id} resolved.`);
      },
    );
    props.onStatus(note);
  };

  const reset = () => {
    engine.reset(SEED);
    setBusy(false);
    setLog([]);
    refresh();
    const preview = previewForAsset("noesis-roster");
    if (preview) props.scene?.playProvisionalIdle(preview);
    props.scene?.setBattleDummy(true);
    props.onStatus("Battle reset.");
  };

  const zoro = state.units.find((unit) => unit.id === ZORO_ID);
  const dummy = state.units.find((unit) => unit.id === DUMMY_ID);

  return (
    <div className="battle-panel">
      <h1>Battle preview</h1>
      <p className="note">
        One Zoro versus one synthetic dummy. Damage lands once at the skill contact marker. Not a finished 5v5.
      </p>
      <div className="battle-hp">
        <p>
          {zoro?.label ?? "Zoro"} HP {zoro?.hp ?? 0}/{zoro?.maxHp ?? 0}
        </p>
        <p>
          {dummy?.label ?? "Dummy"} HP {dummy?.hp ?? 0}/{dummy?.maxHp ?? 0} {dummy?.alive ? "" : "(down)"}
        </p>
        <p className="note">
          Phase {state.phase}. Actor {engine.currentActorId() ?? "—"}. Seed {state.seed}.
          {state.winner ? ` Winner ${state.winner}.` : ""}
        </p>
      </div>
      <label>
        Skill
        <select value={skillId} onChange={(event) => setSkillId(event.target.value)} disabled={busy}>
          {ZORO_MANIFEST.skills.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label} ({item.confidence})
            </option>
          ))}
        </select>
      </label>
      <div className="row">
        <button type="button" disabled={!canBasic || skillId !== "basic"} onClick={() => runSkill("basic")}>
          Basic Attack
        </button>
        <button type="button" disabled={!canBasic} onClick={() => runSkill(skillId)}>
          Use selected skill
        </button>
        <button type="button" onClick={reset}>
          Reset
        </button>
      </div>
      {!props.ready ? <p className="note">Loading roster…</p> : null}
      {busy ? <p className="note">Action in progress.</p> : null}
      <h2>Event log</h2>
      <ul className="battle-log">
        {log.map((line, index) => (
          <li key={`${index}-${line}`}>{line}</li>
        ))}
      </ul>
    </div>
  );
}
