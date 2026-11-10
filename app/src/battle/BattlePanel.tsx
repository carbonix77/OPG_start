import { useEffect, useMemo, useRef, useState } from "react";
import {
  BattleEngine,
  DUMMY_MANIFEST,
  ZORO_MANIFEST,
  manifestOf,
  skillOf,
  type BattleEvent,
  type BattleState,
} from "../combat";
import type { InspectorScene } from "../inspector/InspectorScene";
import { previewForAsset } from "../inspector/previewConfig";
import { BattleArena, TWO_V_TWO_SLOTS } from "./arena";
import { UnitViewRegistry, type UnitViewSpec } from "./unitRegistry";

const SEED = 21;
const ZORO_ID = "zoro";
const ALLY_ID = "ally";
const ENEMY_A = "enemy-a";
const ENEMY_B = "enemy-b";

function formatEvent(event: BattleEvent): string {
  switch (event.type) {
    case "battle-started":
      return `Battle seed ${event.seed}. Order ${event.order.join(", ")}.`;
    case "turn":
      return `Turn ${event.turnIndex}: ${event.actorId}`;
    case "action-started":
      return `#${event.actionId} ${event.actorId} starts ${event.skillId} → ${event.targetId}`;
    case "contact":
      return `#${event.actionId} contact ${event.damage} dmg. ${event.targetId} HP ${event.targetHp}`;
    case "action-finished":
      return `#${event.actionId} ${event.actorId} finished ${event.skillId}`;
    case "action-aborted":
      return `#${event.actionId} aborted: ${event.reason}`;
    case "blocked":
      return `Blocked: ${event.reason}`;
    case "unit-defeated":
      return `${event.unitId} defeated`;
    case "battle-ended":
      return `Winner ${event.winner}`;
  }
}

function makeEngine() {
  return new BattleEngine(SEED, [
    { id: ZORO_ID, manifestId: ZORO_MANIFEST.id, team: "alpha", speed: 20, label: "Zoro" },
    {
      id: ALLY_ID,
      manifestId: DUMMY_MANIFEST.id,
      team: "alpha",
      speed: 11,
      maxHp: 70,
      label: "ALLY interim (Sanji slot)",
    },
    { id: ENEMY_A, manifestId: DUMMY_MANIFEST.id, team: "bravo", speed: 9, maxHp: 55, label: "ENEMY-A interim" },
    { id: ENEMY_B, manifestId: DUMMY_MANIFEST.id, team: "bravo", speed: 8, maxHp: 55, label: "ENEMY-B interim" },
  ]);
}

