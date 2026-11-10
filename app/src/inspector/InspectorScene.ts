import {
  Animation,
  ArcRotateCamera,
  Color3,
  Color4,
  DirectionalLight,
  Engine,
  HemisphericLight,
  Mesh,
  MeshBuilder,
  PBRMaterial,
  Quaternion,
  Scene,
  SceneLoader,
  SkeletonViewer,
  StandardMaterial,
  Texture,
  TransformNode,
  Vector3,
  type AbstractMesh,
  AnimationGroup,
  type Material,
  type Observer,
} from "@babylonjs/core";
import "@babylonjs/loaders/glTF";
import { assetUrl, fileUrl, type LocalAsset } from "./assets";
import {
  FOLLOW_NODE_CANDIDATES,
  meshIndexOf,
  registryCheck,
  type CameraKey,
  type PreviewConfig,
  type PreviewEffect,
} from "./previewConfig";
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

export interface CinematicFrame {
  clip: string;
  normalized: number;
  alpha: number;
  beta: number;
  radius: number;
  target: [number, number, number];
  rootLocalZ: number;
  rootWorldZ: number;
  effects: string[];
  swords: Array<{ id: string; visible: number }>;
}

export interface CinematicMeasure {
  error: string;
  seconds: number;
  frames: number;
  fps: number;
  engineFps: number;
  maxAlphaStep: number;
  maxBetaStep: number;
  maxRadiusStep: number;
  maxTargetStep: number;
  /** Clip and normalized time where the alpha step was largest. */
  maxAlphaAt: { clip: string; normalized: number } | null;
  minFps: number;
  p95FrameMs: number;
  rootWorldZ: [number, number];
  rootLocalZ: { attackStart: number; attackEnd: number; idleStart: number };
  effectWindows: Array<{ id: string; from: number; to: number }>;
  swordMins: Array<{ id: string; visible: number }>;
  rows: CinematicFrame[];
}

