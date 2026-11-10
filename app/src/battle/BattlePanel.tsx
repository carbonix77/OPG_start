import { useEffect, useMemo, useRef, useState } from "react";
import {
  BattleEngine,
  NAMI_MANIFEST,
  SANJI_MANIFEST,
  USOPP_MANIFEST,
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
const NAMI_ID = "nami";
const USOPP_ID = "usopp";
const ALLY_IDS = new Set([ZORO_ID, SANJI_ID]);
const FIGHTER_IDS = [ZORO_ID, SANJI_ID, NAMI_ID, USOPP_ID] as const;

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
    { id: SANJI_ID, manifestId: SANJI_MANIFEST.id, team: "alpha", speed: 18, label: "Sanji" },
    { id: NAMI_ID, manifestId: NAMI_MANIFEST.id, team: "bravo", speed: 12, maxHp: 80, label: "Nami" },
    { id: USOPP_ID, manifestId: USOPP_MANIFEST.id, team: "bravo", speed: 10, maxHp: 75, label: "Usopp" },
  ]);
}

const ASSET_BY_UNIT: Record<string, string> = {
  [ZORO_ID]: "noesis-roster",
  [SANJI_ID]: "noesis-sanji",
  [NAMI_ID]: "noesis-nami",
  [USOPP_ID]: "noesis-usopp",
};

const MANIFEST_BY_UNIT = {
  [ZORO_ID]: ZORO_MANIFEST,
  [SANJI_ID]: SANJI_MANIFEST,
  [NAMI_ID]: NAMI_MANIFEST,
  [USOPP_ID]: USOPP_MANIFEST,
} as const;