export function BattlePanel(props: {
  scene: InspectorScene | null;
  ready: boolean;
  onStatus: (text: string) => void;
}) {
  const engine = useMemo(() => makeEngine(), []);
  const [state, setState] = useState<BattleState>(() => engine.getState());
  const [busy, setBusy] = useState(false);
  const [targetId, setTargetId] = useState(ENEMY_A);
  const [log, setLog] = useState<string[]>([]);
  const liveAction = useRef<{ engineId: number; presentToken: number } | null>(null);
  const mounted = useRef(true);
  const arenaRef = useRef<BattleArena | null>(null);
  const unitsRef = useRef<UnitViewRegistry | null>(null);

  const slots = useMemo(
    () =>
      [
        { unitId: ZORO_ID, ...TWO_V_TWO_SLOTS[0] },
        { unitId: ALLY_ID, ...TWO_V_TWO_SLOTS[1] },
        { unitId: ENEMY_A, ...TWO_V_TWO_SLOTS[2] },
        { unitId: ENEMY_B, ...TWO_V_TWO_SLOTS[3] },
      ] as const,
    [],
  );

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      liveAction.current = null;
      props.scene?.cancelBattleSkill();
      arenaRef.current?.dispose();
      unitsRef.current?.dispose();
      arenaRef.current = null;
      unitsRef.current = null;
    };
  }, [props.scene]);

  useEffect(() => {
    if (!props.ready || !props.scene) return;
    const scene = props.scene.scene;
    arenaRef.current?.dispose();
    unitsRef.current?.dispose();
    const arena = new BattleArena(scene);
    const units = new UnitViewRegistry(scene);
    arena.setSlots([...slots]);
    const specs: UnitViewSpec[] = slots.map((slot) => {
      const unit = engine.getState().units.find((row) => row.id === slot.unitId);
      return {
        id: slot.unitId,
        label: unit?.label ?? slot.unitId,
        team: slot.team,
        kind: slot.unitId === ZORO_ID ? "character" : "synthetic",
        position: slot.position,
      };
    });
    units.sync(specs);
    arenaRef.current = arena;
    unitsRef.current = units;
    props.scene.setBattleDummy(false);
    props.scene.setRecenter(true);
    props.scene.setBodyFrame(true);
    props.scene.previewRoot.position.set(slots[0].position[0], 0, slots[0].position[2]);
    props.scene.camera.setTarget(arena.cameraTarget());
    props.scene.camera.radius = 520;
    props.scene.camera.alpha = Math.PI / 2;
    props.scene.camera.beta = 1.15;
    props.scene.setTemporaryTextures(true, previewForAsset("noesis-roster")).catch(() => undefined);
    const preview = previewForAsset("noesis-roster");
    if (preview) props.scene.playProvisionalIdle(preview);
    props.onStatus("2v2 arena ready. Sanji specials are in the inspector model list; idle/basic G1As were missing locally.");
    return () => {
      liveAction.current = null;
      props.scene?.cancelBattleSkill();
      props.scene?.previewRoot.position.setAll(0);
      arena.dispose();
      units.dispose();
      if (arenaRef.current === arena) arenaRef.current = null;
      if (unitsRef.current === units) unitsRef.current = null;
    };
  }, [props.ready, props.scene, engine, slots]);

  const refresh = (events: BattleEvent[] = []) => {
    if (!mounted.current) return;
    const next = engine.getState();
    setState(next);
    for (const unit of next.units) unitsRef.current?.setAlive(unit.id, unit.alive);
    if (events.length) setLog((prev) => [...events.map(formatEvent), ...prev].slice(0, 30));
  };

  const livingEnemies = state.units.filter((unit) => unit.team === "bravo" && unit.alive);
  const selected = livingEnemies.some((unit) => unit.id === targetId) ? targetId : (livingEnemies[0]?.id ?? "");
  const actorId = engine.currentActorId();
  const actor = state.units.find((unit) => unit.id === actorId);
  const actorManifest = actor ? manifestOf(actor.manifestId) : null;
  const canPlayerAct =
    props.ready && !busy && actorId === ZORO_ID && selected !== "" && engine.canAct(ZORO_ID, "basic", selected).ok;

  useEffect(() => {
    arenaRef.current?.highlight(selected || null);
  }, [selected]);

  const autoResolveUntilPlayerOrEnd = () => {
    let guard = 0;
    while (guard < 8) {
      guard += 1;
      const current = engine.getState();
      if (current.phase === "ended") return;
      const nextActor = engine.currentActorId();
      if (!nextActor || nextActor === ZORO_ID) return;
      const unit = current.units.find((row) => row.id === nextActor);
      if (!unit?.alive) return;
      const target =
        current.units.find((row) => row.alive && row.team !== unit.team && row.id === ZORO_ID) ??
        current.units.find((row) => row.alive && row.team !== unit.team);
      if (!target) return;
      const skillId = unit.manifestId === ZORO_MANIFEST.id ? "basic" : "dummy-poke";
      const events = engine.resolveFully(unit.id, skillId, target.id);
      unitsRef.current?.flash(target.id);
      refresh(events);
    }
  };

  const runZoroBasic = () => {
    if (!props.scene || !canPlayerAct || !selected) return;
    setBusy(true);
    const started = engine.beginAction(ZORO_ID, "basic", selected);
    refresh(started);
    const engineId = engine.currentActionId();
    if (engineId === null) {
      setBusy(false);
      return;
    }
    const preview = previewForAsset("noesis-roster");
    const skill = skillOf(ZORO_MANIFEST, "basic");
    const played = props.scene.playBattleSkill(
      preview,
      skill?.clipId ?? null,
      skill?.contact ?? 0.35,
      (token) => {
        if (!mounted.current) return;
        if (liveAction.current?.presentToken !== token || liveAction.current.engineId !== engineId) return;
        const contact = engine.applyContact(engineId);
        unitsRef.current?.flash(selected);
        refresh(contact);
        const dead = engine.getState().units.find((unit) => unit.id === selected);
        if (dead && !dead.alive) unitsRef.current?.setAlive(selected, false);
      },
      (token) => {
        if (!mounted.current) return;
        if (liveAction.current?.presentToken !== token || liveAction.current.engineId !== engineId) return;
        const finished = engine.finishAction(engineId);
        refresh(finished);
        liveAction.current = null;
        autoResolveUntilPlayerOrEnd();
        setBusy(false);
        props.onStatus("Zoro basic resolved.");
      },
    );
    liveAction.current = { engineId, presentToken: played.token };
    if (played.mode === "missing") {
      refresh(engine.abortAction(played.note, engineId));
      liveAction.current = null;
      setBusy(false);
      props.onStatus(played.note);
      return;
    }
    props.onStatus(played.note);
  };

  const reset = () => {
    if (busy) return;
    liveAction.current = null;
    props.scene?.cancelBattleSkill();
    engine.reset(SEED);
    setLog([]);
    refresh();
    for (const unit of engine.getState().units) unitsRef.current?.setAlive(unit.id, true);
    setTargetId(ENEMY_A);
    const preview = previewForAsset("noesis-roster");
    if (preview) props.scene?.playProvisionalIdle(preview);
    props.onStatus("2v2 reset.");
  };

  return (
    <div className="battle-panel">
      <h1>Battle preview 2v2</h1>
      <p className="note">
        Zoro plus a labeled interim ally versus two labeled interim enemies on a generated arena. Sanji specials are
        imported under Model → Noesis glTF Sanji specials. Local Sanji idle/basic G1As were missing.
      </p>
      <div className="battle-hp">
        {state.units.map((unit) => (
          <p key={unit.id}>
            {unit.label} HP {unit.hp}/{unit.maxHp} {unit.alive ? "" : "(down)"} [{unit.team}]
          </p>
        ))}
        <p className="note">
          Phase {state.phase}. Actor {actorId ?? "—"}
          {actorManifest ? ` (${actorManifest.label})` : ""}. Seed {state.seed}.
          {state.winner ? ` Winner ${state.winner}.` : ""}
        </p>
      </div>
      <label>
        Target
        <select
          value={selected}
          disabled={busy || livingEnemies.length === 0}
          onChange={(event) => setTargetId(event.target.value)}
        >
          {livingEnemies.map((unit) => (
            <option key={unit.id} value={unit.id}>
              {unit.label}
            </option>
          ))}
        </select>
      </label>
      <div className="row">
        <button type="button" disabled={!canPlayerAct} onClick={runZoroBasic}>
          Basic Attack
        </button>
        <button type="button" disabled={busy} onClick={reset}>
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