interface RuntimeEffect {
  id: string;
  kind: PreviewEffect["kind"];
  t: number;
  seconds: number;
  width: number;
  tipMeshIndex: number | null;
  anchor: TransformNode;
  mesh: Mesh;
  material: StandardMaterial;
  samples: Vector3[];
  bits: Mesh[];
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
  private readonly canvas: HTMLCanvasElement;
  private cameraDrive: "orbit" | "timeline" = "orbit";
  private controlsAttached = true;
  private timelineArmed = false;
  private forcedFrame: { clip: "attack" | "idle"; normalized: number } | null = null;
  private blendStarted = 0;
  private effectsEnabled = false;
  private fx: RuntimeEffect[] = [];
  private measuring: CinematicFrame[] | null = null;
  private frameGaps: number[] = [];
  private lastMeasureAt = 0;
  private readonly cameraOffset = new Vector3();
  private readonly trailSide = new Vector3();
  private readonly trailDir = new Vector3();
  private readonly tipPoint = new Vector3();
  private readonly tipOrigin = new Vector3();
  private readonly tipDir = new Vector3();

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
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
      if (this.recenter && this.followNode) this.followNode.computeWorldMatrix(true);
      if (this.visibility === "stacks") this.applyStackVisibility();
      if (this.cameraDrive === "timeline" && this.followNode) {
        this.applyTimeline();
        this.applyEffects();
        const state = this.timelineState();
        if (this.measuring && state) {
          const now = performance.now();
          if (this.lastMeasureAt > 0) this.frameGaps.push(now - this.lastMeasureAt);
          this.lastMeasureAt = now;
          this.measuring.push(this.readFrame(state.clip, state.normalized));
        }
        this.applyHitStop(state);
      } else if (this.follow && this.followNode) {
        if (this.tight) this.aimPreview();
        else this.camera.target.copyFrom(this.followNode.getAbsolutePosition());
      }
      this.scene.render();
    });
  }

  setPreviewConfig(config: PreviewConfig | null): void {
    this.preview = config;
  }

  currentPreview(): PreviewConfig | null {
    return this.preview;
  }

  /** Registry probe. It does not load a model. */
  previewRegistry(): ReturnType<typeof registryCheck> {
    return registryCheck();
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
    this.leaveTimeline();
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
  playProvisionalIdle(config: PreviewConfig | null): string {
    if (!config) return "This file has no preview config.";
    const idle = this.groups.find((item) => item.name === config.idleClip);
    if (!idle) return `This file has no ${config.idleClip}. The clip is not copied onto another skeleton.`;
    this.leaveTimeline();
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
  playAttackThenIdle(config: PreviewConfig | null): string {
    if (!config) return "This file has no preview config.";
    const idle = this.groups.find((item) => item.name === config.idleClip);
    const attack = this.groups.find((item) => item.name === config.attackClip);
    if (!idle || !attack) return `Needs ${config.idleClip} and ${config.attackClip} in this file. Clips are not retargeted.`;
    this.leaveTimeline();
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
    this.leaveTimeline();
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
    this.leaveTimeline();
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
    this.leaveTimeline();
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
  setMouthPreview(enabled: boolean, config?: PreviewConfig | null): string {
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
  setVisibilityPreset(preset: VisibilityPreset, config?: PreviewConfig | null): void {
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
  setStage(enabled: boolean, config?: PreviewConfig | null): void {
    if (config) this.preview = config;
    const stage = this.preview?.stage;
    if (!enabled || !stage) {
      this.scene.clearColor.set(0.12, 0.13, 0.15, 1);
      this.groundMat.diffuseColor.set(0.16, 0.17, 0.19);
      this.sun.intensity = 0.8;
      this.sun.direction.set(-0.4, -1, 0.3);
      this.rim.intensity = 0;
      this.ground.scaling.set(1, 1, 1);
      this.scene.fogMode = Scene.FOGMODE_NONE;
      return;
    }
    this.ground.scaling.set(12, 1, 12);
    this.scene.clearColor.set(stage.clear[0], stage.clear[1], stage.clear[2], 1);
    this.scene.fogMode = stage.fogDensity > 0 ? Scene.FOGMODE_EXP2 : Scene.FOGMODE_NONE;
    this.scene.fogDensity = stage.fogDensity;
    this.scene.fogColor.set(stage.clear[0], stage.clear[1], stage.clear[2]);
    this.groundMat.diffuseColor.set(stage.ground[0], stage.ground[1], stage.ground[2]);
    this.sun.intensity = stage.keyIntensity;
    this.sun.direction.set(stage.keyDirection[0], stage.keyDirection[1], stage.keyDirection[2]);
    this.rim.intensity = stage.rimIntensity;
    this.rim.direction.set(stage.rimDirection[0], stage.rimDirection[1], stage.rimDirection[2]);
  }

  /** Holds one configured shot. The radius stays until the next scrub or play. */
  showShot(config: PreviewConfig | null, shotId: string): string {
    if (!config) return "This file has no preview config.";
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
   * Plays the configured attack, eases the camera back to idle, and can show preview effects.
   * Orbit is detached until setCameraDrive("orbit"). Clip keys are not edited.
   */
  playCinematic(config: PreviewConfig | null, effects: boolean): string {
    if (!config?.cinematic) return "This character has no cinematic timeline.";
    const idle = this.groups.find((item) => item.name === config.idleClip);
    const attack = this.groups.find((item) => item.name === config.attackClip);
    if (!idle || !attack) return `Needs ${config.idleClip} and ${config.attackClip} in this file. Clips are not retargeted.`;
    this.leaveTimeline();
    this.clearAttackEnd();
    this.preview = config;
    this.framePhase = "attack";
    this.attackClip = config.attackClip;
    this.shotRadius = null;
    this.shotOffset = null;
    this.follow = true;
    this.tight = false;
    this.recenter = true;
    this.effectsEnabled = effects;
    this.syncEffects(config);
    attack.speedRatio = 1;
    this.timelineArmed = true;
    this.cameraDrive = "timeline";
    this.setControls(false);
    this.camera.inertialAlphaOffset = 0;
    this.camera.inertialBetaOffset = 0;
    this.camera.inertialRadiusOffset = 0;
    for (const other of this.groups) {
      if (other !== attack) other.stop();
    }
    attack.reset();
    attack.play(false);
    this.applyRecenter();
    this.followNode?.computeWorldMatrix(true);
    this.applyTimeline();
    this.attackEnd = attack.onAnimationGroupEndObservable.add(() => {
      this.clearAttackEnd();
      if (!this.groups.includes(idle)) return;
      this.framePhase = "idle";
      this.blendStarted = performance.now();
      this.blendToIdle(attack, idle, config.blendSeconds);
    });
    const blade = this.mouthPreview
      ? "The mouth mesh is using the stand-in crop. It is not an original texture."
      : "The mouth mesh keeps the cloth baseline.";
    const fx = effects
      ? "Preview blade trails, bloom, and particles are on. A short slowdown marks the strike. They are not an OPPW4 effect."
      : "Preview effects are off.";
    return `Cinematic camera is driving ${config.attackClip}, then ${config.idleClip}. Orbit debug is off. ${fx} ${blade}`;
  }

  /**
   * Records the cinematic canvas to a WebM blob. No audio track.
   * The caller decides whether to keep the file. This does not write to disk.
   */
  recordCinematic(config: PreviewConfig | null, effects: boolean): Promise<{ blob: Blob; width: number; height: number; seconds: number } | null> {
    const attack = config ? this.groups.find((item) => item.name === config.attackClip) : undefined;
    if (!config?.cinematic || !attack || typeof MediaRecorder === "undefined") return Promise.resolve(null);
    const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp8") ? "video/webm;codecs=vp8" : "video/webm";
    let recorder: MediaRecorder;
    const chunks: Blob[] = [];
    try {
      const stream = this.canvas.captureStream(30);
      recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 2_500_000 });
    } catch {
      return Promise.resolve(null);
    }
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    const message = this.playCinematic(config, effects);
    if (!message.startsWith("Cinematic")) return Promise.resolve(null);
    recorder.start(250);
    const seconds = this.seconds(attack) + config.blendSeconds + 0.35;
    return new Promise((resolve) => {
      window.setTimeout(() => {
        const finish = () => {
          resolve({
            blob: new Blob(chunks, { type: mime }),
            width: this.canvas.width,
            height: this.canvas.height,
            seconds,
          });
        };
        if (recorder.state === "inactive") finish();
        else {
          recorder.onstop = finish;
          recorder.stop();
        }
      }, seconds * 1000);
    });
  }

  /** Stops the timeline from writing the camera and gives orbit back. */
  setCameraDrive(mode: "orbit" | "timeline"): void {
    if (mode === "timeline" && !this.timelineArmed) return;
    this.cameraDrive = mode;
    this.setControls(mode === "orbit");
  }

  /** Builds or removes the configured preview effects. They are not game effects. */
  setPreviewEffects(enabled: boolean, config?: PreviewConfig | null): void {
    if (config) this.preview = config;
    this.effectsEnabled = enabled;
    if (!enabled) {
      this.clearEffects();
      return;
    }
    if (this.preview) this.syncEffects(this.preview);
  }

  /**
   * Holds one cinematic frame. Attack times use the camera keys.
   * Idle uses the idle hold, after the attack-end key.
   */
  showCinematicFrame(
    config: PreviewConfig,
    clip: "attack" | "idle",
    normalized: number,
    effects: boolean,
  ): CinematicFrame | null {
    const name = clip === "attack" ? config.attackClip : config.idleClip;
    if (!config.cinematic || !this.groups.some((group) => group.name === name) || !this.followNode) return null;
    this.preview = config;
    this.effectsEnabled = effects;
    this.clearAttackEnd();
    this.leaveTimeline();
    this.framePhase = clip;
    this.forcedFrame = { clip, normalized: clamp01(normalized) };
    this.blendStarted = clip === "idle" ? performance.now() - config.blendSeconds * 1000 : 0;
    this.follow = true;
    this.tight = false;
    this.recenter = true;
    this.syncEffects(config);
    if (clip === "attack") this.primeTrails(clamp01(normalized));
    this.poseClip(name, clamp01(normalized));
    this.timelineArmed = true;
    this.cameraDrive = "timeline";
    this.setControls(false);
    this.applyRecenter();
    this.followNode.computeWorldMatrix(true);
    this.applyTimeline();
    this.applyEffects();
    this.scene.render();
    return this.readFrame(name, this.forcedFrame.normalized);
  }

  /** Plays the cinematic once and records camera, root, effects, and sword visibility. */
  measureCinematic(config: PreviewConfig, effects: boolean): Promise<CinematicMeasure> {
    const attack = this.groups.find((item) => item.name === config.attackClip);
    if (!config.cinematic || !attack) return Promise.resolve(emptyMeasure("This file has no cinematic clip."));
    const rows: CinematicFrame[] = [];
    this.measuring = rows;
    this.frameGaps = [];
    this.lastMeasureAt = 0;
    const started = performance.now();
    const message = this.playCinematic(config, effects);
    if (!message.startsWith("Cinematic")) {
      this.measuring = null;
      return Promise.resolve(emptyMeasure(message));
    }
    const wait = (this.seconds(attack) + config.blendSeconds + 0.35) * 1000;
    return new Promise((resolve) => {
      window.setTimeout(() => {
        const frames = this.measuring ?? [];
        this.measuring = null;
        resolve(summarizeMeasure(frames, this.frameGaps, (performance.now() - started) / 1000, this.engine.getFps()));
      }, wait);
    });
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
  async setTemporaryTextures(enabled: boolean, config?: PreviewConfig | null): Promise<TextureNote[]> {
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
    return this.scene.meshes.filter(
      (mesh): mesh is Mesh =>
        mesh instanceof Mesh && mesh.name !== "ground" && !mesh.name.startsWith("preview-fx-") && mesh.getTotalVertices() > 0,
    );
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
    this.clearEffects();
    this.leaveTimeline();
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

  private leaveTimeline(): void {
    this.cameraDrive = "orbit";
    this.timelineArmed = false;
    this.forcedFrame = null;
    this.blendStarted = 0;
    this.setControls(true);
    for (const fx of this.fx) fx.mesh.setEnabled(false);
  }

  private setControls(attached: boolean): void {
    if (attached === this.controlsAttached) return;
    this.controlsAttached = attached;
    if (attached) this.camera.attachControl(this.canvas, true);
    else this.camera.detachControl();
  }

  private timelineState(): { clip: string; normalized: number; blend: number } | null {
    const preview = this.preview;
    if (!preview?.cinematic) return null;
    if (this.forcedFrame) {
      const clip = this.forcedFrame.clip === "attack" ? preview.attackClip : preview.idleClip;
      return { clip, normalized: this.forcedFrame.normalized, blend: this.forcedFrame.clip === "idle" ? 1 : 0 };
    }
    if (this.framePhase === "idle") {
      const idle = this.groups.find((group) => group.name === preview.idleClip);
      const blend = this.blendStarted > 0 ? clamp01((performance.now() - this.blendStarted) / (preview.blendSeconds * 1000)) : 1;
      return { clip: preview.idleClip, normalized: idle ? this.normalizedOf(idle) : 0, blend };
    }
    const attack = this.groups.find((group) => group.name === preview.attackClip);
    if (!attack) return null;
    return { clip: attack.name, normalized: this.normalizedOf(attack), blend: 0 };
  }

  private applyTimeline(): void {
    const timeline = this.preview?.cinematic;
    const state = this.timelineState();
    const origin = this.followNode?.getAbsolutePosition();
    if (!timeline || !state || !origin || timeline.keys.length === 0) return;
    const from = state.blend > 0 ? this.cameraOnKeys(timeline.keys, 1) : this.cameraOnKeys(timeline.keys, state.normalized);
    const key = state.blend <= 0 ? from : this.mixKeys(from, timeline.idleHold, smoothstep(state.blend));
    this.camera.alpha = key.alpha;
    this.camera.beta = key.beta;
    this.camera.radius = key.radius;
    this.camera.target.copyFrom(origin);
    this.cameraOffset.set(key.targetOffset[0], key.targetOffset[1], key.targetOffset[2]);
    this.camera.target.addInPlace(this.cameraOffset);
  }

  private cameraOnKeys(keys: CameraKey[], t: number): CameraKey {
    if (t <= keys[0].t) return keys[0];
    const last = keys[keys.length - 1];
    if (t >= last.t) return last;
    let index = 1;
    while (index < keys.length && keys[index].t < t) index += 1;
    const a = keys[index - 1];
    const b = keys[index];
    return this.mixKeys(a, b, smoothstep((t - a.t) / (b.t - a.t)));
  }

  private mixKeys(a: CameraKey, b: CameraKey, u: number): CameraKey {
    return {
      t: a.t,
      alpha: lerpAngle(a.alpha, b.alpha, u),
      beta: a.beta + (b.beta - a.beta) * u,
      radius: a.radius + (b.radius - a.radius) * u,
      targetOffset: [
        a.targetOffset[0] + (b.targetOffset[0] - a.targetOffset[0]) * u,
        a.targetOffset[1] + (b.targetOffset[1] - a.targetOffset[1]) * u,
        a.targetOffset[2] + (b.targetOffset[2] - a.targetOffset[2]) * u,
      ],
    };
  }

  private applyEffects(): void {
    const preview = this.preview;
    const state = this.timelineState();
    const duration = preview ? this.clipSeconds(preview.attackClip) : 0;
    const onAttack = Boolean(preview?.cinematic && state && state.clip === preview.attackClip);
    for (const fx of this.fx) {
      const span = duration > 0 ? fx.seconds / duration : 0;
      const u = onAttack && span > 0 ? (state!.normalized - fx.t) / span : -1;
      const on = u >= 0 && u <= 1;
      if (!on) {
        fx.mesh.setEnabled(false);
        for (const bit of fx.bits) bit.setEnabled(false);
        if (fx.kind === "trail" && !this.forcedFrame) fx.samples.length = 0;
        continue;
      }
      const fade = Math.sin(Math.PI * clamp01(u));
      if (fx.kind !== "trail") this.placeOnMeshTip(fx.tipMeshIndex, fx.anchor);
      fx.anchor.computeWorldMatrix(true);
      if (fx.kind === "trail") {
        this.recordTrail(fx);
        fx.mesh.setEnabled(fx.samples.length >= 2);
        fx.material.alpha = 0.32 + 0.34 * fade;
        continue;
      }
      fx.mesh.setEnabled(true);
      fx.material.alpha = fx.kind === "bloom" ? 0.14 + 0.26 * fade : 0.55 * fade;
      if (fx.kind === "bloom") this.alignBloom(fx, fade);
      if (fx.kind === "burst") this.placeBurst(fx, fade);
    }
  }

  private applyHitStop(state: { clip: string; normalized: number; blend: number } | null): void {
    const attack = this.groups.find((group) => group.name === this.preview?.attackClip);
    const stop = this.preview?.cinematic?.hitStop;
    if (!attack) return;
    if (!stop || !this.effectsEnabled || this.forcedFrame || !state || state.clip !== attack.name) {
      if (attack.speedRatio !== 1) attack.speedRatio = 1;
      return;
    }
    const duration = this.clipSeconds(attack.name);
    const local = (state.normalized - stop.t) * duration;
    attack.speedRatio = local >= 0 && local <= stop.seconds ? stop.speed : 1;
  }

  private syncEffects(config: PreviewConfig): void {
    const effects = config.cinematic?.effects ?? [];
    if (!this.effectsEnabled || effects.length === 0) {
      this.clearEffects();
      return;
    }
    if (this.fx.length === effects.length && this.fx.every((fx, index) => fx.id === effects[index].id)) return;
    this.clearEffects();
    for (const effect of effects) this.fx.push(this.makeEffect(effect));
  }

  private makeEffect(effect: PreviewEffect): RuntimeEffect {
    const anchor = new TransformNode(`preview-fx-${effect.id}`, this.scene);
    anchor.parent = this.scene.getTransformNodeByName(effect.bone) ?? this.followNode;
    anchor.position.set(effect.offset[0], effect.offset[1], effect.offset[2]);
    anchor.metadata = { tipAxis: effect.offset };
    anchor.rotation.set(effect.rotation[0], effect.rotation[1], effect.rotation[2]);
    this.placeOnMeshTip(effect.tipMeshIndex, anchor);
    const material = new StandardMaterial(`preview-fx-mat-${effect.id}`, this.scene);
    material.emissiveColor = new Color3(effect.color[0], effect.color[1], effect.color[2]);
    material.diffuseColor = Color3.Black();
    material.specularColor = Color3.Black();
    material.disableLighting = true;
    material.backFaceCulling = false;
    material.transparencyMode = 2;
    material.alphaMode = effect.kind === "trail" ? 2 : 1;
    material.alpha = 1;
    const mesh =
      effect.kind === "trail"
        ? this.blankRibbon(effect.id)
        : MeshBuilder.CreateSphere(
            `preview-fx-mesh-${effect.id}`,
            { diameter: effect.kind === "burst" ? 0.01 : effect.size, segments: 10 },
            this.scene,
          );
    mesh.parent = effect.kind === "trail" ? null : anchor;
    mesh.material = material;
    mesh.setEnabled(false);
    const bits =
      effect.kind === "burst"
        ? Array.from({ length: 8 }, (_, index) => {
            const bit = MeshBuilder.CreateSphere(`preview-fx-bit-${effect.id}-${index}`, { diameter: 1.5, segments: 6 }, this.scene);
            bit.parent = anchor;
            bit.material = material;
            bit.setEnabled(false);
            return bit;
          })
        : [];
    return {
      id: effect.id,
      kind: effect.kind,
      t: effect.t,
      seconds: effect.seconds,
      width: effect.size,
      tipMeshIndex: effect.tipMeshIndex,
      anchor,
      mesh,
      material,
      samples: [],
      bits,
    };
  }

  private blankRibbon(id: string): Mesh {
    const a = new Vector3(0, 0, 0);
    const b = new Vector3(0.01, 0, 0);
    return MeshBuilder.CreateRibbon(
      `preview-fx-mesh-${id}`,
      { pathArray: [[a, b], [a.clone(), b.clone()]], sideOrientation: Mesh.DOUBLESIDE, updatable: true },
      this.scene,
    );
  }

  private recordTrail(fx: RuntimeEffect): void {
    this.placeOnMeshTip(fx.tipMeshIndex, fx.anchor);
    const pos = fx.anchor.getAbsolutePosition().clone();
    const last = fx.samples[fx.samples.length - 1];
    if (last && Vector3.DistanceSquared(last, pos) > 30 * 30) fx.samples.length = 0;
    if (!last || Vector3.DistanceSquared(last, pos) > 0.16) fx.samples.push(pos);
    if (fx.samples.length > 10) fx.samples.shift();
    if (fx.samples.length >= 2) this.redrawTrail(fx);
  }

  private redrawTrail(fx: RuntimeEffect): void {
    const path = this.smoothPath(fx.samples);
    const left: Vector3[] = [];
    const right: Vector3[] = [];
    const count = path.length;
    for (let i = 0; i < count; i += 1) {
      const prev = path[Math.max(0, i - 1)];
      const next = path[Math.min(count - 1, i + 1)];
      next.subtractToRef(prev, this.trailDir);
      if (this.trailDir.lengthSquared() < 1e-4) this.trailDir.set(0, 0, 1);
      this.trailDir.normalize();
      this.camera.position.subtractToRef(path[i], this.trailSide);
      Vector3.CrossToRef(this.trailDir, this.trailSide, this.trailSide);
      if (this.trailSide.lengthSquared() < 1e-4) Vector3.CrossToRef(this.trailDir, Vector3.Up(), this.trailSide);
      const along = i / Math.max(1, count - 1);
      const taper = 0.15 + 0.85 * along * along;
      this.trailSide.normalize().scaleInPlace(fx.width * taper);
      left.push(path[i].add(this.trailSide));
      right.push(path[i].subtract(this.trailSide));
    }
    fx.mesh.dispose(false, false);
    fx.mesh = MeshBuilder.CreateRibbon(
      `preview-fx-mesh-${fx.id}`,
      { pathArray: [left, right], sideOrientation: Mesh.DOUBLESIDE, updatable: true },
      this.scene,
    );
    fx.mesh.material = fx.material;
    fx.mesh.setEnabled(true);
  }

  /** Softens corners without letting the ribbon leave the sampled tip path. */
  private smoothPath(samples: Vector3[]): Vector3[] {
    if (samples.length < 3) return samples.map((sample) => sample.clone());
    return samples.map((sample, index) => {
      if (index === 0 || index === samples.length - 1) return sample.clone();
      return sample.add(samples[index - 1]).add(samples[index + 1]).scale(1 / 3);
    });
  }

  /**
   * Puts the anchor on the skinned vertex farthest from the bone toward the mesh center.
   * A box corner can sit beside the blade. The config offset stays if the mesh is missing.
   */
  private placeOnMeshTip(tipMeshIndex: number | null, anchor: TransformNode): void {
    const bone = anchor.parent;
    if (tipMeshIndex === null || !(bone instanceof TransformNode)) return;
    if (anchor.metadata?.tipLocked) return;
    const mesh = this.bodyMeshes().find((item) => meshIndexOf(item.name) === tipMeshIndex);
    if (!mesh) return;
    bone.computeWorldMatrix(true);
    mesh.skeleton?.prepare(true);
    mesh.computeWorldMatrix(true);
    const skinned = mesh.getPositionData(true, false);
    if (!skinned || skinned.length < 3) return;
    const world = mesh.getWorldMatrix();
    const origin = bone.getAbsolutePosition();
    let cx = 0;
    let cy = 0;
    let cz = 0;
    const scratch = this.tipPoint;
    for (let i = 0; i < skinned.length; i += 3) {
      Vector3.TransformCoordinatesFromFloatsToRef(skinned[i], skinned[i + 1], skinned[i + 2], world, scratch);
      cx += scratch.x;
      cy += scratch.y;
      cz += scratch.z;
    }
    const axis = anchor.metadata?.tipAxis as [number, number, number] | undefined;
    this.tipPoint.set(axis?.[0] ?? cx, axis?.[1] ?? cy, axis?.[2] ?? cz);
    if (axis) {
      Vector3.TransformNormalToRef(this.tipPoint, bone.getWorldMatrix(), this.tipDir);
    } else {
      this.tipDir.set(cx / skinned.length - origin.x, cy / skinned.length - origin.y, cz / skinned.length - origin.z);
    }
    if (this.tipDir.lengthSquared() < 1e-4) return;
    this.tipDir.normalize();
    let reach = 1;
    let found = false;
    for (let i = 0; i < skinned.length; i += 3) {
      Vector3.TransformCoordinatesFromFloatsToRef(skinned[i], skinned[i + 1], skinned[i + 2], world, scratch);
      const dot =
        (scratch.x - origin.x) * this.tipDir.x +
        (scratch.y - origin.y) * this.tipDir.y +
        (scratch.z - origin.z) * this.tipDir.z;
      if (dot > reach) {
        reach = dot;
        this.tipOrigin.copyFrom(scratch);
        found = true;
      }
    }
    if (!found) return;
    const local = Vector3.TransformCoordinates(this.tipOrigin, bone.getWorldMatrix().clone().invert());
    anchor.position.copyFrom(local);
    anchor.metadata = { ...(anchor.metadata ?? {}), tipLocked: true };
  }

  /** Stretches the bloom along the measured tip instead of leaving a round flash. */
  private alignBloom(fx: RuntimeEffect, fade: number): void {
    const direction = fx.anchor.position.clone();
    if (direction.lengthSquared() < 1e-4) direction.set(1, 0, 0);
    direction.normalize();
    const axis = Vector3.Cross(Vector3.Right(), direction);
    const angle = Math.acos(Math.min(1, Math.max(-1, Vector3.Dot(Vector3.Right(), direction))));
    fx.mesh.rotationQuaternion =
      axis.lengthSquared() < 1e-6
        ? Quaternion.RotationAxis(Vector3.Up(), direction.x < 0 ? Math.PI : 0)
        : Quaternion.RotationAxis(axis.normalize(), angle);
    const pulse = 0.7 + 0.3 * fade;
    fx.mesh.scaling.set(pulse * 3.4, pulse * 0.28, pulse * 0.28);
  }

  private placeBurst(fx: RuntimeEffect, fade: number): void {
    fx.mesh.setEnabled(false);
    fx.bits.forEach((bit, index) => {
      const angle = (index / fx.bits.length) * Math.PI * 2;
      const distance = fx.width * (0.25 + fade);
      bit.position.set(Math.cos(angle) * distance, Math.sin(angle) * distance * 0.6, Math.sin(angle * 2) * distance * 0.35);
      bit.scaling.setAll(0.35 + 0.5 * (1 - fade));
      bit.setEnabled(true);
    });
  }

  private primeTrails(normalized: number): void {
    const duration = this.clipSeconds(this.preview?.attackClip ?? "");
    for (const fx of this.fx) {
      if (fx.kind !== "trail") continue;
      const span = duration > 0 ? fx.seconds / duration : 0;
      const start = fx.t;
      const end = fx.t + span;
      if (normalized < start || normalized > end) continue;
      const lookback = duration > 0 ? 0.28 / duration : 0.05;
      const from = Math.max(start, normalized - lookback);
      fx.samples = [];
      const steps = 12;
      for (let i = 0; i <= steps; i += 1) {
        this.poseClip(this.preview?.attackClip ?? "", from + ((normalized - from) * i) / steps);
        this.placeOnMeshTip(fx.tipMeshIndex, fx.anchor);
        fx.anchor.computeWorldMatrix(true);
        fx.samples.push(fx.anchor.getAbsolutePosition().clone());
      }
    }
  }

  private poseClip(name: string, normalized: number): void {
    const group = this.groups.find((item) => item.name === name);
    if (!group) return;
    this.hold(group);
    group.goToFrame(group.from + clamp01(normalized) * (group.to - group.from));
    this.followNode?.computeWorldMatrix(true);
    this.applyRecenter();
    this.followNode?.computeWorldMatrix(true);
  }

  /**
   * Plays a generated moving box through the same effect path.
   * The box is not a character. It checks that bone names come from the caller.
   */
  smokeFixture(): { ok: boolean; moved: number; detail: string } {
    const bone = new TransformNode("fixture-bone", this.scene);
    bone.parent = this.previewRoot;
    bone.position.set(0, 1, 0);
    const motion = new Animation("fixture-move", "position.x", 60, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CYCLE);
    motion.setKeys([
      { frame: 0, value: 0 },
      { frame: 20, value: 3 },
    ]);
    const group = new AnimationGroup("fixture-clip", this.scene);
    group.addTargetedAnimation(motion, bone);
    const anchor = new TransformNode("preview-fx-fixture-anchor", this.scene);
    anchor.parent = bone;
    const fx: RuntimeEffect = {
      id: "fixture-trail",
      kind: "trail",
      t: 0,
      seconds: 1,
      width: 0.2,
      tipMeshIndex: null,
      anchor,
      mesh: this.blankRibbon("fixture-trail"),
      material: new StandardMaterial("preview-fx-mat-fixture-trail", this.scene),
      samples: [],
      bits: [],
    };
    fx.mesh.material = fx.material;
    group.play(false);
    group.goToFrame(0);
    bone.computeWorldMatrix(true);
    this.recordTrail(fx);
    group.goToFrame(20);
    bone.computeWorldMatrix(true);
    anchor.computeWorldMatrix(true);
    this.recordTrail(fx);
    const moved = fx.samples.length >= 2 ? Vector3.Distance(fx.samples[0], fx.samples[fx.samples.length - 1]) : 0;
    group.stop();
    group.dispose();
    fx.mesh.dispose(false, true);
    anchor.dispose();
    bone.dispose();
    return {
      ok: moved > 1,
      moved: round(moved),
      detail: "A generated box and clip drove a trail. No character name was used.",
    };
  }

  private clearEffects(): void {
    for (const fx of this.fx) {
      fx.mesh.dispose(false, false);
      for (const bit of fx.bits) bit.dispose(false, false);
      fx.material.dispose();
    }
    this.fx = [];
    for (const node of [...this.scene.transformNodes]) {
      if (node.name.startsWith("preview-fx-")) node.dispose();
    }
    for (const mesh of [...this.scene.meshes]) {
      if (mesh.name.startsWith("preview-fx-")) mesh.dispose(false, false);
    }
  }

  private clipSeconds(name: string): number {
    const group = this.groups.find((item) => item.name === name);
    return group ? this.seconds(group) : 0;
  }

  private normalizedOf(group: AnimationGroup): number {
    const span = group.to - group.from;
    if (span === 0) return 0;
    return clamp01((group.getCurrentFrame() - group.from) / span);
  }

  private readFrame(clip: string, normalized: number): CinematicFrame {
    const root = this.followNode;
    const world = root?.getAbsolutePosition();
    return {
      clip,
      normalized: round(normalized),
      alpha: round(this.camera.alpha),
      beta: round(this.camera.beta),
      radius: round(this.camera.radius),
      target: [round(this.camera.target.x), round(this.camera.target.y), round(this.camera.target.z)],
      rootLocalZ: round(root?.position.z ?? 0),
      rootWorldZ: round(world?.z ?? 0),
      effects: this.fx.filter((fx) => fx.mesh.isEnabled() || fx.bits.some((bit) => bit.isEnabled())).map((fx) => fx.id),
      swords: (this.preview?.swordGroups ?? []).map((group) => ({
        id: group.id,
        visible: group.indices.filter((index) => this.meshByIndex(index)?.isEnabled()).length,
      })),
    };
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

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil(p * sorted.length) - 1);
  return sorted[Math.max(0, index)];
}

function smoothstep(value: number): number {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
}

function lerpAngle(a: number, b: number, t: number): number {
  let delta = b - a;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  return a + delta * t;
}

function angleDelta(a: number, b: number): number {
  return Math.abs(lerpAngle(a, b, 1) - a);
}

function emptyMeasure(error: string): CinematicMeasure {
  return {
    error,
    seconds: 0,
    frames: 0,
    fps: 0,
    engineFps: 0,
    maxAlphaStep: 0,
    maxBetaStep: 0,
    maxRadiusStep: 0,
    maxTargetStep: 0,
    maxAlphaAt: null,
    minFps: 0,
    p95FrameMs: 0,
    rootWorldZ: [0, 0],
    rootLocalZ: { attackStart: 0, attackEnd: 0, idleStart: 0 },
    effectWindows: [],
    swordMins: [],
    rows: [],
  };
}

function summarizeMeasure(frames: CinematicFrame[], gaps: number[], seconds: number, engineFps: number): CinematicMeasure {
  if (frames.length === 0) return emptyMeasure("No cinematic frames were recorded.");
  let maxAlpha = 0;
  let maxBeta = 0;
  let maxRadius = 0;
  let maxTarget = 0;
  let maxAlphaAt: { clip: string; normalized: number } | null = null;
  let worldMin = Number.POSITIVE_INFINITY;
  let worldMax = Number.NEGATIVE_INFINITY;
  for (let i = 0; i < frames.length; i += 1) {
    const frame = frames[i];
    worldMin = Math.min(worldMin, frame.rootWorldZ);
    worldMax = Math.max(worldMax, frame.rootWorldZ);
    if (i === 0) continue;
    const prev = frames[i - 1];
    const alphaStep = angleDelta(prev.alpha, frame.alpha);
    if (alphaStep >= maxAlpha) maxAlphaAt = { clip: frame.clip, normalized: frame.normalized };
    maxAlpha = Math.max(maxAlpha, alphaStep);
    maxBeta = Math.max(maxBeta, Math.abs(frame.beta - prev.beta));
    maxRadius = Math.max(maxRadius, Math.abs(frame.radius - prev.radius));
    maxTarget = Math.max(
      maxTarget,
      Math.hypot(frame.target[0] - prev.target[0], frame.target[1] - prev.target[1], frame.target[2] - prev.target[2]),
    );
  }
  const attackClip = frames[0].clip;
  const attack = frames.filter((frame) => frame.clip === attackClip);
  const idle = frames.filter((frame) => frame.clip !== attackClip);
  const marks = [0, 0.08, 0.12, 0.22, 0.35, 0.55, 0.75, 0.92, 1];
  const rows = marks
    .map((mark) => attack.reduce((best, frame) => (Math.abs(frame.normalized - mark) < Math.abs(best.normalized - mark) ? frame : best)))
    .filter((frame, index, list) => list.findIndex((item) => item.normalized === frame.normalized && item.clip === frame.clip) === index);
  if (idle[0]) rows.push(idle[0]);
  if (idle.length > 1) rows.push(idle[idle.length - 1]);
  const windows = new Map<string, { from: number; to: number }>();
  for (const frame of attack) {
    for (const id of frame.effects) {
      const hit = windows.get(id);
      if (!hit) windows.set(id, { from: frame.normalized, to: frame.normalized });
      else hit.to = frame.normalized;
    }
  }
  const swordMins = new Map<string, number>();
  for (const frame of frames) {
    for (const sword of frame.swords) {
      const hit = swordMins.get(sword.id);
      swordMins.set(sword.id, hit === undefined ? sword.visible : Math.min(hit, sword.visible));
    }
  }
  return {
    error: "",
    seconds: round(seconds),
    frames: frames.length,
    fps: round(frames.length / Math.max(seconds, 0.001)),
    engineFps: round(engineFps),
    maxAlphaStep: round(maxAlpha),
    maxBetaStep: round(maxBeta),
    maxRadiusStep: round(maxRadius),
    maxTargetStep: round(maxTarget),
    maxAlphaAt: maxAlphaAt ? { clip: maxAlphaAt.clip, normalized: round(maxAlphaAt.normalized) } : null,
    minFps: gaps.length ? round(1000 / Math.max(...gaps)) : 0,
    p95FrameMs: round(percentile(gaps, 0.95)),
    rootWorldZ: [round(worldMin), round(worldMax)],
    rootLocalZ: {
      attackStart: attack[0]?.rootLocalZ ?? 0,
      attackEnd: attack[attack.length - 1]?.rootLocalZ ?? 0,
      idleStart: idle[0]?.rootLocalZ ?? 0,
    },
    effectWindows: [...windows.entries()].map(([id, window]) => ({ id, from: window.from, to: window.to })),
    swordMins: [...swordMins.entries()].map(([id, visible]) => ({ id, visible })),
    rows,
  };
}
