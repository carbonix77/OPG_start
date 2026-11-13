import {
  AnimationGroup,
  Color3,
  Mesh,
  SceneLoader,
  TransformNode,
  Vector3,
  type AssetContainer,
  type Observer,
  type Scene,
} from "@babylonjs/core";
import "@babylonjs/loaders/glTF";
import { assetUrl, type LocalAsset } from "../inspector/assets";
import { FOLLOW_NODE_CANDIDATES, type PhantomSpec, type PreviewConfig } from "../inspector/previewConfig";

export interface CharacterLoadResult {
  unitId: string;
  assetId: string;
  clips: string[];
  /** Named clip → duration in seconds (Babylon to-from / fps when available). */
  clipDurations: Record<string, number>;
  meshes: number;
  skeletons: number;
  joints: number;
  loadMs: number;
  textured: boolean;
  textureNotes: number;
  textureError: string;
  /** Unique texture uniqueIds found on materials. */
  embeddedTextures: number;
  /** True when GLB embedded materials are used as-is. */
  usedEmbeddedOnly: boolean;
}

interface PhantomBody {
  clip: string;
  root: TransformNode;
  follow: TransformNode | null;
  group: AnimationGroup | null;
  container: AssetContainer;
  /** Authored local offset from preview config (Asura stacks at 0,0,0). */
  offset: [number, number, number];
}

function meshBaseName(name: string): string {
  // Battle prefixes meshes as unit-<id>-<original>.
  const hit = /^unit-[^-]+-(.+)$/.exec(name);
  return hit?.[1] ?? name;
}

function nameMatches(meshName: string, wanted: string): boolean {
  const base = meshBaseName(meshName);
  return base === wanted || base.endsWith(wanted) || meshName.endsWith(wanted);
}

