import {
  ArcRotateCamera,
  Color3,
  Color4,
  DirectionalLight,
  Engine,
  HemisphericLight,
  Mesh,
  MeshBuilder,
  Scene,
  SceneLoader,
  SkeletonViewer,
  TransformNode,
  Vector3,
  type AbstractMesh,
  type AnimationGroup,
} from "@babylonjs/core";
import "@babylonjs/loaders/glTF";
import { assetUrl, type LocalAsset } from "./assets";
import { applyTemporaryLook, type TemporaryLook, type TextureNote } from "./textures";

export interface MeshRow {
  name: string;
  enabled: boolean;
  vertices: number;
}

export interface ClipRow {
  name: string;
  from: number;
  to: number;
  seconds: number;
}

export interface MeshSample {
  name: string;
  vertices: number;
  /** How far the mesh center moves relative to the follow node. Root motion is removed. */
  travel: number;
  /** How far the mesh center moves in world space. Includes root motion. */
  worldTravel: number;
  offsetAt: Array<{ t: number; x: number; y: number; z: number }>;
}

export interface SceneFacts {
  assetId: string;
  meshes: number;
  materials: number;
  skeletons: number;
  joints: number;
  followNode: string;
  clips: ClipRow[];
  meshRows: MeshRow[];
  error: string;
}

const SAMPLE_TIMES = [0, 0.35, 0.65, 1];

const VIEWS: Record<string, { alpha: number; beta: number }> = {
  front: { alpha: Math.PI / 2, beta: 1.15 },
  back: { alpha: -Math.PI / 2, beta: 1.15 },
  left: { alpha: Math.PI, beta: 1.15 },
  right: { alpha: 0, beta: 1.15 },
  three: { alpha: Math.PI / 2 + 0.65, beta: 1.05 },
};

export interface MeshCard {
  name: string;
  vertices: number;
  material: string;
  longest: number;
  size: [number, number, number];
  center: [number, number, number];
  headVerts: number;
}

