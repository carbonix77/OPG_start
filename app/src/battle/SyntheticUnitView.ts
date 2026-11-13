import {
  Color3,
  Mesh,
  MeshBuilder,
  StandardMaterial,
  TransformNode,
  Vector3,
  type Scene,
} from "@babylonjs/core";

/**
 * Lightweight generated humanoid placeholder for rendered 5v5 feasibility.
 * Uses the same playIdle/playSkill token callbacks as CharacterUnitView.
 * Explicitly synthetic — not a PW4 skinned asset.
 */
export class SyntheticUnitView {
  readonly root: TransformNode;
  private parts: Mesh[] = [];
  private mats: StandardMaterial[] = [];
  private token = 0;
  private timers: number[] = [];
  private disposed = false;
  private slot = new Vector3();
  private team: "alpha" | "bravo" = "alpha";

  constructor(
    readonly unitId: string,
    private readonly scene: Scene,
  ) {
    this.root = new TransformNode(`synthetic-unit-${unitId}`, scene);
  }

  async load(offset: [number, number, number], team: "alpha" | "bravo", labelColor?: Color3): Promise<{ loadMs: number }> {
    this.disposeContent();
    const started = performance.now();
    this.team = team;
    this.slot.set(offset[0], offset[1], offset[2]);
    this.root.position.copyFrom(this.slot);
    this.root.rotation.y = offset[0] < 0 ? Math.PI / 2 : -Math.PI / 2;
    const color = labelColor ?? (team === "alpha" ? new Color3(0.35, 0.55, 0.9) : new Color3(0.9, 0.4, 0.35));
    const mat = new StandardMaterial(`synth-mat-${this.unitId}`, this.scene);
    mat.diffuseColor = color;
    mat.specularColor = Color3.Black();
    this.mats.push(mat);
    const body = MeshBuilder.CreateCapsule(`synth-body-${this.unitId}`, { height: 90, radius: 18 }, this.scene);
    body.material = mat;
    body.parent = this.root;
    body.position.y = 45;
    const head = MeshBuilder.CreateSphere(`synth-head-${this.unitId}`, { diameter: 28 }, this.scene);
    head.material = mat;
    head.parent = this.root;
    head.position.y = 105;
    this.parts.push(body, head);
    return { loadMs: Math.round(performance.now() - started) };
  }

  setShowAllMeshes(_enabled: boolean): void {}

  playIdle(_idleClip: string | null): string {
    this.cancelAction();
    return `Synthetic ${this.unitId} idle pose.`;
  }

  playSkill(
    _idleClip: string | null,
    clipName: string | null,
    contactNormalized: number,
    onContact: (token: number) => void,
    onComplete: (token: number, outcome: "ok" | "missed-contact") => void,
    _options?: { companionClips?: string[]; followClips?: string[] },
  ): { token: number; note: string; mode: "clip" | "missing" } {
    this.cancelAction();
    const token = ++this.token;
    if (!clipName) {
      return { token, mode: "missing", note: `Synthetic ${this.unitId} missing clip.` };
    }
    const totalMs = 480;
    const contactMs = Math.max(40, Math.floor(totalMs * Math.min(1, Math.max(0, contactNormalized))));
    this.timers.push(
      window.setTimeout(() => {
        if (token !== this.token || this.disposed) return;
        onContact(token);
      }, contactMs),
    );
    this.timers.push(
      window.setTimeout(() => {
        if (token !== this.token || this.disposed) return;
        onComplete(token, "ok");
      }, totalMs),
    );
    return { token, mode: "clip", note: `Synthetic ${this.unitId} plays ${clipName} (${this.team}).` };
  }

  cancelAction(): void {
    this.token += 1;
    for (const id of this.timers) window.clearTimeout(id);
    this.timers = [];
  }

  setEnabled(enabled: boolean): void {
    this.root.setEnabled(enabled);
  }

  flash(): void {
    for (const mat of this.mats) {
      mat.emissiveColor = new Color3(0.6, 0.6, 0.2);
    }
    this.timers.push(
      window.setTimeout(() => {
        if (this.disposed) return;
        for (const mat of this.mats) mat.emissiveColor = Color3.Black();
      }, 120),
    );
  }

  playHit(_hitClip: string | null, _idleClip: string | null): void {
    this.flash();
  }

  playDeath(_deathClip: string | null): void {
    // Stay on the field, dimmed — mirrors skinned Death hold.
    for (const mat of this.mats) {
      mat.diffuseColor = new Color3(0.25, 0.25, 0.28);
      mat.emissiveColor = Color3.Black();
    }
  }

  private disposeContent(): void {
    this.cancelAction();
    for (const mesh of this.parts) mesh.dispose(false, true);
    for (const mat of this.mats) mat.dispose();
    this.parts = [];
    this.mats = [];
  }

  dispose(): void {
    this.disposed = true;
    this.disposeContent();
    this.root.dispose();
  }
}
