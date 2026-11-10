import {
  ArcRotateCamera,
  Color3,
  Color4,
  DirectionalLight,
  Engine,
  HemisphericLight,
  Mesh,
  MeshBuilder,
  PBRMaterial,
  Scene,
  SceneLoader,
  SkeletonViewer,
  StandardMaterial,
  Texture,
  TransformNode,
  Vector3,
  type AbstractMesh,
  type AnimationGroup,
  type Material,
  type Observer,
} from "@babylonjs/core";
import "@babylonjs/loaders/glTF";
import { assetUrl, fileUrl, type LocalAsset } from "./assets";
import { FOLLOW_NODE_CANDIDATES, meshIndexOf, type PreviewConfig } from "./previewConfig";
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

export type VisibilityPreset = "all" | "hide-static" | "stacks";

export interface HandoffRow {
  clip: string;
  /** Seconds before the attack end, or after the idle start. */
  edgeSeconds: number;
  normalized: number;
  rootLocal: [number, number, number];
  rootWorld: [number, number, number];
  /** Pose bone position minus the follow node, after recenter. */
  poseOffset: [number, number, number] | null;
}

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
  private readonly previewRoot: TransformNode;
  private recenter = false;
  private tight = false;
  private framePhase: "idle" | "attack" = "idle";
  private attackEnd: Observer<AnimationGroup> | null = null;
  private attackClip = "";
  private preview: PreviewConfig | null = null;
  private visibility: VisibilityPreset = "all";
  private shotRadius: number | null = null;
  private shotOffset: Vector3 | null = null;
  private readonly sun: DirectionalLight;
  private readonly rim: DirectionalLight;
  private readonly ground: Mesh;
  private readonly groundMat: StandardMaterial;
  private mouthPreview: { mesh: Mesh; previous: Material | null; material: PBRMaterial; texture: Texture } | null = null;
  private sheetTest: { mesh: Mesh; previous: Material | null; material: PBRMaterial; texture: Texture } | null = null;

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
    this.sun = new DirectionalLight("sun", new Vector3(-0.4, -1, 0.3), this.scene);
    this.sun.intensity = 0.8;
    this.rim = new DirectionalLight("rim", new Vector3(0.7, -0.35, 0.6), this.scene);
    this.rim.intensity = 0;
    this.ground = MeshBuilder.CreateGround("ground", { width: 4000, height: 4000 }, this.scene);
    this.ground.position.y = 0;
    this.groundMat = new StandardMaterial("ground-mat", this.scene);
    this.groundMat.diffuseColor = new Color3(0.16, 0.17, 0.19);
    this.groundMat.specularColor = Color3.Black();
    this.ground.material = this.groundMat;
    this.ground.receiveShadows = false;
    this.previewRoot = new TransformNode("previewRoot", this.scene);
    this.engine.runRenderLoop(() => {
      this.applyRecenter();
      if (this.visibility === "stacks") this.applyStackVisibility();
      if (this.follow && this.followNode) {
        if (this.tight) this.aimPreview();
        else this.camera.target.copyFrom(this.followNode.getAbsolutePosition());
      }
      this.scene.render();
    });
  }

  setPreviewConfig(config: PreviewConfig): void {
    this.preview = config;
  }

  currentPreview(): PreviewConfig | null {
    return this.preview;
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
      this.attachPreviewRoot(result.transformNodes, result.meshes);
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
    this.clearAttackEnd();
    this.shotRadius = null;
    this.shotOffset = null;
    for (const other of this.groups) {
      if (other !== group) other.stop();
    }
    group.play(loop);
  }

  /**
   * Loops the configured idle clip on the skeleton already in this file.
   * Provisional preview idle. Does not retarget another file's clip.
   */
  playProvisionalIdle(config: PreviewConfig): string {
    const idle = this.groups.find((item) => item.name === config.idleClip);
    if (!idle) return `This file has no ${config.idleClip}. The clip is not copied onto another skeleton.`;
    this.clearAttackEnd();
    this.framePhase = "idle";
    this.armPreview(config);
    for (const other of this.groups) {
      if (other !== idle) other.stop();
    }
    idle.play(true);
    return `${config.idleClip} is looping on this file's skeleton. Provisional preview idle, not a verified idle.`;
  }

  /**
   * Plays the configured attack once, then loops the configured idle.
   * Both clips must already be in this file.
   */
  playAttackThenIdle(config: PreviewConfig): string {
    const idle = this.groups.find((item) => item.name === config.idleClip);
    const attack = this.groups.find((item) => item.name === config.attackClip);
    if (!idle || !attack) return `Needs ${config.idleClip} and ${config.attackClip} in this file. Clips are not retargeted.`;
    this.clearAttackEnd();
    this.attackClip = config.attackClip;
    this.framePhase = "attack";
    this.armPreview(config);
    for (const other of this.groups) {
      if (other !== attack) other.stop();
    }
    attack.reset();
    attack.play(false);
    this.attackEnd = attack.onAnimationGroupEndObservable.add(() => {
      this.clearAttackEnd();
      if (!this.groups.includes(idle)) return;
      this.framePhase = "idle";
      this.blendToIdle(attack, idle, config.blendSeconds);
    });
    return `${config.attackClip} plays once on this skeleton, then ${config.idleClip} loops. The clip keys are unchanged.`;
  }

  /** Leaves the preview frame and shows every mesh again. */
  stopPreview(): void {
    this.clearAttackEnd();
    this.tight = false;
    this.follow = false;
    this.shotRadius = null;
    this.setVisibilityPreset("all");
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
    this.clearAttackEnd();
    this.shotRadius = null;
    this.shotOffset = null;
    this.hold(group);
    const frame = group.from + clamp01(normalized) * (group.to - group.from);
    group.goToFrame(frame);
    this.scene.render();
  }

  /** Stops clips and puts joints back on the bind pose. This is not a verified idle. */
  showBindPose(): void {
    this.clearAttackEnd();
    this.tight = false;
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

  /**
   * Cancels the follow node's world X/Z in a preview parent.
   * The clip keys are not changed. Vertical motion stays.
   */
  setRecenter(enabled: boolean): void {
    this.recenter = enabled;
    if (!enabled) this.previewRoot.position.setAll(0);
  }

  /**
   * Puts one sheet on one mesh. Other meshes keep the temporary map.
   * Passing an empty sheet restores that mesh.
   */
  setMeshSheet(meshIndex: number, sheet: string, textureDir: string): string {
    this.clearMouthPreview();
    this.clearSheetTest();
    if (!sheet) return "";
    const mesh = this.meshByIndex(meshIndex);
    if (!(mesh instanceof Mesh)) return `Mesh ${meshIndex} is not loaded`;
    const source = mesh.material?.name ?? "(none)";
    const texture = new Texture(fileUrl(`${textureDir}/${sheet}.png`), this.scene, false, false);
    texture.gammaSpace = true;
    const material = new PBRMaterial(`sheet-test-${meshIndex}`, this.scene);
    material.albedoTexture = texture;
    material.metallic = 0;
    material.roughness = 0.85;
    material.backFaceCulling = false;
    material.twoSidedLighting = true;
    this.sheetTest = { mesh, previous: mesh.material, material, texture };
    mesh.material = material;
    return `Mesh ${meshIndex} uses ${source}. Test sheet ${sheet} is on this mesh only. The map is unchanged.`;
  }

  /**
   * Crops one existing sheet onto the configured mouth mesh.
   * The crop is a preview stand-in. It is not an original UV assignment.
   */
  setMouthPreview(enabled: boolean, config?: PreviewConfig): string {
    this.clearMouthPreview();
    if (config) this.preview = config;
    const blade = this.preview?.mouthBlade;
    const meshIndex = this.preview?.mouthMeshIndex;
    if (!enabled || !blade || meshIndex === null || meshIndex === undefined || !this.preview) return "";
    this.clearSheetTest();
    const mesh = this.meshByIndex(meshIndex);
    if (!(mesh instanceof Mesh)) return `Mesh ${meshIndex} is not loaded`;
    const texture = new Texture(fileUrl(`${this.preview.textureDir}/${blade.sheet}.png`), this.scene, false, false);
    texture.gammaSpace = true;
    texture.uScale = blade.uScale;
    texture.vScale = blade.vScale;
    texture.uOffset = blade.uOffset;
    texture.vOffset = blade.vOffset;
    const material = new PBRMaterial(`preview-blade-${meshIndex}`, this.scene);
    material.albedoTexture = texture;
    material.metallic = blade.metallic;
    material.roughness = blade.roughness;
    material.backFaceCulling = false;
    material.twoSidedLighting = true;
    this.mouthPreview = { mesh, previous: mesh.material, material, texture };
    mesh.material = material;
    return `Mesh ${meshIndex} uses a cropped ${blade.sheet} sample. This is not an original atlas.`;
  }

  /**
   * Diagnostic visibility. Show all is the default. Nothing is saved.
   * "stacks" hides lower-vertex shells only while their centers stay within the configured distance.
   */
  setVisibilityPreset(preset: VisibilityPreset, config?: PreviewConfig): void {
    if (config) this.preview = config;
    this.visibility = preset;
    if (preset === "all") {
      this.setVisibleMeshes(null);
      return;
    }
    if (preset === "hide-static") {
      const hidden = new Set(this.preview?.staticMeshIndices ?? []);
      this.setVisibleMeshes(this.bodyMeshes().map((mesh) => mesh.name).filter((name) => !hidden.has(meshIndexOf(name) ?? -1)));
      return;
    }
    this.applyStackVisibility();
  }

  /** Preview lighting from the character config. Off restores the flat inspection lights. */
  setStage(enabled: boolean, config?: PreviewConfig): void {
    if (config) this.preview = config;
    const stage = this.preview?.stage;
    if (!enabled || !stage) {
      this.scene.clearColor.set(0.12, 0.13, 0.15, 1);
      this.groundMat.diffuseColor.set(0.16, 0.17, 0.19);
      this.sun.intensity = 0.8;
      this.sun.direction.set(-0.4, -1, 0.3);
      this.rim.intensity = 0;
      this.ground.scaling.set(1, 1, 1);
      return;
    }
    this.ground.scaling.set(12, 1, 12);
    this.scene.clearColor.set(stage.clear[0], stage.clear[1], stage.clear[2], 1);
    this.groundMat.diffuseColor.set(stage.ground[0], stage.ground[1], stage.ground[2]);
    this.sun.intensity = stage.keyIntensity;
    this.sun.direction.set(stage.keyDirection[0], stage.keyDirection[1], stage.keyDirection[2]);
    this.rim.intensity = stage.rimIntensity;
    this.rim.direction.set(stage.rimDirection[0], stage.rimDirection[1], stage.rimDirection[2]);
  }

  /** Holds one configured shot. The radius stays until the next scrub or play. */
  showShot(config: PreviewConfig, shotId: string): string {
    const shot = config.shots.find((item) => item.id === shotId);
    if (!shot) return "That shot is not in the preview config.";
    const clip = shot.clip === "attack" ? config.attackClip : config.idleClip;
    if (!this.groups.some((group) => group.name === clip)) return `This file has no ${clip}.`;
    this.preview = config;
    this.framePhase = shot.clip;
    this.scrub(clip, shot.normalized);
    this.follow = true;
    this.tight = true;
    this.shotRadius = shot.radius;
    this.shotOffset = new Vector3(shot.targetOffset[0], shot.targetOffset[1], shot.targetOffset[2]);
    this.camera.alpha = shot.alpha;
    this.camera.beta = shot.beta;
    this.aimPreview();
    return shot.label;
  }

  /**
   * Root and pose at the end of the attack and the start of the idle.
   * Calls the recenter path directly. Does not edit clip keys.
   */
  sampleHandoff(config: PreviewConfig, recenter: boolean): HandoffRow[] {
    const attack = this.groups.find((item) => item.name === config.attackClip);
    const idle = this.groups.find((item) => item.name === config.idleClip);
    if (!attack || !idle || !this.followNode) return [];
    const previous = this.recenter;
    this.recenter = recenter;
    this.preview = config;
    const rows: HandoffRow[] = [];
    const steps = [0.3, 0.2, 0.1, 0];
    for (const edge of steps) rows.push(this.handoffRow(attack, config.attackClip, edge, false));
    for (const edge of [...steps].reverse()) rows.push(this.handoffRow(idle, config.idleClip, edge, true));
    this.recenter = previous;
    if (!previous) this.previewRoot.position.setAll(0);
    return rows;
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
  async setTemporaryTextures(enabled: boolean, config?: PreviewConfig): Promise<TextureNote[]> {
    this.clearMouthPreview();
    this.clearSheetTest();
    this.temporary?.restore();
    this.temporary = null;
    if (config) this.preview = config;
    if (!enabled || !this.preview) return [];
    this.temporary = await applyTemporaryLook(this.scene, this.bodyMeshes(), {
      textureDir: this.preview.textureDir,
      materialSlotByMesh: this.preview.materialSlotByMesh,
      normalSheets: this.preview.normalSheets,
      alphaTestSheets: this.preview.alphaTestSheets,
      alphaCutOff: this.preview.alphaCutOff,
    });
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
    const names = this.preview?.followNodes ?? FOLLOW_NODE_CANDIDATES;
    for (const name of names) {
      const node = this.scene.getTransformNodeByName(name);
      if (node) return node;
    }
    return null;
  }

  private meshByIndex(index: number): Mesh | null {
    return this.bodyMeshes().find((mesh) => meshIndexOf(mesh.name) === index) ?? null;
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

  private applyRecenter(): void {
    if (!this.recenter || !this.followNode) {
      if (this.previewRoot.position.lengthSquared() !== 0) this.previewRoot.position.setAll(0);
      return;
    }
    // Cancel the follow node's world X/Z. Local position is not enough:
    // on the Noesis skeleton, world X is the opposite of the node's local X.
    const world = this.followNode.getAbsolutePosition();
    const parent = this.previewRoot.position;
    this.previewRoot.position.set(-(world.x - parent.x), 0, -(world.z - parent.z));
  }

  private attachPreviewRoot(nodes: TransformNode[], meshes: AbstractMesh[]): void {
    for (const node of nodes) {
      if (!node.parent && node !== this.previewRoot) node.setParent(this.previewRoot);
    }
    for (const mesh of meshes) {
      if (!mesh.parent && mesh.name !== "ground") mesh.setParent(this.previewRoot);
    }
  }

  private clearMouthPreview(): void {
    if (!this.mouthPreview) return;
    const { mesh, previous, material, texture } = this.mouthPreview;
    if (!mesh.isDisposed()) mesh.material = previous;
    material.dispose(false, false);
    texture.dispose();
    this.mouthPreview = null;
  }

  private clearSheetTest(): void {
    if (!this.sheetTest) return;
    const { mesh, previous, material, texture } = this.sheetTest;
    if (!mesh.isDisposed()) mesh.material = previous;
    material.dispose(false, false);
    texture.dispose();
    this.sheetTest = null;
  }

  private disposeLoaded(): void {
    this.clearAttackEnd();
    this.tight = false;
    this.clearMouthPreview();
    this.clearSheetTest();
    this.previewRoot.position.setAll(0);
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
      if (material.name !== "default material" && material.name !== "ground-mat") material.dispose();
    }
    for (const node of [...this.scene.transformNodes]) {
      if (node !== this.previewRoot) node.dispose();
    }
  }

  private armPreview(config: PreviewConfig): void {
    this.preview = config;
    this.shotRadius = null;
    this.shotOffset = null;
    this.setVisibilityPreset("hide-static", config);
    this.follow = true;
    this.tight = true;
    this.recenter = true;
    this.camera.alpha = config.camera.alpha;
    this.camera.beta = config.camera.beta;
    this.aimPreview();
  }

  /**
   * Fits the enabled meshes, including long blades.
   * Attack uses a wider radius than idle. World-static meshes stay hidden in this mode.
   */
  private aimPreview(): void {
    const origin = this.followNode?.getAbsolutePosition();
    if (!origin) return;
    this.refreshBodyBounds();
    let min = new Vector3(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);
    let max = new Vector3(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY);
    for (const mesh of this.bodyMeshes()) {
      if (!mesh.isEnabled()) continue;
      const box = mesh.getBoundingInfo().boundingBox;
      const includeDistance = this.preview?.camera.includeDistance ?? 400;
      if (distanceToBox(origin, box.minimumWorld, box.maximumWorld) > includeDistance) continue;
      min = Vector3.Minimize(min, box.minimumWorld);
      max = Vector3.Maximize(max, box.maximumWorld);
    }
    if (!Number.isFinite(min.x)) {
      this.camera.target.copyFrom(origin);
      return;
    }
    const size = max.subtract(min);
    this.camera.target.copyFrom(min.add(size.scale(0.5)));
    if (this.shotRadius !== null) {
      this.camera.target.copyFrom(origin);
      if (this.shotOffset) this.camera.target.addInPlace(this.shotOffset);
      this.camera.radius = this.shotRadius;
      return;
    }
    const camera = this.preview?.camera;
    const span = Math.max(size.x, size.y, size.z);
    const factor = this.framePhase === "attack" ? (camera?.attackFactor ?? 1.2) : (camera?.idleFactor ?? 1.05);
    const minRadius = camera?.minRadius ?? 380;
    const maxRadius = camera?.maxRadius ?? 1400;
    this.camera.radius = Math.min(maxRadius, Math.max(minRadius, span * factor));
  }

  /** Preview crossfade. Does not write clip keys. The pose can still change. */
  private blendToIdle(attack: AnimationGroup, idle: AnimationGroup, seconds: number): void {
    idle.reset();
    idle.start(true, idle.speedRatio, idle.from, idle.to, false);
    idle.setWeightForAllAnimatables(0);
    attack.setWeightForAllAnimatables(1);
    const started = performance.now();
    const step = () => {
      if (!this.groups.includes(idle)) return;
      const t = Math.min(1, (performance.now() - started) / (seconds * 1000));
      attack.setWeightForAllAnimatables(1 - t);
      idle.setWeightForAllAnimatables(t);
      if (t < 1) {
        requestAnimationFrame(step);
        return;
      }
      attack.stop();
      idle.setWeightForAllAnimatables(1);
    };
    requestAnimationFrame(step);
  }

  private clearAttackEnd(): void {
    const observer = this.attackEnd;
    this.attackEnd = null;
    if (!observer) return;
    const attack = this.groups.find((item) => item.name === this.attackClip);
    attack?.onAnimationGroupEndObservable.remove(observer);
  }

  private handoffRow(group: AnimationGroup, clip: string, edgeSeconds: number, fromStart: boolean): HandoffRow {
    const duration = this.seconds(group);
    const normalized = fromStart ? edgeSeconds / duration : 1 - edgeSeconds / duration;
    this.hold(group);
    group.goToFrame(group.from + clamp01(normalized) * (group.to - group.from));
    this.followNode?.computeWorldMatrix(true);
    this.applyRecenter();
    this.previewRoot.computeWorldMatrix(true);
    this.followNode?.computeWorldMatrix(true);
    const root = this.followNode;
    const world = root?.getAbsolutePosition() ?? Vector3.Zero();
    const pose = this.preview?.poseBone ? this.scene.getTransformNodeByName(this.preview.poseBone) : null;
    const poseWorld = pose?.getAbsolutePosition() ?? null;
    return {
      clip,
      edgeSeconds,
      normalized: round(normalized),
      rootLocal: root ? [round(root.position.x), round(root.position.y), round(root.position.z)] : [0, 0, 0],
      rootWorld: [round(world.x), round(world.y), round(world.z)],
      poseOffset: poseWorld ? [round(poseWorld.x - world.x), round(poseWorld.y - world.y), round(poseWorld.z - world.z)] : null,
    };
  }

  /** Hides extra shells in a stack only while the current pose keeps them together. */
  private applyStackVisibility(): void {
    const config = this.preview;
    if (!config) return;
    const meshes = this.bodyMeshes();
    const byIndex = new Map<number, Mesh>();
    for (const mesh of meshes) {
      const index = meshIndexOf(mesh.name);
      if (index !== null) byIndex.set(index, mesh);
    }
    const hidden = new Set<number>(config.staticMeshIndices);
    for (const stack of config.stacks) {
      const members = stack.indices.map((index) => byIndex.get(index)).filter((mesh): mesh is Mesh => mesh !== undefined);
      if (members.length < 2) continue;
      for (const mesh of members) {
        mesh.computeWorldMatrix(true);
        mesh.refreshBoundingInfo(true, false);
      }
      const keeper = members.reduce((best, mesh) => (mesh.getTotalVertices() > best.getTotalVertices() ? mesh : best));
      const origin = keeper.getBoundingInfo().boundingBox.centerWorld;
      const coincident = members.every(
        (mesh) => Vector3.Distance(mesh.getBoundingInfo().boundingBox.centerWorld, origin) <= stack.coincideDistance,
      );
      if (!coincident) continue;
      for (const mesh of members) {
        if (mesh === keeper) continue;
        const index = meshIndexOf(mesh.name);
        if (index !== null) hidden.add(index);
      }
    }
    for (const mesh of meshes) {
      const index = meshIndexOf(mesh.name);
      mesh.setEnabled(index === null || !hidden.has(index));
    }
  }

  private stop(): void {
    this.clearAttackEnd();
    for (const group of this.groups) group.stop();
  }
}

function distanceToBox(point: Vector3, min: Vector3, max: Vector3): number {
  const dx = point.x < min.x ? min.x - point.x : point.x > max.x ? point.x - max.x : 0;
  const dy = point.y < min.y ? min.y - point.y : point.y > max.y ? point.y - max.y : 0;
  const dz = point.z < min.z ? min.z - point.z : point.z > max.z ? point.z - max.z : 0;
  return Math.hypot(dx, dy, dz);
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
