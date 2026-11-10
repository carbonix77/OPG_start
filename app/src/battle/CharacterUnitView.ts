import {
  AnimationGroup,
  Color3,
  Mesh,
  SceneLoader,
  TransformNode,
  Vector3,
  type Observer,
  type Scene,
} from "@babylonjs/core";
import { assetUrl, type LocalAsset } from "../inspector/assets";
import { FOLLOW_NODE_CANDIDATES, type PreviewConfig } from "../inspector/previewConfig";

export interface CharacterLoadResult {
  unitId: string;
  assetId: string;
  clips: string[];
  meshes: number;
  skeletons: number;
  joints: number;
  loadMs: number;
}

/**
 * One imported character instance keyed by battle unit id.
 * Own container, root, clips, and action token. Does not share another unit's skeleton.
 */
export class CharacterUnitView {
  readonly root: TransformNode;
  private container: Awaited<ReturnType<typeof SceneLoader.LoadAssetContainerAsync>> | null = null;
  private groups: AnimationGroup[] = [];
  private follow: TransformNode | null = null;
  private token = 0;
  private contactObserver: Observer<Scene> | null = null;
  private endObserver: Observer<AnimationGroup> | null = null;
  private contactArmed = false;
  private attackClip = "";
  private disposed = false;
  private slot = new Vector3();
  private recenterObserver: Observer<Scene> | null = null;
  assetId = "";

  constructor(
    readonly unitId: string,
    private readonly scene: Scene,
  ) {
    this.root = new TransformNode(`character-unit-${unitId}`, scene);
  }

  async load(asset: LocalAsset, preview: PreviewConfig | null, offset: [number, number, number]): Promise<CharacterLoadResult> {
    this.disposeContent();
    const started = performance.now();
    const { rootUrl, fileName } = assetUrl(asset.relativePath);
    const container = await SceneLoader.LoadAssetContainerAsync(rootUrl, fileName, this.scene);
    if (this.disposed) {
      container.dispose();
      throw new Error("Character unit disposed during load");
    }
    this.container = container;
    this.assetId = asset.id;
    container.addAllToScene();
    for (const mesh of container.meshes) {
      if (!(mesh instanceof Mesh) || mesh.getTotalVertices() <= 0) continue;
      mesh.name = `unit-${this.unitId}-${mesh.name}`;
    }
    const roots = container.rootNodes.length > 0 ? container.rootNodes : [...container.transformNodes, ...container.meshes];
    for (const node of roots) {
      if (!node.parent) node.parent = this.root;
    }
    for (const node of container.transformNodes) {
      if (!node.parent) node.setParent(this.root);
    }
    for (const mesh of container.meshes) {
      if (!mesh.parent) mesh.setParent(this.root);
    }
    const excluded = new Set(preview?.excludedMeshIndices ?? []);
    for (const mesh of container.meshes) {
      if (!(mesh instanceof Mesh)) continue;
      const hit = /(?:Mesh_|submesh_)(\d+)(?:_|$)/.exec(mesh.name);
      const index = hit ? Number(hit[1]) : null;
      if (index !== null && excluded.has(index)) mesh.setEnabled(false);
    }
    this.groups = [...container.animationGroups];
    for (const group of this.groups) {
      group.stop();
      group.speedRatio = 1;
    }
    this.follow = this.findFollow(preview?.followNodes ?? FOLLOW_NODE_CANDIDATES);
    this.slot.set(offset[0], offset[1], offset[2]);
    this.root.position.copyFrom(this.slot);
    // Face the arena center roughly.
    this.root.rotation.y = offset[0] < 0 ? Math.PI / 2 : -Math.PI / 2;
    this.startRecenter();
    this.snapToSlot();
    const joints = container.skeletons.reduce((sum, skeleton) => sum + skeleton.bones.length, 0);
    return {
      unitId: this.unitId,
      assetId: asset.id,
      clips: this.groups.map((group) => group.name),
      meshes: container.meshes.filter((mesh) => mesh instanceof Mesh && mesh.getTotalVertices() > 0).length,
      skeletons: container.skeletons.length,
      joints,
      loadMs: Math.round(performance.now() - started),
    };
  }

  clipNames(): string[] {
    return this.groups.map((group) => group.name);
  }

  hasClip(name: string | null | undefined): boolean {
    return !!name && this.groups.some((group) => group.name === name);
  }

  playIdle(idleClip: string | null): string {
    this.cancelAction();
    if (!idleClip) return `Unit ${this.unitId} has no idle clip.`;
    const idle = this.groups.find((group) => group.name === idleClip);
    if (!idle) return `Unit ${this.unitId} is missing ${idleClip}.`;
    for (const group of this.groups) {
      if (group !== idle) group.stop();
    }
    idle.reset();
    idle.start(true, idle.speedRatio, idle.from, idle.to, false);
    return `Unit ${this.unitId} loops ${idleClip}.`;
  }