export class InspectorScene {
  readonly engine: Engine;
  readonly scene: Scene;
  readonly camera: ArcRotateCamera;
  private groups: AnimationGroup[] = [];
  private viewer: SkeletonViewer | null = null;
  private follow = false;
  private followNode: TransformNode | null = null;
  private assetId = "";
  private loadToken = 0;
  private temporary: TemporaryLook | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.engine = new Engine(canvas, true, { preserveDrawingBuffer: true });
    this.scene = new Scene(this.engine);
    this.scene.clearColor = new Color4(0.12, 0.13, 0.15, 1);
    this.camera = new ArcRotateCamera("orbit", -Math.PI / 2, 1.15, 6, new Vector3(0, 1.4, 0), this.scene);
    this.camera.attachControl(canvas, true);
    this.camera.lowerRadiusLimit = 1;
    this.camera.upperRadiusLimit = 8000;
    this.camera.wheelPrecision = 2;
    const fill = new HemisphericLight("fill", new Vector3(0, 1, 0), this.scene);
    fill.intensity = 0.7;
    const sun = new DirectionalLight("sun", new Vector3(-0.4, -1, 0.3), this.scene);
    sun.intensity = 0.8;
    const ground = MeshBuilder.CreateGround("ground", { width: 4000, height: 4000 }, this.scene);
    ground.position.y = 0;
    const mat = ground.material;
    if (mat) {
      mat.alpha = 1;
    }
    ground.receiveShadows = false;
    this.engine.runRenderLoop(() => {
      if (this.follow && this.followNode) {
        const p = this.followNode.getAbsolutePosition();
        this.camera.target.copyFrom(p);
      }
      this.scene.render();
    });
  }

  async load(asset: LocalAsset): Promise<SceneFacts> {
    const token = ++this.loadToken;
    this.stop();
    this.disposeLoaded();
    this.assetId = asset.id;
    const { rootUrl, fileName } = assetUrl(asset.relativePath);
    try {
      const result = await SceneLoader.AppendAsync(rootUrl, fileName, this.scene);
      if (token !== this.loadToken) {
        this.disposeImport(result);
        return this.facts("cancelled");
      }
      this.groups = result.animationGroups;
      for (const group of [...this.scene.animationGroups]) {
        if (!this.groups.includes(group)) group.dispose();
      }
      for (const group of this.groups) {
        group.stop();
        group.speedRatio = 1;
      }
      this.followNode = this.findFollowNode();
      this.frameCamera();
      return this.facts("");
    } catch (error) {
      if (token !== this.loadToken) return this.facts("cancelled");
      const message = error instanceof Error ? error.message : String(error);
      return this.facts(message);
    }
  }

  facts(error: string): SceneFacts {
    const skeleton = this.scene.skeletons[0];
    return {
      assetId: this.assetId,
      meshes: this.bodyMeshes().length,
      materials: this.scene.materials.filter((material) => material.name !== "default material").length,
      skeletons: this.scene.skeletons.length,
      joints: skeleton ? skeleton.bones.length : 0,
      followNode: this.followNode?.name ?? "(none)",
      clips: this.groups.map((group) => ({
        name: group.name,
        from: group.from,
        to: group.to,
        seconds: this.seconds(group),
      })),
      meshRows: this.bodyMeshes().map((mesh) => ({
        name: mesh.name,
        enabled: mesh.isEnabled(),
        vertices: mesh.getTotalVertices(),
      })),
      error,
    };
  }

  clips(): AnimationGroup[] {
    return this.groups;
  }

  play(name: string, loop: boolean): void {
    const group = this.groups.find((item) => item.name === name);
    if (!group) return;
    for (const other of this.groups) {
      if (other !== group) other.stop();
    }
    group.play(loop);
  }

  pause(): void {
    for (const group of this.groups) group.pause();
  }

  setSpeed(speed: number): void {
    for (const group of this.groups) group.speedRatio = speed;
  }

  scrub(name: string, normalized: number): void {
    const group = this.groups.find((item) => item.name === name);
    if (!group) return;
    this.hold(group);
    const frame = group.from + clamp01(normalized) * (group.to - group.from);
    group.goToFrame(frame);
    this.scene.render();
  }

  /** Stops clips and puts joints back on the bind pose. This is not a verified idle. */
  showBindPose(): void {
    for (const group of this.groups) {
      if (group.isStarted) {
        group.reset();
        group.stop();
      }
    }
    for (const skeleton of this.scene.skeletons) skeleton.returnToRest();
    this.refreshBodyBounds();
    if (!this.follow) this.frameCamera();
    this.scene.render();
  }

  setFollow(enabled: boolean): void {
    this.follow = enabled;
    if (!enabled) this.frameCamera();
  }

  setSkeletonVisible(enabled: boolean): void {
    this.viewer?.dispose();
    this.viewer = null;
    if (!enabled || this.scene.skeletons.length === 0) return;
    this.viewer = new SkeletonViewer(this.scene.skeletons[0], this.bodyMeshes()[0] ?? null, this.scene, false, 0);
    this.viewer.color = Color3.FromHexString("#7CFFB2");
    this.viewer.isEnabled = true;
  }

  setMeshEnabled(name: string, enabled: boolean): void {
    const mesh = this.scene.getMeshByName(name);
    if (mesh) mesh.setEnabled(enabled);
  }

  /** null shows every loaded mesh again. A list shows only those meshes. */
  setVisibleMeshes(names: string[] | null): void {
    const allow = names ? new Set(names) : null;
    for (const mesh of this.bodyMeshes()) mesh.setEnabled(allow === null || allow.has(mesh.name));
  }

  /**
   * Frames the character, then orbits to a named side.
   * Turns camera follow off so the orbit stays put.
   */
  setView(view: string): void {
    this.follow = false;
    this.frameCamera();
    const preset = VIEWS[view] ?? VIEWS.front;
    this.camera.alpha = preset.alpha;
    this.camera.beta = preset.beta;
    this.scene.render();
  }

  /** Reconstructed albedo/normal assignment. Restores the loaded materials when disabled. */
  async setTemporaryTextures(enabled: boolean): Promise<TextureNote[]> {
    this.temporary?.restore();
    this.temporary = null;
    if (!enabled) return [];
    this.temporary = await applyTemporaryLook(this.scene, this.bodyMeshes());
    return this.temporary.notes;
  }

  /** Bounds and how many skinned vertices sit in the head box. Does not hide meshes. */
  meshCards(): MeshCard[] {
    const origin = this.followNode?.getAbsolutePosition() ?? Vector3.Zero();
    return this.bodyMeshes().map((mesh) => {
      mesh.computeWorldMatrix(true);
      mesh.refreshBoundingInfo(true, false);
      const box = mesh.getBoundingInfo().boundingBox;
      const size = box.maximumWorld.subtract(box.minimumWorld);
      const center = box.centerWorld.subtract(origin);
      const positions = mesh.getPositionData(true, false);
      const world = mesh.getWorldMatrix();
      let headVerts = 0;
      if (positions) {
        const point = new Vector3();
        for (let i = 0; i < positions.length; i += 3) {
          Vector3.TransformCoordinatesFromFloatsToRef(positions[i], positions[i + 1], positions[i + 2], world, point);
          const x = point.x - origin.x;
          const y = point.y - origin.y;
          const z = point.z - origin.z;
          if (y > 52 && y < 78 && Math.abs(x) < 18 && z > 8 && z < 45) headVerts += 1;
        }
      }
      return {
        name: mesh.name,
        vertices: mesh.getTotalVertices(),
        material: mesh.material?.name ?? "",
        longest: round(Math.max(size.x, size.y, size.z)),
        size: [round(size.x), round(size.y), round(size.z)],
        center: [round(center.x), round(center.y), round(center.z)],
        headVerts,
      };
    });
  }

  /** World travel of each mesh, and its offset from the follow node. Does not hide anything. */
  sampleMeshTravel(clipName: string): MeshSample[] {
    const group = this.groups.find((item) => item.name === clipName);
    if (!group || !this.followNode) return [];
    const meshes = this.bodyMeshes();
    const rows = new Map<string, MeshSample>();
    for (const mesh of meshes) {
      rows.set(mesh.name, { name: mesh.name, vertices: mesh.getTotalVertices(), travel: 0, worldTravel: 0, offsetAt: [] });
    }
    const centers = new Map<string, Vector3>();
    const offsets = new Map<string, Vector3>();
    this.hold(group);
    for (const t of SAMPLE_TIMES) {
      group.goToFrame(group.from + t * (group.to - group.from));
      this.scene.render();
      const origin = this.followNode.getAbsolutePosition();
      for (const mesh of meshes) {
        mesh.refreshBoundingInfo(true, false);
        const center = mesh.getBoundingInfo().boundingBox.centerWorld.clone();
        const offset = center.subtract(origin);
        const row = rows.get(mesh.name);
        if (!row) continue;
        row.offsetAt.push({
          t,
          x: round(offset.x),
          y: round(offset.y),
          z: round(offset.z),
        });
        const previous = centers.get(mesh.name);
        const previousOffset = offsets.get(mesh.name);
        if (previous) row.worldTravel = round(Math.max(row.worldTravel, Vector3.Distance(previous, center)));
        if (previousOffset) row.travel = round(Math.max(row.travel, Vector3.Distance(previousOffset, offset)));
        centers.set(mesh.name, center);
        offsets.set(mesh.name, offset.clone());
      }
    }
    group.goToFrame(group.from);
    return [...rows.values()].sort((a, b) => b.travel - a.travel);
  }

  resize(): void {
    this.engine.resize();
  }

  dispose(): void {
    this.viewer?.dispose();
    this.engine.stopRenderLoop();
    this.scene.dispose();
    this.engine.dispose();
  }

  /** Babylon ignores goToFrame until the group has been started. */
  private hold(group: AnimationGroup): void {
    for (const other of this.groups) {
      if (other !== group && other.isStarted) other.stop();
    }
    if (!group.isStarted) group.start(false, group.speedRatio, group.from, group.to, false);
    group.pause();
  }

  private seconds(group: AnimationGroup): number {
    const fps = group.targetedAnimations[0]?.animation.framePerSecond || 60;
    return (group.to - group.from) / fps;
  }

  private findFollowNode(): TransformNode | null {
    return (
      this.scene.getTransformNodeByName("SK_Skeleton") ??
      this.scene.getTransformNodeByName("bone_1") ??
      this.scene.getTransformNodeByName("bone_0")
    );
  }

  private bodyMeshes(): Mesh[] {
    return this.scene.meshes.filter((mesh): mesh is Mesh => mesh instanceof Mesh && mesh.name !== "ground" && mesh.getTotalVertices() > 0);
  }

  private frameCamera(): void {
    this.refreshBodyBounds();
    const origin = this.followNode?.getAbsolutePosition() ?? null;
    const bounds = (nearOnly: boolean) => {
      let min = new Vector3(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);
      let max = new Vector3(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY);
      for (const mesh of this.bodyMeshes()) {
        if (!mesh.isEnabled()) continue;
        const box = mesh.getBoundingInfo().boundingBox;
        if (nearOnly && origin && Vector3.Distance(box.centerWorld, origin) > 250) continue;
        min = Vector3.Minimize(min, box.minimumWorld);
        max = Vector3.Maximize(max, box.maximumWorld);
      }
      return { min, max };
    };
    let { min, max } = bounds(true);
    if (!Number.isFinite(min.x)) ({ min, max } = bounds(false));
    if (!Number.isFinite(min.x)) return;
    const center = min.add(max).scale(0.5);
    const size = max.subtract(min).length();
    this.camera.target.copyFrom(center);
    this.camera.radius = Math.max(2, size * 1.4);
    this.camera.alpha = Math.PI / 2;
    this.camera.beta = 1.15;
  }

  private refreshBodyBounds(): void {
    for (const mesh of this.bodyMeshes()) {
      mesh.computeWorldMatrix(true);
      mesh.refreshBoundingInfo(true, false);
    }
  }

  private disposeImport(result: { animationGroups: AnimationGroup[]; meshes: AbstractMesh[]; skeletons: { dispose: () => void }[]; transformNodes: TransformNode[] }): void {
    for (const group of result.animationGroups) group.dispose();
    for (const mesh of result.meshes) mesh.dispose(false, true);
    for (const skeleton of result.skeletons) skeleton.dispose();
    for (const node of result.transformNodes) node.dispose();
  }

  private disposeLoaded(): void {
    this.temporary?.restore();
    this.temporary = null;
    this.viewer?.dispose();
    this.viewer = null;
    this.followNode = null;
    for (const group of [...this.scene.animationGroups]) group.dispose();
    this.groups = [];
    const keep = new Set<AbstractMesh>();
    const ground = this.scene.getMeshByName("ground");
    if (ground) keep.add(ground);
    for (const mesh of [...this.scene.meshes]) {
      if (!keep.has(mesh)) mesh.dispose(false, true);
    }
    for (const skeleton of [...this.scene.skeletons]) skeleton.dispose();
    for (const material of [...this.scene.materials]) {
      if (material.name !== "default material") material.dispose();
    }
    for (const node of [...this.scene.transformNodes]) node.dispose();
  }

  private stop(): void {
    for (const group of this.groups) group.stop();
  }
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
