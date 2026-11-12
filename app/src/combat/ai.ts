import { createRng } from "./rng";
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
 * - Guard when low HP and energy allows (seeded)
 * - else Special when affordable (seeded)
 * - else Basic
 * Attack target: living alpha with lowest HP (id tie-break).
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
  const special = skills.find((row) => row.id === "special");
  const guard = skills.find((row) => row.id === "guard");
  const rng = createRng(state.seed * 1009 + state.turnIndex * 17 + actorId.length * 31);
  const roll = rng();

  if (guard && actor.energy >= guard.energyCost && actor.hp / actor.maxHp <= 0.45 && roll < 0.4) {
    const check = engine.canAct(actorId, guard.id, actorId);
    if (check.ok) {
      return { actorId, skillId: guard.id, targetId: actorId, reason: `guard-low-hp (${guard.label})` };
    }
  }

  const targets = state.units
    .filter((unit) => unit.alive && unit.team === "alpha")
    .sort((a, b) => a.hp - b.hp || a.id.localeCompare(b.id));
  const target = targets[0];
  if (!target) return null;

  let skillId = basic?.id ?? "basic";
  let reason = "basic-fallback";
  if (special && actor.energy >= special.energyCost && roll < 0.55) {
    skillId = special.id;
    reason = "special-affordable";
  } else if (basic) {
    skillId = basic.id;
    reason = "basic";
  }

  if (!engine.canAct(actorId, skillId, target.id).ok && basic && skillId !== basic.id) {
    skillId = basic.id;
    reason = "special-blocked-basic";
  }
  if (!engine.canAct(actorId, skillId, target.id).ok) return null;
  const chosen = skillOf(manifest, skillId);
  return {
    actorId,
    skillId,
    targetId: target.id,
    reason: `${reason} (${chosen?.label ?? skillId} → ${target.id})`,
  };
}