  /**
   * Plays one skill on this unit only.
   * Missing clips return mode "missing" so the battle engine can abort without inventing motion.
   */
  playSkill(
    idleClip: string | null,
    clipName: string | null,
    contactNormalized: number,
    onContact: (token: number) => void,
    onComplete: (token: number) => void,
  ): { token: number; note: string; mode: "clip" | "missing" } {
    this.cancelAction();
    const token = ++this.token;
    if (!clipName || !this.hasClip(clipName)) {
      return { token, mode: "missing", note: `Unit ${this.unitId} missing clip ${clipName ?? "(none)"}.` };
    }
    const attack = this.groups.find((group) => group.name === clipName)!;
    const idle = idleClip ? this.groups.find((group) => group.name === idleClip) : null;
    this.attackClip = clipName;
    this.contactArmed = true;
    for (const group of this.groups) {
      if (group !== attack) group.stop();
    }
    attack.reset();
    attack.play(false);
    this.contactObserver = this.scene.onBeforeRenderObservable.add(() => {
      if (!this.contactArmed || token !== this.token) return;
      this.applyRecenter();
      const frame = attack.animatables[0]?.masterFrame ?? attack.from;
      const normalized = Math.min(1, Math.max(0, (frame - attack.from) / Math.max(0.001, attack.to - attack.from)));
      if (normalized + 1e-4 >= contactNormalized || normalized >= 0.999) {
        this.contactArmed = false;
        onContact(token);
      }
    });
    this.endObserver = attack.onAnimationGroupEndObservable.add(() => {
      if (token !== this.token) return;
      this.clearObservers();
      if (idle) {
        idle.reset();
        idle.start(true, idle.speedRatio, idle.from, idle.to, false);
      }
      onComplete(token);
    });
    return {
      token,
      mode: "clip",
      note: `Unit ${this.unitId} plays ${clipName}; contact at ${contactNormalized}.`,
    };
  }

  cancelAction(): void {
    this.token += 1;
    this.clearObservers();
    for (const group of this.groups) group.stop();
  }

  setEnabled(enabled: boolean): void {
    this.root.setEnabled(enabled);
  }

  flash(): void {
    for (const mesh of this.root.getChildMeshes(false)) {
      if (!(mesh instanceof Mesh) || !mesh.material) continue;
      const material = mesh.material as { emissiveColor?: Color3 };
      if (!material.emissiveColor) continue;
      const previous = material.emissiveColor.clone();
      material.emissiveColor = new Color3(0.45, 0.35, 0.05);
      window.setTimeout(() => {
        try {
          material.emissiveColor = previous;
        } catch {
          /* disposed */
        }
      }, 180);
      break;
    }
  }

  dispose(): void {
    this.disposed = true;
    this.disposeContent();
    if (!this.root.isDisposed()) this.root.dispose();
  }

  private disposeContent(): void {
    this.cancelAction();
    this.stopRecenter();
    this.follow = null;
    this.groups = [];
    if (this.container) {
      this.container.removeAllFromScene();
      this.container.dispose();
      this.container = null;
    }
    this.assetId = "";
  }

  private clearObservers(): void {
    if (this.contactObserver) {
      this.scene.onBeforeRenderObservable.remove(this.contactObserver);
      this.contactObserver = null;
    }
    if (this.endObserver) {
      const attack = this.groups.find((group) => group.name === this.attackClip);
      attack?.onAnimationGroupEndObservable.remove(this.endObserver);
      this.endObserver = null;
    }
    this.contactArmed = false;
  }

  private findFollow(names: string[]): TransformNode | null {
    const nodes = this.root.getChildTransformNodes(true);
    for (const name of names) {
      const hit = nodes.find((node) => node.name === name);
      if (hit) return hit;
    }
    return null;
  }

  private startRecenter(): void {
    this.stopRecenter();
    this.recenterObserver = this.scene.onBeforeRenderObservable.add(() => {
      this.applyRecenter();
    });
  }

  private stopRecenter(): void {
    if (!this.recenterObserver) return;
    this.scene.onBeforeRenderObservable.remove(this.recenterObserver);
    this.recenterObserver = null;
  }

  private snapToSlot(): void {
    for (let pass = 0; pass < 4; pass += 1) this.applyRecenter();
  }

  /** Keeps this unit near its slot on X/Z without editing clip keys. */
  private applyRecenter(): void {
    if (!this.follow) return;
    this.follow.computeWorldMatrix(true);
    const world = this.follow.getAbsolutePosition();
    this.root.position.x += this.slot.x - world.x;
    this.root.position.z += this.slot.z - world.z;
  }
}

export function measureHeapMb(): number | null {
  const memory = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
  return memory ? Math.round(memory.usedJSHeapSize / 1048576) : null;
}

export function arenaFocus(cameraTarget: Vector3, _units: CharacterUnitView[]): Vector3 {
  return cameraTarget;
}