export function BattlePanel(props: {
  scene: InspectorScene | null;
  active: boolean;
  onStatus: (text: string) => void;
}) {
  const engine = useMemo(() => makeEngine(), []);
  const [state, setState] = useState<BattleState>(() => engine.getState());
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [targetId, setTargetId] = useState(NAMI_ID);
  const [log, setLog] = useState<string[]>([]);
  const [loadNotes, setLoadNotes] = useState<string[]>([]);
  /** Diagnostic: draw owner-hidden submeshes. Presentation default keeps them off. */
  const [showAllMeshes, setShowAllMeshes] = useState(false);
  const [idlePhaseNote, setIdlePhaseNote] = useState("");
  const [benchNote, setBenchNote] = useState("");
  const liveAction = useRef<{ engineId: number; presentToken: number; unitId: string } | null>(null);
  const mounted = useRef(true);
  const sessionRef = useRef(0);
  const autoTimerRef = useRef<number | null>(null);
  const arenaRef = useRef<BattleArena | null>(null);
  const markersRef = useRef<UnitViewRegistry | null>(null);
  const charactersRef = useRef<Map<string, CharacterUnitView>>(new Map());

  const clearAutoTimer = () => {
    if (autoTimerRef.current !== null) {
      window.clearTimeout(autoTimerRef.current);
      autoTimerRef.current = null;
    }
  };

  const slots = useMemo(
    () =>
      [
        { unitId: ZORO_ID, ...TWO_V_TWO_SLOTS[0] },
        { unitId: SANJI_ID, ...TWO_V_TWO_SLOTS[1] },
        { unitId: NAMI_ID, ...TWO_V_TWO_SLOTS[2] },
        { unitId: USOPP_ID, ...TWO_V_TWO_SLOTS[3] },
      ] as const,
    [],
  );

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      clearAutoTimer();
      sessionRef.current += 1;
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
    const session = ++sessionRef.current;
    clearAutoTimer();
    const scene = props.scene;
    scene.prepareBattleScene();
    const arena = new BattleArena(scene.scene);
    const markers = new UnitViewRegistry(scene.scene);
    arena.setSlots([...slots]);
    const markerSpecs: UnitViewSpec[] = slots.map((slot) => ({
      id: slot.unitId,
      label: engine.getState().units.find((unit) => unit.id === slot.unitId)?.label ?? slot.unitId,
      team: slot.team,
      kind: "character",
      position: slot.position,
    }));
    markers.sync(markerSpecs);
    arenaRef.current = arena;
    markersRef.current = markers;
    // Landscape side-ish view from +X with a slight yaw so both bravo slots stay in frame.
    scene.camera.setTarget(arena.cameraTarget());
    scene.camera.radius = 720;
    scene.camera.alpha = 0.22;
    scene.camera.beta = 1.12;

    const load = async () => {
      const notes: string[] = [];
      const results: CharacterLoadResult[] = [];
      for (const [index, unitId] of FIGHTER_IDS.entries()) {
        const assetId = ASSET_BY_UNIT[unitId];
        const asset = LOCAL_ASSETS.find((item) => item.id === assetId);
        const preview = previewForAsset(assetId);
        if (!asset || !preview) {
          notes.push(`Missing asset/preview for ${unitId} (${assetId}).`);
          continue;
        }
        const unit = new CharacterUnitView(unitId, scene.scene);
        charactersRef.current.set(unitId, unit);
        try {
          const result = await unit.load(asset, preview, slots[index].position);
          if (cancelled || session !== sessionRef.current) return;
          unit.setShowAllMeshes(showAllMeshes);
          results.push(result);
          const slot = slots[index];
          notes.push(
            `${unitId}←${asset.id} @ [${slot.position.join(",")}] ${result.meshes} meshes, clips ${result.clips.join(", ")}, ${result.loadMs} ms, textures ${result.textureNotes}${result.textureError ? ` (${result.textureError})` : ""}.`,
          );
          unit.playIdle(MANIFEST_BY_UNIT[unitId].idleClip);
          markers.hidePlaceholder(unitId);
        } catch (error) {
          notes.push(`${unitId} load failed: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
      if (cancelled || session !== sessionRef.current) return;
      setLoadNotes(notes);
      setReady(results.length === FIGHTER_IDS.length);
      const heap = measureHeapMb();
      const textured = results.filter((row) => row.textured).length;
      props.onStatus(
        `Loaded ${results.length}/${FIGHTER_IDS.length} fighters (${textured}/${results.length} textured). Heap ${heap ?? "?"} MB.`,
      );
    };
    void load();

    return () => {
      cancelled = true;
      clearAutoTimer();
      sessionRef.current += 1;
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
    // showAllMeshes is applied after load via its own effect so toggling does not reload.
  }, [props.active, props.scene, engine, slots]);

  useEffect(() => {
    for (const unit of charactersRef.current.values()) unit.setShowAllMeshes(showAllMeshes);
  }, [showAllMeshes]);

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
  const playerActor = actorId && ALLY_IDS.has(actorId) ? actorId : null;
  const canPlayerAct =
    ready &&
    !busy &&
    !!playerActor &&
    selected !== "" &&
    engine.canAct(playerActor, "basic", selected).ok;

  useEffect(() => {
    arenaRef.current?.highlight(selected || null);
  }, [selected]);

  const playUnitSkill = (
    unitId: string,
    skillId: string,
    target: string,
    session: number,
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
        if (!mounted.current || session !== sessionRef.current) return;
        if (liveAction.current?.presentToken !== token || liveAction.current.engineId !== engineId) return;
        const contact = engine.applyContact(engineId);
        markersRef.current?.flash(target);
        charactersRef.current.get(target)?.flash();
        refresh(contact);
      },
      (token) => {
        if (!mounted.current || session !== sessionRef.current) return;
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

  const autoResolveUntilPlayerOrEnd = (session: number) => {
    const step = () => {
      if (!mounted.current || session !== sessionRef.current) return;
      const current = engine.getState();
      if (current.phase === "ended") {
        setBusy(false);
        return;
      }
      const nextActor = engine.currentActorId();
      if (!nextActor || ALLY_IDS.has(nextActor)) {
        setBusy(false);
        return;
      }
      const unit = current.units.find((row) => row.id === nextActor);
      if (!unit?.alive) {
        setBusy(false);
        return;
      }
      const target =
        current.units.find((row) => row.alive && row.team !== unit.team && row.id === selected) ??
        current.units.find((row) => row.alive && row.team !== unit.team);
      if (!target) {
        setBusy(false);
        return;
      }
      setBusy(true);
      playUnitSkill(unit.id, "basic", target.id, session, () => {
        if (!mounted.current || session !== sessionRef.current) return;
        const follow = engine.currentActorId();
        if (follow && !ALLY_IDS.has(follow) && engine.getState().phase !== "ended") {
          clearAutoTimer();
          autoTimerRef.current = window.setTimeout(step, 40);
        } else {
          setBusy(false);
        }
      });
    };
    step();
  };

  const runPlayerBasic = () => {
    if (!canPlayerAct || !selected || !playerActor) return;
    const session = sessionRef.current;
    setBusy(true);
    playUnitSkill(playerActor, "basic", selected, session, () => {
      if (!mounted.current || session !== sessionRef.current) return;
      autoResolveUntilPlayerOrEnd(session);
    });
  };

  const reset = () => {
    if (busy) return;
    clearAutoTimer();
    sessionRef.current += 1;
    liveAction.current = null;
    for (const unit of charactersRef.current.values()) unit.cancelAction();
    engine.reset(SEED);
    setLog([]);
    setIdlePhaseNote("");
    refresh();
    for (const unitId of FIGHTER_IDS) {
      charactersRef.current.get(unitId)?.playIdle(MANIFEST_BY_UNIT[unitId].idleClip);
      markersRef.current?.hidePlaceholder(unitId);
    }
    for (const unit of engine.getState().units) {
      markersRef.current?.setAlive(unit.id, true);
      charactersRef.current.get(unit.id)?.setEnabled(true);
    }
    setTargetId(NAMI_ID);
    props.onStatus("2v2 reset. Zoro+Sanji vs Nami+Usopp restored to idle.");
  };

  const holdSanjiIdlePhase = (normalized: number) => {
    const sanji = charactersRef.current.get(SANJI_ID);
    if (!sanji) return;
    const idleClip = SANJI_MANIFEST.idleClip ?? "Sanji_0000";
    const note = sanji.scrubClip(idleClip, normalized);
    setIdlePhaseNote(note);
    props.onStatus(note);
  };

  const loopSanjiIdle = () => {
    const sanji = charactersRef.current.get(SANJI_ID);
    if (!sanji) return;
    const note = sanji.playIdle(SANJI_MANIFEST.idleClip);
    setIdlePhaseNote(note);
    props.onStatus(note);
  };

  const runHeapCycles = async () => {
    if (busy || !ready) return;
    const samples: number[] = [];
    for (let i = 0; i < 5; i += 1) {
      reset();
      await new Promise((resolve) => window.setTimeout(resolve, 120));
      const gc = (globalThis as { gc?: () => void }).gc;
      gc?.();
      samples.push(measureHeapMb() ?? -1);
    }
    const valid = samples.filter((n) => n >= 0);
    const note =
      valid.length === 0
        ? "Heap API unavailable in this browser."
        : `Heap after 5 reset cycles (MB): ${valid.join(", ")} · min ${Math.min(...valid)} · max ${Math.max(...valid)} · last ${valid[valid.length - 1]}.`;
    setBenchNote(note);
    props.onStatus(note);
  };

  return (
    <div className="battle-panel">
      <h1>Battle preview 2v2</h1>
      <p className="note">
        Player controls the current alive ally (Zoro or Sanji). Bravo is textured Nami and Usopp on their own rigs.
        Foot tags show label[id] at each root for identity checks.
      </p>
      <div className="battle-hp">
        {state.units.map((unit) => (
          <p key={unit.id} className={unit.id === actorId ? "battle-actor" : undefined}>
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
        <button type="button" disabled={!canPlayerAct} onClick={runPlayerBasic}>
          {playerActor === SANJI_ID ? "Sanji basic" : playerActor === ZORO_ID ? "Zoro basic" : "Basic Attack"}
        </button>
        <button type="button" disabled={busy} onClick={reset}>
          Reset
        </button>
      </div>
      <label className="check">
        <input
          type="checkbox"
          checked={showAllMeshes}
          onChange={(event) => setShowAllMeshes(event.target.checked)}
        />
        Show All meshes (diagnostic). Off keeps the owner hide preset.
      </label>
      <div className="row">
        <button type="button" disabled={!ready || busy} onClick={() => holdSanjiIdlePhase(0)}>
          Sanji idle t0
        </button>
        <button type="button" disabled={!ready || busy} onClick={() => holdSanjiIdlePhase(0.25)}>
          t.25
        </button>
        <button type="button" disabled={!ready || busy} onClick={() => holdSanjiIdlePhase(0.5)}>
          t.5
        </button>
        <button type="button" disabled={!ready || busy} onClick={() => holdSanjiIdlePhase(0.75)}>
          t.75
        </button>
        <button type="button" disabled={!ready || busy} onClick={loopSanjiIdle}>
          Loop idle
        </button>
      </div>
      {idlePhaseNote ? <p className="note">{idlePhaseNote}</p> : null}
      <div className="row">
        <button type="button" disabled={!ready || busy} onClick={() => void runHeapCycles()}>
          Heap ×5 reset
        </button>
      </div>
      {benchNote ? <p className="note">{benchNote}</p> : null}
      {!ready ? <p className="note">Loading Zoro, Sanji, Nami, and Usopp…</p> : null}
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
