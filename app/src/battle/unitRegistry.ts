import {
  Color3,
  DynamicTexture,
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
    {
      root: TransformNode;
      body: Mesh;
      mat: StandardMaterial;
      label: string;
      kind: UnitViewSpec["kind"];
      tag: Mesh;
      tagMat: StandardMaterial;
      tagTex: DynamicTexture;
    }
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
      view.tag.dispose(false, true);
      view.tagMat.dispose();
      view.tagTex.dispose();
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
        const tagTex = new DynamicTexture(`unit-tag-tex-${spec.id}`, { width: 256, height: 64 }, this.scene, false);
        tagTex.hasAlpha = true;
        const tagMat = new StandardMaterial(`unit-tag-mat-${spec.id}`, this.scene);
        tagMat.diffuseTexture = tagTex;
        tagMat.emissiveTexture = tagTex;
        tagMat.opacityTexture = tagTex;
        tagMat.specularColor = Color3.Black();
        tagMat.backFaceCulling = false;
        tagMat.disableLighting = true;
        const tag = MeshBuilder.CreatePlane(`unit-tag-${spec.id}`, { width: 90, height: 22 }, this.scene);
        tag.material = tagMat;
        tag.parent = node;
        tag.position.set(0, 4, 0);
        tag.billboardMode = Mesh.BILLBOARDMODE_ALL;
        view = { root: node, body, mat, label: spec.label, kind: spec.kind, tag, tagMat, tagTex };
        this.views.set(spec.id, view);
        this.paintTag(view, spec.label, spec.id);
      }
      view.root.position.set(spec.position[0], spec.position[1], spec.position[2]);
      view.root.rotation.y = spec.position[0] < 0 ? Math.PI / 2 : -Math.PI / 2;
      if (view.label !== spec.label) {
        view.label = spec.label;
        this.paintTag(view, spec.label, spec.id);
      }
      view.kind = spec.kind;
      if (spec.kind === "character") view.body.setEnabled(false);
      view.tag.setEnabled(true);
    }
  }

  private paintTag(
    view: { tagTex: DynamicTexture },
    label: string,
    id: string,
  ): void {
    const ctx = view.tagTex.getContext() as CanvasRenderingContext2D;
    const w = view.tagTex.getSize().width;
    const h = view.tagTex.getSize().height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "rgba(8, 10, 14, 0.72)";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#f4f0e6";
    ctx.font = "bold 28px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`${label} [${id}]`, w / 2, h / 2);
    view.tagTex.update();
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
    view.body.setEnabled(alive && view.kind === "synthetic");
    view.root.setEnabled(alive);
    view.tag.setEnabled(alive);
  }

  /** Hides the placeholder box once a real skinned character occupies the slot. */
  hidePlaceholder(unitId: string): void {
    const view = this.views.get(unitId);
    if (!view) return;
    view.body.setEnabled(false);
    view.tag.setEnabled(true);
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
      view.tag.dispose(false, true);
      view.tagMat.dispose();
      view.tagTex.dispose();
      view.root.dispose();
    }
    this.views.clear();
    this.root.dispose();
  }
}
