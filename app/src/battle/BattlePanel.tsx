import { useEffect, useMemo, useRef, useState } from "react";
import {
  BATTLE_LINEUPS,
  BattleEngine,
  assetIdForUnit,
  chooseEnemyAction,
  lineupById,
  lineupToSpawns,
  manifestOf,
  primarySkills,
  resolveModeForAction,
  skillOf,
  type BattleEvent,
  type BattleState,
  type LineupDefinition,
} from "../combat";
import { LOCAL_ASSETS } from "../inspector/assets";
import type { InspectorScene } from "../inspector/InspectorScene";
import { previewForAsset } from "../inspector/previewConfig";
import { BattleArena, slotsForLineup } from "./arena";
import { CharacterUnitView, measureHeapMb, type CharacterLoadResult } from "./CharacterUnitView";
import { UnitViewRegistry, type UnitViewSpec } from "./unitRegistry";

const SEED = 21;

function formatEvent(event: BattleEvent): string {
  switch (event.type) {
    case "battle-started":
      return `Battle seed ${event.seed}. Order ${event.order.join(", ")}.`;
    case "turn":
      return `Turn ${event.turnIndex}: ${event.actorId}`;
    case "action-started":
      return `#${event.actionId} ${event.actorId} ${event.skillId} → ${event.targetId} (spent ${event.energySpent}, left ${event.energyLeft})`;
    case "contact": {
      const guardNote = event.guarded ? ` (guarded from ${event.rawDamage})` : "";
      const granted = event.guardChargesGranted > 0 ? ` Guard+${event.guardChargesGranted}` : "";
      return `#${event.actionId} contact ${event.damage} dmg${guardNote}. ${event.targetId} HP ${event.targetHp}. Energy +${event.energyGained} → ${event.actorEnergy}${granted}`;
    }
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

function defaultEnemyId(lineup: LineupDefinition): string {
  return lineup.units.find((unit) => unit.team === "bravo")?.id ?? lineup.units[0]?.id ?? "";
}

export function BattlePanel(props: {
  scene: InspectorScene | null;
  active: boolean;
  onStatus: (text: string) => void;
}) {
  const [lineupId, setLineupId] = useState(BATTLE_LINEUPS[0]!.id);
  const lineup = useMemo(() => lineupById(lineupId), [lineupId]);
  const [engine, setEngine] = useState(() => new BattleEngine(SEED, lineupToSpawns(lineup)));
  const [state, setState] = useState<BattleState>(() => engine.getState());
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [targetId, setTargetId] = useState(() => defaultEnemyId(lineup));
  const [log, setLog] = useState<string[]>([]);
  const [loadNotes, setLoadNotes] = useState<string[]>([]);
  const [showAllMeshes, setShowAllMeshes] = useState(false);
  /** Noesis remains the battle default until GLB parity is accepted. */
  const [assetSource, setAssetSource] = useState<"noesis" | "glb">("noesis");
  const [benchNote, setBenchNote] = useState("");
  const liveAction = useRef<{ engineId: number; presentToken: number; unitId: string } | null>(null);
  const mounted = useRef(true);
  const sessionRef = useRef(0);
  const autoTimerRef = useRef<number | null>(null);
  const arenaRef = useRef<BattleArena | null>(null);
  const markersRef = useRef<UnitViewRegistry | null>(null);
  const charactersRef = useRef<Map<string, CharacterUnitView>>(new Map());
  const engineRef = useRef(engine);
  engineRef.current = engine;

  const clearAutoTimer = () => {
    if (autoTimerRef.current !== null) {
      window.clearTimeout(autoTimerRef.current);
      autoTimerRef.current = null;
    }
  };

  const slots = useMemo(() => slotsForLineup(lineup.units), [lineup]);
  const fighterIds = useMemo(() => lineup.units.map((unit) => unit.id), [lineup]);

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
    // True 16:9 drawing buffer for review captures.
    scene.engine.setSize(1280, 720, true);
    scene.camera.radius = 480;
    scene.camera.alpha = 0.35;
    scene.camera.beta = 1.05;
    const arena = new BattleArena(scene.scene);
    const markers = new UnitViewRegistry(scene.scene);
    arena.setSlots([...slots]);
    const markerSpecs: UnitViewSpec[] = slots.map((slot) => ({
      id: slot.unitId,
      label: engineRef.current.getState().units.find((unit) => unit.id === slot.unitId)?.label ?? slot.unitId,
      team: slot.team,
      kind: "character",
      position: slot.position,
    }));
    markers.sync(markerSpecs);
    arenaRef.current = arena;
    markersRef.current = markers;
    scene.camera.setTarget(arena.cameraTarget());

    const load = async () => {
      const notes: string[] = [];
      const results: CharacterLoadResult[] = [];
      for (const [index, unit] of lineup.units.entries()) {
        const assetId = assetIdForUnit(unit, assetSource);
        const asset = LOCAL_ASSETS.find((item) => item.id === assetId);
        const preview = previewForAsset(assetId);
        if (!asset || !preview) {
          notes.push(`Missing asset/preview for ${unit.id} (${assetId}).`);
          continue;
        }
        const view = new CharacterUnitView(unit.id, scene.scene);
        charactersRef.current.set(unit.id, view);
        try {
          const result = await view.load(asset, preview, slots[index]!.position, {
            preferEmbeddedTextures: assetSource === "glb",
          });
          if (cancelled || session !== sessionRef.current) return;
          view.setShowAllMeshes(showAllMeshes);
          results.push(result);
          const slot = slots[index]!;
          const durationNote = Object.entries(result.clipDurations)
            .map(([name, sec]) => `${name}:${sec}s`)
            .join(", ");
          notes.push(
            `${unit.id}←${asset.id} @ [${slot.position.join(",")}] ${result.meshes} meshes, ${result.skeletons} skel/${result.joints} joints, clips ${result.clips.join(", ")}, durations [${durationNote}], ${result.loadMs} ms, textures ${result.textureNotes}, embedded ${result.embeddedTextures}${result.usedEmbeddedOnly ? " (embedded-only)" : ""}${result.textureError ? ` (${result.textureError})` : ""}.`,
          );
          const manifest = manifestOf(unit.manifestId);
          view.playIdle(manifest?.idleClip ?? null);
          markers.hidePlaceholder(unit.id);
        } catch (error) {
          notes.push(`${unit.id} load failed: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
      if (cancelled || session !== sessionRef.current) return;
      setLoadNotes(notes);
      setReady(results.length === lineup.units.length);
      const heap = measureHeapMb();
      const textured = results.filter((row) => row.textured).length;
      props.onStatus(
        `Loaded ${results.length}/${lineup.units.length} fighters (${textured}/${results.length} textured). Heap ${heap ?? "?"} MB. Canvas ${scene.engine.getRenderWidth()}×${scene.engine.getRenderHeight()}.`,
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
  }, [props.active, props.scene, slots, assetSource, lineup]);

  useEffect(() => {
    for (const unit of charactersRef.current.values()) unit.setShowAllMeshes(showAllMeshes);
  }, [showAllMeshes]);

  const refresh = (events: BattleEvent[] = []) => {
    if (!mounted.current) return;
    const next = engineRef.current.getState();
    setState(next);
    for (const unit of next.units) {
      markersRef.current?.setAlive(unit.id, unit.alive);
      charactersRef.current.get(unit.id)?.setEnabled(unit.alive);
    }
    if (events.length) setLog((prev) => [...events.map(formatEvent), ...prev].slice(0, 40));
  };

  const livingEnemies = state.units.filter((unit) => unit.team === "bravo" && unit.alive);
  const selected = livingEnemies.some((unit) => unit.id === targetId) ? targetId : (livingEnemies[0]?.id ?? "");
  const actorId = engine.currentActorId();
  const actor = state.units.find((unit) => unit.id === actorId);
  const actorManifest = actor ? manifestOf(actor.manifestId) : null;
  const playerActor = actor && actor.team === "alpha" ? actor.id : null;
  const playerSkills = actorManifest && playerActor ? primarySkills(actorManifest) : [];
  const queue = engine.turnQueue(6);

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
    const eng = engineRef.current;
    const manifest = manifestOf(eng.getState().units.find((unit) => unit.id === unitId)?.manifestId ?? "");
    const skill = manifest ? skillOf(manifest, skillId) : null;
    const character = charactersRef.current.get(unitId);
    if (!manifest || !skill) {
      onDone();
      return;
    }
    const started = eng.beginAction(unitId, skillId, target);
    refresh(started);
    const engineId = eng.currentActionId();
    if (engineId === null) {
      onDone();
      return;
    }
    const policy = resolveModeForAction(manifest, skill, !!character);
    if (policy.mode === "instant") {
      const events = [...eng.applyContact(engineId), ...eng.finishAction(engineId)];
      markersRef.current?.flash(target);
      charactersRef.current.get(target)?.flash();
      refresh(events.filter((event) => event.type !== "blocked"));
      onDone();
      return;
    }
    if (policy.mode === "abort") {
      refresh(eng.abortAction(policy.reason, engineId));
      onDone();
      props.onStatus(policy.reason);
      return;
    }
    const played = character!.playSkill(
      manifest.idleClip,
      skill.clipId!,
      skill.contact,
      (token) => {
        if (!mounted.current || session !== sessionRef.current) return;
        if (liveAction.current?.presentToken !== token || liveAction.current.engineId !== engineId) return;
        const contact = eng.applyContact(engineId);
        markersRef.current?.flash(target);
        charactersRef.current.get(target)?.flash();
        refresh(contact);
      },
      (token) => {
        if (!mounted.current || session !== sessionRef.current) return;
        if (liveAction.current?.presentToken !== token || liveAction.current.engineId !== engineId) return;
        refresh(eng.finishAction(engineId));
        liveAction.current = null;
        onDone();
      },
    );
    liveAction.current = { engineId, presentToken: played.token, unitId };
    if (played.mode === "missing") {
      refresh(eng.abortAction(played.note, engineId));
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
      const eng = engineRef.current;
      const current = eng.getState();
      if (current.phase === "ended") {
        setBusy(false);
        return;
      }
      const nextActor = eng.currentActorId();
      const nextUnit = current.units.find((unit) => unit.id === nextActor);
      if (!nextActor || nextUnit?.team === "alpha") {
        setBusy(false);
        return;
      }
      const decision = chooseEnemyAction(eng);
      if (!decision) {
        setBusy(false);
        props.onStatus(`Enemy ${nextActor} has no legal action.`);
        return;
      }
      setBusy(true);
      props.onStatus(`AI ${decision.reason}`);
      playUnitSkill(decision.actorId, decision.skillId, decision.targetId, session, () => {
        if (!mounted.current || session !== sessionRef.current) return;
        const follow = eng.currentActorId();
        const followUnit = eng.getState().units.find((unit) => unit.id === follow);
        if (follow && followUnit?.team === "bravo" && eng.getState().phase !== "ended") {
          clearAutoTimer();
          autoTimerRef.current = window.setTimeout(step, 40);
        } else {
          setBusy(false);
        }
      });
    };
    step();
  };

  const runPlayerSkill = (skillId: string) => {
    if (!ready || busy || !playerActor) return;
    const skill = actorManifest ? skillOf(actorManifest, skillId) : null;
    const target = skill?.targetMode === "self" ? playerActor : selected;
    if (!target) return;
    if (!engine.canAct(playerActor, skillId, target).ok) return;
    const session = sessionRef.current;
    setBusy(true);
    playUnitSkill(playerActor, skillId, target, session, () => {
      if (!mounted.current || session !== sessionRef.current) return;
      autoResolveUntilPlayerOrEnd(session);
    });
  };

  const applyLineup = (nextId: string) => {
    if (busy) return;
    clearAutoTimer();
    sessionRef.current += 1;
    liveAction.current = null;
    for (const unit of charactersRef.current.values()) unit.cancelAction();
    const nextLineup = lineupById(nextId);
    const nextEngine = new BattleEngine(SEED, lineupToSpawns(nextLineup));
    setLineupId(nextId);
    setEngine(nextEngine);
    setState(nextEngine.getState());
    setLog([]);
    setBenchNote("");
    setTargetId(defaultEnemyId(nextLineup));
    setReady(false);
    props.onStatus(`Lineup → ${nextLineup.label}`);
  };

  const reset = () => {
    if (busy) return;
    clearAutoTimer();
    sessionRef.current += 1;
    liveAction.current = null;
    for (const unit of charactersRef.current.values()) unit.cancelAction();
    engine.reset(SEED);
    setLog([]);
    setBenchNote("");
    refresh();
    for (const unit of lineup.units) {
      const manifest = manifestOf(unit.manifestId);
      charactersRef.current.get(unit.id)?.playIdle(manifest?.idleClip ?? null);
      markersRef.current?.hidePlaceholder(unit.id);
    }
    for (const unit of engine.getState().units) {
      markersRef.current?.setAlive(unit.id, true);
      charactersRef.current.get(unit.id)?.setEnabled(true);
    }
    setTargetId(defaultEnemyId(lineup));
    props.onStatus("2v2 reset. Energy and HP restored.");
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
      <div className="battle-hud">
        <div className="battle-hud-top">
          <strong>2v2</strong>
          <label className="battle-lineup">
            Lineup
            <select value={lineupId} disabled={busy} onChange={(event) => applyLineup(event.target.value)}>
              {BATTLE_LINEUPS.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.label}
                </option>
              ))}
            </select>
          </label>
          <span>
            Actor {actor?.label ?? "—"} · EN {actor?.energy ?? 0}/{actor?.maxEnergy ?? 0}
            {actor && actor.guardCharges > 0 ? ` · Guard×${actor.guardCharges}` : ""}
          </span>
          <span>Queue {queue.map((id) => state.units.find((u) => u.id === id)?.label ?? id).join(" → ") || "—"}</span>
        </div>
        {state.phase === "ended" ? (
          <p className="battle-result">{state.winner === "alpha" ? "Victory" : "Defeat"} — winner {state.winner}</p>
        ) : null}
        <div className="battle-commands">
          <label className="battle-target">
            Target
            <select
              value={selected}
              disabled={busy || livingEnemies.length === 0 || state.phase === "ended"}
              onChange={(event) => setTargetId(event.target.value)}
            >
              {livingEnemies.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.label} ({unit.hp}/{unit.maxHp}
                  {unit.guardCharges > 0 ? ` G${unit.guardCharges}` : ""})
                </option>
              ))}
            </select>
          </label>
          <div className="row battle-skill-row">
            {playerSkills.map((skill) => {
              const target = skill.targetMode === "self" ? playerActor ?? "" : selected;
              const check =
                playerActor && target
                  ? engine.canAct(playerActor, skill.id, target)
                  : { ok: false, reason: "Waiting for ally turn" };
              const can = ready && !busy && state.phase !== "ended" && check.ok;
              const cost =
                skill.id === "guard"
                  ? ` (−${skill.energyCost} EN, next hit ×½)`
                  : skill.energyCost > 0
                    ? ` (−${skill.energyCost})`
                    : " (+1 EN)";
              return (
                <button
                  key={skill.id}
                  type="button"
                  disabled={!can}
                  title={check.reason}
                  onClick={() => runPlayerSkill(skill.id)}
                >
                  {skill.label}
                  {cost}
                </button>
              );
            })}
            <button type="button" disabled={busy} onClick={reset}>
              Reset
            </button>
          </div>
        </div>
        <div className="battle-hp battle-hp-compact">
          {state.units.map((unit) => (
            <button
              type="button"
              key={unit.id}
              className={`battle-unit${unit.id === actorId ? " battle-actor" : ""}${unit.alive ? "" : " battle-down"}${unit.team === "bravo" && unit.id === selected ? " battle-target" : ""}`}
              disabled={!unit.alive || unit.team !== "bravo" || busy || state.phase === "ended"}
              onClick={() => setTargetId(unit.id)}
            >
              <div className="battle-unit-label">
                {unit.label}
                {unit.alive ? "" : " KO"}
                {unit.guardCharges > 0 ? ` G${unit.guardCharges}` : ""}
              </div>
              <div className="battle-bar">
                <span style={{ width: `${Math.max(0, (unit.hp / unit.maxHp) * 100)}%` }} />
              </div>
              <div className="battle-unit-meta">
                {unit.hp}/{unit.maxHp} · EN {unit.energy}/{unit.maxEnergy}
                {unit.guardCharges > 0 ? ` · Guard×${unit.guardCharges}` : ""}
              </div>
            </button>
          ))}
        </div>
        {!ready ? <p className="note">Loading fighters…</p> : null}
        {busy ? <p className="note">Action in progress.</p> : null}
      </div>
      <details className="battle-debug">
        <summary>Developer / diagnostics</summary>
        <p className="note">Basic +1 EN · Special −3 · Guard −1 (custom tactical, not authentic PW4). Cap 1 Guard charge.</p>
        <p className="note">Fighters: {fighterIds.join(", ")}</p>
        <label>
          Asset source
          <select
            value={assetSource}
            disabled={busy}
            onChange={(event) => setAssetSource(event.target.value === "glb" ? "glb" : "noesis")}
          >
            <option value="noesis">Noesis glTF (default)</option>
            <option value="glb">Blender GLB (local validation)</option>
          </select>
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={showAllMeshes}
            onChange={(event) => setShowAllMeshes(event.target.checked)}
          />
          Show All meshes (diagnostic)
        </label>
        <div className="row">
          <button type="button" disabled={!ready || busy} onClick={() => void runHeapCycles()}>
            Heap ×5 reset
          </button>
        </div>
        {benchNote ? <p className="note">{benchNote}</p> : null}
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
      </details>
    </div>
  );
}
