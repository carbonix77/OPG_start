import {
  Color3,
  Mesh,
  MeshBuilder,
  StandardMaterial,
  TransformNode,
  type Scene,
} from "@babylonjs/core";

export interface UnitViewSpec {
  id: string;
  label: string;
  team: "alpha" | "bravo";
  kind: "synthetic" | "character";
  position: [number, number, number];
  color?: [number, number, number];
}

/**
 * Presentation registry keyed by unit id.
 * Synthetic figures are generated boxes. Character roots can be attached later.
 */
export class UnitViewRegistry {
  private readonly root: TransformNode;
  private readonly views = new Map<
    string,
    { root: TransformNode; body: Mesh; mat: StandardMaterial; label: string; kind: UnitViewSpec["kind"] }
  >();

  constructor(private readonly scene: Scene) {
    this.root = new TransformNode("battle-units", scene);
  }

  sync(specs: UnitViewSpec[]): void {
    const keep = new Set(specs.map((spec) => spec.id));
    for (const [id, view] of this.views) {
      if (keep.has(id)) continue;
      view.body.dispose(false, true);
      view.mat.dispose();
      view.root.dispose();
      this.views.delete(id);
    }
    for (const spec of specs) {
      let view = this.views.get(spec.id);
      if (!view) {
        const mat = new StandardMaterial(`unit-mat-${spec.id}`, this.scene);
        const color = spec.color ?? (spec.team === "alpha" ? [0.25, 0.55, 0.95] : [0.9, 0.3, 0.22]);
        mat.diffuseColor = new Color3(color[0], color[1], color[2]);
        mat.specularColor = Color3.Black();
        const node = new TransformNode(`unit-${spec.id}`, this.scene);
        node.parent = this.root;
        const body = MeshBuilder.CreateBox(
          `unit-body-${spec.id}`,
          { width: spec.kind === "character" ? 36 : 48, height: spec.kind === "character" ? 100 : 110, depth: 36 },
          this.scene,
        );
        body.material = mat;
        body.parent = node;
        body.position.y = spec.kind === "character" ? 50 : 55;
        view = { root: node, body, mat, label: spec.label, kind: spec.kind };
        this.views.set(spec.id, view);
      }
      view.root.position.set(spec.position[0], spec.position[1], spec.position[2]);
      view.label = spec.label;
      view.kind = spec.kind;
    }
  }

  flash(unitId: string): void {
    const view = this.views.get(unitId);
    if (!view) return;
    const previous = view.mat.diffuseColor.clone();
    view.mat.diffuseColor.set(1, 0.9, 0.25);
    window.setTimeout(() => {
      try {
        view.mat.diffuseColor.copyFrom(previous);
      } catch {
        /* disposed */
      }
    }, 180);
  }

  setAlive(unitId: string, alive: boolean): void {
    const view = this.views.get(unitId);
    if (!view) return;
    view.body.setEnabled(alive);
    view.root.setEnabled(alive);
  }

  attachCharacterRoot(unitId: string, node: TransformNode): void {
    const view = this.views.get(unitId);
    if (!view) return;
    node.parent = view.root;
    node.position.setAll(0);
    view.body.setEnabled(false);
  }

  getRoot(unitId: string): TransformNode | null {
    return this.views.get(unitId)?.root ?? null;
  }

  dispose(): void {
    for (const view of this.views.values()) {
      view.body.dispose(false, true);
      view.mat.dispose();
      view.root.dispose();
    }
    this.views.clear();
    this.root.dispose();
  }
}
