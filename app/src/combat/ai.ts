import { manifestOf, primarySkills, skillOf } from "./manifests";
import type { BattleEngine } from "./engine";

export interface EnemyDecision {
  actorId: string;
  skillId: string;
  targetId: string;
  reason: string;
}

/**
 * Deterministic bravo policy:
 * - Prefer any affordable offensive special from primarySkills (special / special-2) that canAct allows
 * - else Basic
 * Attack target: living alpha with lowest HP (id tie-break).
 * Among multiple legal specials, pick highest damage (id tie-break).
 * Asura is omitted from primarySkills until re-enabled.
 */
export function chooseEnemyAction(engine: BattleEngine): EnemyDecision | null {
  const state = engine.getState();
  const actorId = engine.currentActorId();
  if (!actorId || state.phase !== "idle") return null;
  const actor = state.units.find((unit) => unit.id === actorId);
  if (!actor?.alive || actor.team !== "bravo") return null;
  const manifest = manifestOf(actor.manifestId);
  if (!manifest) return null;

  const skills = primarySkills(manifest);
  const basic = skills.find((row) => row.id === "basic" || row.energyCost === 0) ?? skills[0];
  const specials = skills.filter((row) => row.id !== "basic");

  const targets = state.units
    .filter((unit) => unit.alive && unit.team === "alpha")
    .sort((a, b) => a.hp - b.hp || a.id.localeCompare(b.id));
  const target = targets[0];
  if (!target) return null;

  const affordable = specials
    .filter((row) => actor.energy >= row.energyCost && engine.canAct(actorId, row.id, target.id).ok)
    .sort((a, b) => b.damage - a.damage || a.id.localeCompare(b.id));
  const picked = affordable[0] ?? basic;
  if (!picked) return null;

  const skillId = picked.id;
  const reason = affordable[0]
    ? `special-available`
    : basic
      ? "basic"
      : "basic-fallback";

  if (!engine.canAct(actorId, skillId, target.id).ok) {
    if (basic && skillId !== basic.id && engine.canAct(actorId, basic.id, target.id).ok) {
      const chosen = skillOf(manifest, basic.id);
      return {
        actorId,
        skillId: basic.id,
        targetId: target.id,
        reason: `special-blocked-basic (${chosen?.label ?? basic.id} → ${target.id})`,
      };
    }
    return null;
  }

  const chosen = skillOf(manifest, skillId);
  return {
    actorId,
    skillId,
    targetId: target.id,
    reason: `${reason} (${chosen?.label ?? skillId} → ${target.id})`,
  };
}
