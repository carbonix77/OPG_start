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
  private rim: Mesh;
  private markers = new Map<string, Mesh>();
  private mats = new Map<string, StandardMaterial>();

  constructor(private readonly scene: Scene) {
    this.root = new TransformNode("battle-arena", scene);
    const floorMat = new StandardMaterial("arena-floor-mat", scene);
    floorMat.diffuseColor = new Color3(0.18, 0.22, 0.28);
    floorMat.specularColor = Color3.Black();
    this.floor = MeshBuilder.CreateGround("arena-floor", { width: 900, height: 600 }, scene);
    this.floor.material = floorMat;
    this.floor.parent = this.root;
    this.floor.position.y = -1;
    const rimMat = new StandardMaterial("arena-rim-mat", scene);
    rimMat.diffuseColor = new Color3(0.08, 0.1, 0.14);
    rimMat.specularColor = Color3.Black();
    this.rim = MeshBuilder.CreateBox("arena-horizon", { width: 1400, height: 400, depth: 20 }, scene);
    this.rim.material = rimMat;
    this.rim.parent = this.root;
    this.rim.position.set(0, 180, -420);
  }

  setSlots(slots: ArenaSlot[]): void {
    for (const marker of this.markers.values()) marker.dispose(false, true);
    for (const mat of this.mats.values()) mat.dispose();
    this.markers.clear();
    this.mats.clear();
    for (const slot of slots) {
      const mat = new StandardMaterial(`arena-slot-${slot.unitId}`, this.scene);
      mat.diffuseColor = slot.team === "alpha" ? new Color3(0.2, 0.45, 0.85) : new Color3(0.85, 0.25, 0.2);
      mat.specularColor = Color3.Black();
      const pad = MeshBuilder.CreateCylinder(`arena-pad-${slot.unitId}`, { diameter: 70, height: 4 }, this.scene);
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
    return new Vector3(0, 70, 0);
  }

  dispose(): void {
    for (const marker of this.markers.values()) marker.dispose(false, true);
    for (const mat of this.mats.values()) mat.dispose();
    this.markers.clear();
    this.mats.clear();
    this.floor.dispose(false, true);
    this.rim.dispose(false, true);
    this.root.dispose();
  }
}

export const TWO_V_TWO_SLOTS: Omit<ArenaSlot, "unitId">[] = [
  { team: "alpha", position: [-220, 0, 110] },
  { team: "alpha", position: [-220, 0, -110] },
  { team: "bravo", position: [220, 0, 110] },
  { team: "bravo", position: [220, 0, -110] },
];