/** Strip unit prefix and optional `_noesis_meshnode_####` so short/long shell names match. */
function shellKey(meshName: string): string {
  return meshBaseName(meshName).replace(/_noesis_meshnode_\d+$/i, "");
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
  /** Owner hide indices. Presentation default hides them; Show All can re-enable. */
  private excludedIndices = new Set<number>();
  private excludedNames = new Set<string>();
  private visibleMeshNamePrefixes: string[] = [];
  private clipMeshOverrides: PreviewConfig["clipMeshOverrides"];
  private phantomSpecs: PhantomSpec[] = [];
  private assetPath = "";
  private previewFollow: string[] = FOLLOW_NODE_CANDIDATES;
  private phantoms: PhantomBody[] = [];
  private phantomsReady: Promise<void> = Promise.resolve();
  /** Every skinned body mesh including currently excluded ones (not driver_*). */
  private bodyMeshes: Mesh[] = [];
  /** When true, excluded indices are drawn for diagnostics. Default false. */
  private showAllMeshes = false;
  private clipDurationSec: Record<string, number> = {};
  private actionWatchdog: number | null = null;
  private flashTimers: number[] = [];
  private cacheBust = "";
  private chainMotionActive = false;
  assetId = "";

  constructor(
    readonly unitId: string,
    private readonly scene: Scene,
  ) {
    this.root = new TransformNode(`character-unit-${unitId}`, scene);
  }

  async load(
    asset: LocalAsset,
    preview: PreviewConfig | null,
    offset: [number, number, number],
    options?: { preferEmbeddedTextures?: boolean; cacheBust?: string | number },
  ): Promise<CharacterLoadResult> {
    this.disposeContent();
    const started = performance.now();
    const preferEmbedded = options?.preferEmbeddedTextures === true;
    const { rootUrl, fileName } = assetUrl(asset.relativePath);
    this.cacheBust = options?.cacheBust != null ? `?v=${encodeURIComponent(String(options.cacheBust))}` : "";
    const container = await SceneLoader.LoadAssetContainerAsync(rootUrl, `${fileName}${this.cacheBust}`, this.scene);
    if (this.disposed) {
      container.dispose();
      throw new Error("Character unit disposed during load");
    }
    this.container = container;
    this.assetId = asset.id;
    this.assetPath = asset.relativePath;
    this.previewFollow = preview?.followNodes ?? FOLLOW_NODE_CANDIDATES;
    this.clipMeshOverrides = preview?.clipMeshOverrides;
    this.phantomSpecs = preview?.phantoms ?? [];
    container.addAllToScene();
    for (const mesh of container.meshes) {
      if (!(mesh instanceof Mesh) || mesh.getTotalVertices() <= 0) continue;
      mesh.name = `unit-${this.unitId}-${mesh.name}`;
    }
    this.attachContainerHierarchy(container, this.root);
    this.excludedIndices = new Set(preview?.excludedMeshIndices ?? []);
    this.excludedNames = new Set(preview?.excludedMeshNames ?? []);
    this.visibleMeshNamePrefixes = (preview?.visibleMeshNamePrefixes ?? []).map((p) => p.toLowerCase());
    // Named Blender body (Face/Hair/…) means leftover Noesis shells are duplicates — always hide.
    const hasNamedBody = container.meshes.some((mesh) => {
      if (!(mesh instanceof Mesh) || mesh.getTotalVertices() <= 0) return false;
      return /^(Face|Hair|Shirt|Suit|Eyebrow|Pupils|Neck|Clothes|Body_Arms)$/i.test(meshBaseName(mesh.name));
    });
    this.bodyMeshes = [];
    const body: Mesh[] = [];
    for (const mesh of container.meshes) {
      if (!(mesh instanceof Mesh) || mesh.getTotalVertices() <= 0) continue;
      // Noesis merge helper bones/meshes (driver_*) are not character body parts.
      if (/(?:^|-)driver_\d+/i.test(mesh.name) || /^driver_\d+/i.test(mesh.name)) {
        mesh.setEnabled(false);
        continue;
      }
      if (hasNamedBody && /model_0_submesh_/i.test(mesh.name)) {
        mesh.setEnabled(false);
        continue;
      }
      this.bodyMeshes.push(mesh);
      if (this.isExcludedMesh(mesh) && !this.showAllMeshes) {
        mesh.setEnabled(false);
        continue;
      }
      mesh.setEnabled(true);
      body.push(mesh);
    }
    this.groups = [...container.animationGroups];
    for (const group of this.groups) {
      group.stop();
      group.speedRatio = 1;
    }
    this.follow = this.findFollow(this.previewFollow);
    this.slot.set(offset[0], offset[1], offset[2]);
    this.root.position.copyFrom(this.slot);
    // Face the arena center roughly.
    this.root.rotation.y = offset[0] < 0 ? Math.PI / 2 : -Math.PI / 2;
    this.startRecenter();
    this.snapToSlot();
    this.phantomsReady = this.spawnPhantoms(preferEmbedded, preview);
    await this.phantomsReady;
    if (this.disposed) throw new Error("Character unit disposed during phantom load");
    const embeddedIds = new Set<number>();
    for (const mesh of body) {
      const mat = mesh.material as { getActiveTextures?: () => Array<{ uniqueId: number }> } | null;
      for (const tex of mat?.getActiveTextures?.() ?? []) embeddedIds.add(tex.uniqueId);
    }
    const embeddedTextures = embeddedIds.size;
    const textured = embeddedTextures > 0;
    const textureNotes = embeddedTextures;
    const textureError =
      preferEmbedded && embeddedTextures === 0 ? "GLB embedded textures: 0 (self-contained check failed)." : "";
    const usedEmbeddedOnly = preferEmbedded || embeddedTextures > 0;
    this.clipDurationSec = {};
    for (const group of this.groups) {
      const span = Math.max(0, group.to - group.from);
      const fps = group.targetedAnimations[0]?.animation?.framePerSecond || 30;
      this.clipDurationSec[group.name] = Number((span / fps).toFixed(3));
    }
    const joints = container.skeletons.reduce((sum, skeleton) => sum + skeleton.bones.length, 0);
    return {
      unitId: this.unitId,
      assetId: asset.id,
      clips: this.groups.map((group) => group.name),
      clipDurations: { ...this.clipDurationSec },
      meshes: body.length,
      skeletons: container.skeletons.length,
      joints,
      loadMs: Math.round(performance.now() - started),
      textured,
      textureNotes,
      textureError,
      embeddedTextures,
      usedEmbeddedOnly,
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
    this.hidePhantoms();
    if (!idleClip) {
      this.restoreMeshVisibility();
      return `Unit ${this.unitId} has no idle clip.`;
    }
    const idle = this.groups.find((group) => group.name === idleClip);
    if (!idle) {
      this.restoreMeshVisibility();
      return `Unit ${this.unitId} is missing ${idleClip}.`;
    }
    this.applyClipMeshOverride(idleClip);
    for (const group of this.groups) {
      if (group !== idle) group.stop();
    }
    idle.reset();
    idle.start(true, idle.speedRatio, idle.from, idle.to, false);
    const span = Math.max(0.001, idle.to - idle.from);
    return `Unit ${this.unitId} loops ${idleClip} (${span.toFixed(2)} frames, from ${idle.from}).`;
  }

  /**
   * Holds one clip at a normalized phase for side-by-side idle diagnostics.
   * Does not edit keys. Presentation recenter stays on.
   */
  scrubClip(clipName: string, normalized: number): string {
    this.cancelAction();
    const group = this.groups.find((item) => item.name === clipName);
    if (!group) return `Unit ${this.unitId} is missing ${clipName}.`;
    for (const other of this.groups) {
      if (other !== group) other.stop();
    }
    const frame = group.from + Math.min(1, Math.max(0, normalized)) * Math.max(0.001, group.to - group.from);
    group.start(false, group.speedRatio, frame, frame, false);
    group.pause();
    this.snapToSlot();
    return `Unit ${this.unitId} holds ${clipName} at t=${normalized.toFixed(2)} (frame ${frame.toFixed(1)}).`;
  }

  /** Presentation default hides excluded indices. Diagnostic Show All draws them again. */
  setShowAllMeshes(enabled: boolean): void {
    this.showAllMeshes = enabled;
    this.restoreMeshVisibility();
  }

  getShowAllMeshes(): boolean {
    return this.showAllMeshes;
  }

  clipSpan(clipName: string): { from: number; to: number; seconds: number } | null {
    const group = this.groups.find((item) => item.name === clipName);
    if (!group) return null;
    return { from: group.from, to: group.to, seconds: group.to - group.from };
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
    onComplete: (token: number, outcome: "ok" | "missed-contact") => void,
    options?: { companionClips?: string[]; followClips?: string[] },
  ): { token: number; note: string; mode: "clip" | "missing" } {
    this.cancelAction();
    const token = ++this.token;
    if (!clipName || !this.hasClip(clipName)) {
      return { token, mode: "missing", note: `Unit ${this.unitId} missing clip ${clipName ?? "(none)"}.` };
    }
    const companions = options?.companionClips ?? [];
    const sequence = [clipName, ...(options?.followClips ?? [])];
    for (const name of companions) {
      if (!this.phantoms.some((phantom) => phantom.clip === name)) {
        return { token, mode: "missing", note: `Unit ${this.unitId} missing companion body for ${name}.` };
      }
    }
    for (const name of sequence) {
      if (!this.hasClip(name)) {
        return { token, mode: "missing", note: `Unit ${this.unitId} missing sequence clip ${name}.` };
      }
    }
    const idle = idleClip ? this.groups.find((group) => group.name === idleClip) : null;
    this.attackClip = clipName;
    this.contactArmed = true;
    this.startCompanionClips(companions);
    let settled = false;
    let contactApplied = false;
    /** Multi-part skills keep root motion between clips; single clips stay recentered on the slot. */
    const chainMotion = sequence.length > 1;
    let carryWorld: Vector3 | null = null;
    this.chainMotionActive = chainMotion;
    if (chainMotion) this.stopRecenter();

    const restoreIdleOrVisibility = (): void => {
      this.hidePhantoms();
      if (this.chainMotionActive) {
        this.chainMotionActive = false;
        this.root.position.copyFrom(this.slot);
        this.startRecenter();
        this.snapToSlot();
      }
      if (idle) {
        this.applyClipMeshOverride(idle.name);
        idle.reset();
        idle.start(true, idle.speedRatio, idle.from, idle.to, false);
      } else {
        this.restoreMeshVisibility();
      }
    };

    /** Never invent contact on end/timeout — only the configured impact frame may call onContact. */
    const settle = (outcome: "ok" | "missed-contact"): void => {
      if (settled || token !== this.token) return;
      settled = true;
      this.clearActionWatchdog();
      this.clearObservers();
      this.contactArmed = false;
      restoreIdleOrVisibility();
      onComplete(token, outcome);
    };

    const alignFollowToCarry = (): void => {
      if (!carryWorld || !this.follow) return;
      this.follow.computeWorldMatrix(true);
      for (const mesh of this.bodyMeshes) mesh.computeWorldMatrix(true);
      const now = this.follow.getAbsolutePosition();
      this.root.position.x += carryWorld.x - now.x;
      this.root.position.y += carryWorld.y - now.y;
      this.root.position.z += carryWorld.z - now.z;
      this.follow.computeWorldMatrix(true);
    };

    const captureFollowWorld = (): void => {
      if (!this.follow) return;
      this.follow.computeWorldMatrix(true);
      carryWorld = this.follow.getAbsolutePosition().clone();
    };

    const playSequenceStep = (index: number): void => {
      if (token !== this.token || settled) return;
      const stepName = sequence[index]!;
      const attack = this.groups.find((group) => group.name === stepName)!;
      this.attackClip = stepName;
      this.applyClipMeshOverride(stepName);
      for (const group of this.groups) {
        if (group !== attack) group.stop();
      }
      this.clearObservers();
      // Full from→to range. For follow-up parts, snap to the first frame and keep world position.
      attack.reset();
      attack.start(false, attack.speedRatio, attack.from, attack.to, false);
      if (chainMotion && index > 0 && carryWorld) {
        attack.goToFrame(attack.from);
        for (const animatable of attack.animatables) {
          animatable.goToFrame(attack.from);
        }
        for (const skeleton of this.container?.skeletons ?? []) {
          skeleton.prepare();
          skeleton.computeAbsoluteTransforms(true);
        }
        alignFollowToCarry();
      }
      if (index === 0) {
        this.contactObserver = this.scene.onBeforeRenderObservable.add(() => {
          if (!this.contactArmed || token !== this.token || settled || contactApplied) return;
          if (!chainMotion) this.applyRecenter();
          const frame = attack.animatables[0]?.masterFrame ?? attack.from;
          const normalized = Math.min(
            1,
            Math.max(0, (frame - attack.from) / Math.max(0.001, attack.to - attack.from)),
          );
          if (normalized + 1e-4 >= contactNormalized) {
            this.contactArmed = false;
            contactApplied = true;
            onContact(token);
          }
        });
      }
      this.endObserver = attack.onAnimationGroupEndObservable.add(() => {
        if (token !== this.token || settled) return;
        this.clearObservers();
        if (index + 1 < sequence.length) {
          if (chainMotion) captureFollowWorld();
          playSequenceStep(index + 1);
          return;
        }
        settle(contactApplied ? "ok" : "missed-contact");
      });
    };

    playSequenceStep(0);
    const expectedSec = sequence.reduce((sum, name) => {
      const sec = this.clipDurationSec[name];
      return sum + (typeof sec === "number" && sec > 0.05 ? sec : 3);
    }, 0);
    this.clearActionWatchdog();
    // Generous pad so multi-part skills are never cut off mid-chain by a short duration estimate.
    this.actionWatchdog = window.setTimeout(
      () => settle(contactApplied ? "ok" : "missed-contact"),
      expectedSec * 1000 + 5000,
    );
    const followNote = sequence.length > 1 ? ` → ${sequence.slice(1).join(" → ")}` : "";
    const companionNote = companions.length ? ` + ${companions.join(",")}` : "";
    return {
      token,
      mode: "clip",
      note: `Unit ${this.unitId} plays ${clipName}${followNote}${companionNote}; contact at ${contactNormalized}.`,
    };
  }

  /** Non-lethal hit reaction. Returns to idle when finished. */
  playHit(hitClip: string | null, idleClip: string | null): void {
    if (!hitClip || !this.hasClip(hitClip)) {
      this.flash();
      return;
    }
    this.playOneShot(hitClip, idleClip, false);
  }

  /** Death presentation. Holds the last frame. */
  playDeath(deathClip: string | null): void {
    if (!deathClip || !this.hasClip(deathClip)) {
      this.setEnabled(false);
      return;
    }
    this.playOneShot(deathClip, null, true);
  }

  cancelAction(): void {
    this.token += 1;
    this.clearActionWatchdog();
    this.clearObservers();
    this.clearFlashTimers();
    this.contactArmed = false;
    this.hidePhantoms();
    for (const group of this.groups) group.stop();
    if (this.chainMotionActive) {
      this.chainMotionActive = false;
      this.root.position.copyFrom(this.slot);
      this.startRecenter();
      this.snapToSlot();
    }
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
      this.flashTimers.push(
        window.setTimeout(() => {
          try {
            if (!this.disposed) material.emissiveColor = previous;
          } catch {
            /* disposed */
          }
        }, 180),
      );
      break;
    }
  }

  dispose(): void {
    this.disposed = true;
    this.disposeContent();
    if (!this.root.isDisposed()) this.root.dispose();
  }

  private playOneShot(clipName: string, idleClip: string | null, holdEnd: boolean): void {
    this.cancelAction();
    this.applyClipMeshOverride(clipName);
    const token = ++this.token;
    const clip = this.groups.find((group) => group.name === clipName);
    if (!clip) return;
    const idle = idleClip ? this.groups.find((group) => group.name === idleClip) : null;
    this.attackClip = clipName;
    for (const group of this.groups) {
      if (group !== clip) group.stop();
    }
    clip.reset();
    clip.play(false);
    this.endObserver = clip.onAnimationGroupEndObservable.add(() => {
      if (token !== this.token) return;
      this.clearObservers();
      if (holdEnd) {
        clip.start(false, clip.speedRatio, clip.to, clip.to, false);
        clip.pause();
        return;
      }
      if (idle) {
        this.applyClipMeshOverride(idle.name);
        idle.reset();
        idle.start(true, idle.speedRatio, idle.from, idle.to, false);
      } else {
        this.restoreMeshVisibility();
      }
    });
  }

  private async spawnPhantoms(_preferEmbedded: boolean, _preview: PreviewConfig | null): Promise<void> {
    this.clearPhantoms();
    if (!this.assetPath || this.phantomSpecs.length === 0) return;
    const missing = this.phantomSpecs.filter((spec) => !this.hasClip(spec.clip));
    if (missing.length > 0) return;
    const { rootUrl, fileName } = assetUrl(this.assetPath);
    for (const spec of this.phantomSpecs) {
      if (this.disposed) {
        this.clearPhantoms();
        return;
      }
      const container = await SceneLoader.LoadAssetContainerAsync(rootUrl, `${fileName}${this.cacheBust}`, this.scene);
      if (this.disposed) {
        container.dispose();
        this.clearPhantoms();
        return;
      }
      const root = new TransformNode(`unit-${this.unitId}-phantom-${spec.clip}`, this.scene);
      // Keep local TRS — do not setParent(preserve world) or facing diverges from the main body.
      root.parent = this.root;
      root.position.set(spec.offset[0], spec.offset[1], spec.offset[2]);
      root.rotation.setAll(0);
      root.scaling.setAll(1);
      container.addAllToScene();
      for (const group of container.animationGroups) group.stop();
      // Must parent glTF rootNodes (e.g. __root__) or the copy stays at world origin in bind pose.
      this.attachContainerHierarchy(container, root);
      for (const mesh of container.meshes) {
        if (!(mesh instanceof Mesh) || mesh.getTotalVertices() <= 0) continue;
        mesh.name = `unit-${this.unitId}-phantom-${spec.clip}-${meshBaseName(mesh.name)}`;
        if (/(?:^|-)driver_\d+/i.test(mesh.name) || /model_0_submesh_/i.test(mesh.name)) {
          mesh.setEnabled(false);
          continue;
        }
        if (this.isExcludedMesh(mesh) && !this.showAllMeshes) {
          mesh.setEnabled(false);
          continue;
        }
        mesh.setEnabled(true);
      }
      const group =
        container.animationGroups.find((item) => item.name === spec.clip || item.name.startsWith(`${spec.clip}.`)) ?? null;
      const follow =
        root.getChildTransformNodes(true).find((node) =>
          this.previewFollow.some((name) => node.name === name || meshBaseName(node.name) === name),
        ) ?? null;
      root.setEnabled(false);
      this.phantoms.push({ clip: spec.clip, root, follow, group, container, offset: spec.offset });
    }
  }

  private startCompanionClips(clips: string[]): void {
    for (const phantom of this.phantoms) {
      const active = clips.includes(phantom.clip);
      phantom.root.setEnabled(active);
      phantom.group?.stop();
      // Reset wrapper so each Asura cast starts stacked on the main body.
      phantom.root.position.set(phantom.offset[0], phantom.offset[1], phantom.offset[2]);
      phantom.root.rotation.setAll(0);
      phantom.root.scaling.setAll(1);
      if (active && phantom.group) {
        phantom.group.reset();
        phantom.group.play(false);
      }
    }
    // Snap clones onto the main follow bone before the first rendered frame.
    for (let pass = 0; pass < 4; pass += 1) this.applyPhantomStack();
  }

  private hidePhantoms(): void {
    for (const phantom of this.phantoms) {
      phantom.group?.stop();
      phantom.root.setEnabled(false);
    }
  }

  private clearPhantoms(): void {
    for (const phantom of this.phantoms) {
      phantom.group?.stop();
      phantom.container.removeAllFromScene();
      phantom.container.dispose();
      if (!phantom.root.isDisposed()) phantom.root.dispose();
    }
    this.phantoms = [];
  }

  /** Parent every glTF root under `parent` so hide/move works (avoids bind-pose copies at world origin). */
  private attachContainerHierarchy(container: AssetContainer, parent: TransformNode): void {
    const roots =
      container.rootNodes.length > 0
        ? container.rootNodes
        : [...container.transformNodes, ...container.meshes];
    // Use `.parent =` (keep local TRS). `setParent` preserves world transform and flips
    // phantom facing when the unit root is already rotated toward the arena.
    for (const node of roots) {
      node.parent = parent;
    }
    const underParent = (node: TransformNode | Mesh): boolean => {
      let current = node.parent;
      while (current) {
        if (current === parent) return true;
        current = current.parent;
      }
      return false;
    };
    for (const node of container.transformNodes) {
      if (!underParent(node)) node.parent = parent;
    }
    for (const mesh of container.meshes) {
      if (!(mesh instanceof Mesh)) continue;
      if (!underParent(mesh)) mesh.parent = parent;
    }
  }

  private applyClipMeshOverride(clipName: string): void {
    this.restoreMeshVisibility();
    const override = this.clipMeshOverrides?.[clipName];
    if (!override) return;
    for (const mesh of this.bodyMeshes) {
      if (override.hide?.some((name) => nameMatches(mesh.name, name))) mesh.setEnabled(false);
      if (override.show?.some((name) => nameMatches(mesh.name, name))) mesh.setEnabled(true);
    }
  }

  private restoreMeshVisibility(): void {
    for (const mesh of this.bodyMeshes) {
      if (this.isExcludedMesh(mesh) && !this.showAllMeshes) {
        mesh.setEnabled(false);
      } else {
        mesh.setEnabled(true);
      }
    }
  }

  private isExcludedMesh(mesh: Mesh): boolean {
    const hit = /(?:Mesh_|submesh_)(\d+)(?:_|$)/.exec(mesh.name);
    const index = hit ? Number(hit[1]) : null;
    if (index !== null && this.excludedIndices.has(index)) return true;
    const base = meshBaseName(mesh.name);
    const key = shellKey(mesh.name);
    for (const name of this.excludedNames) {
      if (nameMatches(mesh.name, name) || base === name || key === shellKey(name)) return true;
    }
    if (this.visibleMeshNamePrefixes.length > 0) {
      const lower = base.toLowerCase();
      if (!this.visibleMeshNamePrefixes.some((prefix) => lower.startsWith(prefix))) return true;
    }
    return false;
  }

  private disposeContent(): void {
    this.cancelAction();
    this.stopRecenter();
    this.clearPhantoms();
    this.follow = null;
    this.groups = [];
    this.bodyMeshes = [];
    this.excludedIndices.clear();
    this.excludedNames.clear();
    this.clipMeshOverrides = undefined;
    this.phantomSpecs = [];
    this.assetPath = "";
    this.clipDurationSec = {};
    this.clearActionWatchdog();
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
  }

  private clearActionWatchdog(): void {
    if (this.actionWatchdog !== null) {
      window.clearTimeout(this.actionWatchdog);
      this.actionWatchdog = null;
    }
  }

  private clearFlashTimers(): void {
    for (const id of this.flashTimers) window.clearTimeout(id);
    this.flashTimers = [];
  }

  private findFollow(names: string[]): TransformNode | null {
    const nodes = this.root.getChildTransformNodes(true);
    for (const name of names) {
      const hit = nodes.find((node) => node.name === name || meshBaseName(node.name) === name);
      if (hit) return hit;
    }
    return null;
  }

  private startRecenter(): void {
    this.stopRecenter();
    this.recenterObserver = this.scene.onBeforeRenderObservable.add(() => {
      this.applyRecenter();
      this.applyPhantomStack();
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

  /**
   * Stacks active Asura clones on the main follow bone so Left/Right share the same origin
   * and facing as Central, cancelling each clone's own root motion.
   */
  private applyPhantomStack(): void {
    if (!this.follow) return;
    const active = this.phantoms.filter((phantom) => phantom.root.isEnabled());
    if (active.length === 0) return;
    this.follow.computeWorldMatrix(true);
    const target = this.follow.getAbsolutePosition();
    for (const phantom of active) {
      if (!phantom.follow) continue;
      phantom.follow.computeWorldMatrix(true);
      const world = phantom.follow.getAbsolutePosition();
      const parent = phantom.root.parent;
      if (parent instanceof TransformNode) {
        parent.computeWorldMatrix(true);
        const inv = parent.getWorldMatrix().clone().invert();
        const targetLocal = Vector3.TransformCoordinates(target, inv);
        const worldLocal = Vector3.TransformCoordinates(world, inv);
        phantom.root.position.x += targetLocal.x - worldLocal.x;
        phantom.root.position.y += targetLocal.y - worldLocal.y;
        phantom.root.position.z += targetLocal.z - worldLocal.z;
      } else {
        phantom.root.position.x += target.x - world.x;
        phantom.root.position.y += target.y - world.y;
        phantom.root.position.z += target.z - world.z;
      }
    }
  }
}

export function measureHeapMb(): number | null {
  const memory = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
  return memory ? Math.round(memory.usedJSHeapSize / 1048576) : null;
}

export function arenaFocus(cameraTarget: Vector3, _units: CharacterUnitView[]): Vector3 {
  return cameraTarget;
}
