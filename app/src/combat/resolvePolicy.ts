import type { CharacterManifest, SkillDef } from "./types";

export type ResolveMode = "instant" | "animate" | "abort";

/**
 * Rendered battles may instant-resolve only for explicitly headless/synthetic units
 * (manifest.assetId == null). Missing skinned views or clips must abort with no contact.
 */
export function resolveModeForAction(
  manifest: CharacterManifest | null | undefined,
  skill: SkillDef | null | undefined,
  hasCharacterView: boolean,
): { mode: ResolveMode; reason: string } {
  if (!manifest || !skill) {
    return { mode: "abort", reason: "Missing manifest or skill." };
  }
  const synthetic = manifest.assetId == null;
  if (!hasCharacterView) {
    if (synthetic) return { mode: "instant", reason: "Synthetic unit without a rendered view." };
    return { mode: "abort", reason: `Skinned unit ${manifest.id} has no character view; aborting without damage.` };
  }
  if (!skill.clipId) {
    if (synthetic) return { mode: "instant", reason: "Synthetic skill has no clip." };
    return { mode: "abort", reason: `Unit ${manifest.id} has no clip for ${skill.id}; aborting without damage.` };
  }
  return { mode: "animate", reason: "Play clip then contact." };
}
