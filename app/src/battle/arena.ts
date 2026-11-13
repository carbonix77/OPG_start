import {
  Color3,
  Mesh,
  MeshBuilder,
  StandardMaterial,
  TransformNode,
  Vector3,
  type Scene,
} from "@babylonjs/core";

export interface ArenaSlot {
  unitId: string;
  team: "alpha" | "bravo";
  position: [number, number, number];
}

/** Lightweight generated arena. Not a game stage. */
export class BattleArena {
  readonly root: TransformNode;
  private floor: Mesh;
  private backdrop: Mesh;
  private markers = new Map<string, Mesh>();
  private mats = new Map<string, StandardMaterial>();

  constructor(private readonly scene: Scene) {
    this.root = new TransformNode("battle-arena", scene);
    const floorMat = new StandardMaterial("arena-floor-mat", scene);
    floorMat.diffuseColor = new Color3(0.2, 0.24, 0.3);
    floorMat.specularColor = Color3.Black();
    this.floor = MeshBuilder.CreateGround("arena-floor", { width: 1200, height: 900 }, scene);
    this.floor.material = floorMat;
    this.floor.parent = this.root;
    this.floor.position.y = -1;
    // Match scene clear color — avoids the black diagonal wedge in captures.
    const backMat = new StandardMaterial("arena-back-mat", scene);
    backMat.diffuseColor = new Color3(0.12, 0.13, 0.15);
    backMat.specularColor = Color3.Black();
    backMat.emissiveColor = new Color3(0.05, 0.055, 0.06);
    this.backdrop = MeshBuilder.CreatePlane("arena-backdrop", { width: 2000, height: 900 }, scene);
    this.backdrop.material = backMat;
    this.backdrop.parent = this.root;
    this.backdrop.position.set(0, 200, -650);
  }

  setSlots(slots: ArenaSlot[]): void {
    for (const marker of this.markers.values()) marker.dispose(false, true);
    for (const mat of this.mats.values()) mat.dispose();
    this.markers.clear();
    this.mats.clear();
    const padSize = slots.length > 4 ? 48 : 70;
    for (const slot of slots) {
      const mat = new StandardMaterial(`arena-slot-${slot.unitId}`, this.scene);
      mat.diffuseColor = slot.team === "alpha" ? new Color3(0.2, 0.45, 0.85) : new Color3(0.85, 0.25, 0.2);
      mat.specularColor = Color3.Black();
      const pad = MeshBuilder.CreateCylinder(`arena-pad-${slot.unitId}`, { diameter: padSize, height: 4 }, this.scene);
      pad.material = mat;
      pad.parent = this.root;
      pad.position.set(slot.position[0], 1, slot.position[2]);
      this.markers.set(slot.unitId, pad);
      this.mats.set(slot.unitId, mat);
    }
  }

  highlight(unitId: string | null): void {
    for (const [id, mat] of this.mats) {
      const selected = id === unitId;
      mat.emissiveColor = selected ? new Color3(0.35, 0.35, 0.1) : Color3.Black();
    }
  }

  cameraTarget(): Vector3 {
    return new Vector3(0, 50, 0);
  }

  dispose(): void {
    for (const marker of this.markers.values()) marker.dispose(false, true);
    for (const mat of this.mats.values()) mat.dispose();
    this.markers.clear();
    this.mats.clear();
    this.floor.dispose(false, true);
    this.backdrop.dispose(false, true);
    this.root.dispose();
  }
}

export const TWO_V_TWO_SLOTS: Omit<ArenaSlot, "unitId">[] = [
  { team: "alpha", position: [-220, 0, 110] },
  { team: "alpha", position: [-220, 0, -110] },
  { team: "bravo", position: [220, 0, 110] },
  { team: "bravo", position: [220, 0, -110] },
];

/**
 * Unique non-overlapping pads for 1–5 units per team (alpha −X, bravo +X).
 * Used by 2v2 and the rendered synthetic 5v5 feasibility mode.
 */
export function slotsForLineup(units: Array<{ id: string; team: "alpha" | "bravo" }>): ArenaSlot[] {
  const alpha = units.filter((unit) => unit.team === "alpha");
  const bravo = units.filter((unit) => unit.team === "bravo");
  const placed = new Map<string, ArenaSlot>();
  const placeTeam = (members: typeof units, team: "alpha" | "bravo") => {
    const x = team === "alpha" ? -260 : 260;
    const n = members.length;
    const span = n <= 2 ? 110 : n <= 3 ? 160 : 220;
    members.forEach((unit, index) => {
      const z = n <= 1 ? 0 : -span + (index * (2 * span)) / Math.max(1, n - 1);
      const xJitter = n > 3 && index % 2 === 1 ? (team === "alpha" ? -40 : 40) : 0;
      placed.set(unit.id, {
        unitId: unit.id,
        team,
        position: [x + xJitter, 0, z],
      });
    });
  };
  placeTeam(alpha, "alpha");
  placeTeam(bravo, "bravo");
  return units.map((unit) => placed.get(unit.id)!);
}
