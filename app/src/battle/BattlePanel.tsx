import { useEffect, useMemo, useRef, useState } from "react";
import {
  BattleEngine,
  DUMMY_MANIFEST,
  SANJI_MANIFEST,
  ZORO_MANIFEST,
  manifestOf,
  skillOf,
  type BattleEvent,
  type BattleState,
} from "../combat";
import { LOCAL_ASSETS } from "../inspector/assets";
import type { InspectorScene } from "../inspector/InspectorScene";
import { previewForAsset } from "../inspector/previewConfig";
import { BattleArena, TWO_V_TWO_SLOTS } from "./arena";
import { CharacterUnitView, measureHeapMb, type CharacterLoadResult } from "./CharacterUnitView";
import { UnitViewRegistry, type UnitViewSpec } from "./unitRegistry";

const SEED = 21;
const ZORO_ID = "zoro";
const SANJI_ID = "sanji";
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
    { id: SANJI_ID, manifestId: SANJI_MANIFEST.id, team: "alpha", speed: 18, label: "Sanji (provisional clips)" },
    { id: ENEMY_A, manifestId: DUMMY_MANIFEST.id, team: "bravo", speed: 9, maxHp: 55, label: "ENEMY-A interim" },
    { id: ENEMY_B, manifestId: DUMMY_MANIFEST.id, team: "bravo", speed: 8, maxHp: 55, label: "ENEMY-B interim" },
  ]);
}

