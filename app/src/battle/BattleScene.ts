import {
  ArcRotateCamera,
  Color3,
  Color4,
  DirectionalLight,
  Engine,
  HemisphericLight,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Vector3,
  type Mesh,
} from "@babylonjs/core";
import "@babylonjs/loaders/glTF";
import { applyCameraPose, fieldCameraPose, type FieldCameraPose } from "./battleCamera";

/** Minimal Babylon host for the battle arena (no inspector tooling). */
export class BattleScene {
  readonly engine: Engine;
  readonly scene: Scene;
  readonly camera: ArcRotateCamera;
  private readonly ground: Mesh;
  private fieldPose: FieldCameraPose = fieldCameraPose(false);

  constructor(canvas: HTMLCanvasElement) {
    this.engine = new Engine(canvas, true, { preserveDrawingBuffer: true });
    this.scene = new Scene(this.engine);
    this.scene.clearColor = new Color4(0.12, 0.13, 0.15, 1);
    const pose = fieldCameraPose(false);
    this.camera = new ArcRotateCamera(
      "orbit",
      pose.alpha,
      pose.beta,
      pose.radius,
      pose.target.clone(),
      this.scene,
    );
    this.camera.attachControl(canvas, true);
    this.camera.lowerRadiusLimit = 80;
    this.camera.upperRadiusLimit = 2000;
    this.camera.wheelPrecision = 2;
    const fill = new HemisphericLight("fill", new Vector3(0, 1, 0), this.scene);
    fill.intensity = 0.75;
    const sun = new DirectionalLight("sun", new Vector3(-0.4, -1, 0.3), this.scene);
    sun.intensity = 0.85;
    this.ground = MeshBuilder.CreateGround("ground", { width: 4000, height: 4000 }, this.scene);
    const groundMat = new StandardMaterial("ground-mat", this.scene);
    groundMat.diffuseColor = new Color3(0.16, 0.17, 0.19);
    groundMat.specularColor = Color3.Black();
    this.ground.material = groundMat;
    this.engine.runRenderLoop(() => {
      this.scene.render();
    });
  }

  prepareBattleScene(wideField = false): void {
    this.fieldPose = fieldCameraPose(wideField);
    applyCameraPose(this.camera, this.fieldPose);
  }

  /** Remember / restore the establishing shot used for the current lineup. */
  restoreFieldCamera(): void {
    applyCameraPose(this.camera, this.fieldPose);
  }

  setFieldCamera(pose: FieldCameraPose): void {
    this.fieldPose = {
      alpha: pose.alpha,
      beta: pose.beta,
      radius: pose.radius,
      target: pose.target.clone(),
    };
    applyCameraPose(this.camera, this.fieldPose);
  }

  applyActionCamera(pose: FieldCameraPose): void {
    applyCameraPose(this.camera, pose);
  }

  resize(): void {
    this.engine.resize();
  }

  dispose(): void {
    this.engine.stopRenderLoop();
    this.scene.dispose();
    this.engine.dispose();
  }
}