export function BattlePanel(props: {
  scene: InspectorScene | null;
  active: boolean;
  onStatus: (text: string) => void;
}) {
  const engine = useMemo(() => makeEngine(), []);
  const [state, setState] = useState<BattleState>(() => engine.getState());
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [targetId, setTargetId] = useState(ENEMY_A);
  const [log, setLog] = useState<string[]>([]);
  const [loadNotes, setLoadNotes] = useState<string[]>([]);
  const liveAction = useRef<{ engineId: number; presentToken: number; unitId: string } | null>(null);
  const mounted = useRef(true);
  const arenaRef = useRef<BattleArena | null>(null);
  const markersRef = useRef<UnitViewRegistry | null>(null);
  const charactersRef = useRef<Map<string, CharacterUnitView>>(new Map());

  const slots = useMemo(
    () =>
      [
        { unitId: ZORO_ID, ...TWO_V_TWO_SLOTS[0] },
        { unitId: SANJI_ID, ...TWO_V_TWO_SLOTS[1] },
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
      for (const unit of charactersRef.current.values()) unit.dispose();
      charactersRef.current.clear();
      arenaRef.current?.dispose();
      markersRef.current?.dispose();
      arenaRef.current = null;
      markersRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!props.active || !props.scene) {
      setReady(false);
      return;
    }
    let cancelled = false;
    const scene = props.scene;
    scene.prepareBattleScene();
    const arena = new BattleArena(scene.scene);
    const markers = new UnitViewRegistry(scene.scene);
    arena.setSlots([...slots]);
    const markerSpecs: UnitViewSpec[] = slots.map((slot) => ({
      id: slot.unitId,
      label: engine.getState().units.find((unit) => unit.id === slot.unitId)?.label ?? slot.unitId,
      team: slot.team,
      kind: slot.unitId === ZORO_ID || slot.unitId === SANJI_ID ? "character" : "synthetic",
      position: slot.position,
    }));
    markers.sync(markerSpecs);
    arenaRef.current = arena;
    markersRef.current = markers;
    scene.camera.setTarget(arena.cameraTarget());
    scene.camera.radius = 680;
    scene.camera.alpha = Math.PI / 2;
    scene.camera.beta = 1.02;

    const load = async () => {
      const notes: string[] = [];
      const results: CharacterLoadResult[] = [];
      const zoroAsset = LOCAL_ASSETS.find((item) => item.id === "noesis-roster");
      const sanjiAsset = LOCAL_ASSETS.find((item) => item.id === "noesis-sanji");
      if (!zoroAsset || !sanjiAsset) {
        props.onStatus("Missing Zoro or Sanji local asset entry.");
        return;
      }
      const zoro = new CharacterUnitView(ZORO_ID, scene.scene);
      const sanji = new CharacterUnitView(SANJI_ID, scene.scene);
      charactersRef.current.set(ZORO_ID, zoro);
      charactersRef.current.set(SANJI_ID, sanji);
      try {
        const zoroResult = await zoro.load(zoroAsset, previewForAsset("noesis-roster"), slots[0].position);
        if (cancelled) return;
        results.push(zoroResult);
        notes.push(`Zoro ${zoroResult.meshes} meshes, ${zoroResult.clips.length} clips, ${zoroResult.loadMs} ms.`);
        zoro.playIdle(ZORO_MANIFEST.idleClip);
        markers.hidePlaceholder(ZORO_ID);
      } catch (error) {
        notes.push(`Zoro load failed: ${error instanceof Error ? error.message : String(error)}`);
      }
      try {
        const sanjiResult = await sanji.load(sanjiAsset, previewForAsset("noesis-sanji"), slots[1].position);
        if (cancelled) return;
        results.push(sanjiResult);
        notes.push(
          `Sanji ${sanjiResult.meshes} meshes, clips ${sanjiResult.clips.join(", ")}, ${sanjiResult.loadMs} ms. Idle/basic G1As missing locally; using provisional special stand-ins.`,
        );
        sanji.playIdle(SANJI_MANIFEST.idleClip);
        markers.hidePlaceholder(SANJI_ID);
      } catch (error) {
        notes.push(`Sanji load failed: ${error instanceof Error ? error.message : String(error)}`);
      }
      if (cancelled) return;
      setLoadNotes(notes);
      setReady(results.length === 2);
      const heap = measureHeapMb();
      props.onStatus(
        `Loaded ${results.length}/2 real fighters. Heap ${heap ?? "?"} MB. ${notes[notes.length - 1] ?? ""}`,
      );
    };
    void load();

    return () => {
      cancelled = true;
      liveAction.current = null;
      for (const unit of charactersRef.current.values()) unit.dispose();
      charactersRef.current.clear();
      arena.dispose();
      markers.dispose();
      if (arenaRef.current === arena) arenaRef.current = null;
      if (markersRef.current === markers) markersRef.current = null;
      setReady(false);
    };
    // Intentionally omit `props` / onStatus identity so App status re-renders do not dispose fighters.
  }, [props.active, props.scene, engine, slots]);

  const refresh = (events: BattleEvent[] = []) => {
    if (!mounted.current) return;
    const next = engine.getState();
    setState(next);
    for (const unit of next.units) {
      markersRef.current?.setAlive(unit.id, unit.alive);
      charactersRef.current.get(unit.id)?.setEnabled(unit.alive);
    }
    if (events.length) setLog((prev) => [...events.map(formatEvent), ...prev].slice(0, 30));
  };

  const livingEnemies = state.units.filter((unit) => unit.team === "bravo" && unit.alive);
  const selected = livingEnemies.some((unit) => unit.id === targetId) ? targetId : (livingEnemies[0]?.id ?? "");
  const actorId = engine.currentActorId();
  const actor = state.units.find((unit) => unit.id === actorId);
  const actorManifest = actor ? manifestOf(actor.manifestId) : null;
  const canPlayerAct =
    ready && !busy && actorId === ZORO_ID && selected !== "" && engine.canAct(ZORO_ID, "basic", selected).ok;

  useEffect(() => {
    arenaRef.current?.highlight(selected || null);
  }, [selected]);

  const playUnitSkill = (
    unitId: string,
    skillId: string,
    target: string,
    onDone: () => void,
  ) => {
    const manifest = manifestOf(engine.getState().units.find((unit) => unit.id === unitId)?.manifestId ?? "");
    const skill = manifest ? skillOf(manifest, skillId) : null;
    const character = charactersRef.current.get(unitId);
    if (!manifest || !skill) {
      onDone();
      return;
    }
    const started = engine.beginAction(unitId, skillId, target);
    refresh(started);
    const engineId = engine.currentActionId();
    if (engineId === null) {
      onDone();
      return;
    }
    if (!character || !skill.clipId) {
      const events = [...engine.applyContact(engineId), ...engine.finishAction(engineId)];
      markersRef.current?.flash(target);
      charactersRef.current.get(target)?.flash();
      refresh(events.filter((event) => event.type !== "blocked"));
      onDone();
      return;
    }
    const played = character.playSkill(
      manifest.idleClip,
      skill.clipId,
      skill.contact,
      (token) => {
        if (!mounted.current) return;
        if (liveAction.current?.presentToken !== token || liveAction.current.engineId !== engineId) return;
        const contact = engine.applyContact(engineId);
        markersRef.current?.flash(target);
        charactersRef.current.get(target)?.flash();
        refresh(contact);
      },
      (token) => {
        if (!mounted.current) return;
        if (liveAction.current?.presentToken !== token || liveAction.current.engineId !== engineId) return;
        refresh(engine.finishAction(engineId));
        liveAction.current = null;
        onDone();
      },
    );
    liveAction.current = { engineId, presentToken: played.token, unitId };
    if (played.mode === "missing") {
      refresh(engine.abortAction(played.note, engineId));
      liveAction.current = null;
      onDone();
      props.onStatus(played.note);
    } else {
      props.onStatus(played.note);
    }
  };

  const autoResolveUntilPlayerOrEnd = () => {
    const step = () => {
      const current = engine.getState();
      if (current.phase === "ended") return;
      const nextActor = engine.currentActorId();
      if (!nextActor || nextActor === ZORO_ID) return;
      const unit = current.units.find((row) => row.id === nextActor);
      if (!unit?.alive) return;
      const target =
        current.units.find((row) => row.alive && row.team !== unit.team && row.id === selected) ??
        current.units.find((row) => row.alive && row.team !== unit.team);
      if (!target) return;
      const skillId = unit.manifestId === SANJI_MANIFEST.id ? "basic" : unit.manifestId === ZORO_MANIFEST.id ? "basic" : "dummy-poke";
      setBusy(true);
      playUnitSkill(unit.id, skillId, target.id, () => {
        setBusy(false);
        if (engine.currentActorId() && engine.currentActorId() !== ZORO_ID && engine.getState().phase !== "ended") {
          window.setTimeout(step, 40);
        }
      });
    };
    step();
  };

  const runZoroBasic = () => {
    if (!canPlayerAct || !selected) return;
    setBusy(true);
    playUnitSkill(ZORO_ID, "basic", selected, () => {
      autoResolveUntilPlayerOrEnd();
      setBusy(false);
    });
  };

  const reset = () => {
    if (busy) return;
    liveAction.current = null;
    for (const unit of charactersRef.current.values()) unit.cancelAction();
    engine.reset(SEED);
    setLog([]);
    refresh();
    charactersRef.current.get(ZORO_ID)?.playIdle(ZORO_MANIFEST.idleClip);
    charactersRef.current.get(SANJI_ID)?.playIdle(SANJI_MANIFEST.idleClip);
    for (const unit of engine.getState().units) {
      markersRef.current?.setAlive(unit.id, true);
      charactersRef.current.get(unit.id)?.setEnabled(true);
    }
    setTargetId(ENEMY_A);
    props.onStatus("2v2 reset. Zoro and Sanji restored to idle stand-ins.");
  };

  return (
    <div className="battle-panel">
      <h1>Battle preview 2v2</h1>
      <p className="note">
        Zoro and Sanji load as separate skinned roots. Sanji uses provisional special stand-ins for idle/basic because those
        G1As were not in the local inventory. Enemies stay labeled interim synthetics.
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
      {!ready ? <p className="note">Loading Zoro and Sanji…</p> : null}
      {busy ? <p className="note">Action in progress.</p> : null}
      {loadNotes.map((note) => (
        <p className="note" key={note}>
          {note}
        </p>
      ))}
      <h2>Event log</h2>
      <ul className="battle-log">
        {log.map((line, index) => (
          <li key={`${index}-${line}`}>{line}</li>
        ))}
      </ul>
    </div>
  );
}
