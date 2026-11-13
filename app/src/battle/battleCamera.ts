import { Vector3, type ArcRotateCamera } from "@babylonjs/core";

/** Side-on establishing shot so both team rows stay in a 16:9 canvas. */
export interface FieldCameraPose {
  alpha: number;
  beta: number;
  radius: number;
  target: Vector3;
}

export function fieldCameraPose(wideField: boolean): FieldCameraPose {
  if (wideField) {
    // Look from +Z so alpha/bravo pads (±X) span the frame.
    return {
      alpha: Math.PI / 2,
      beta: 1.05,
      radius: 980,
      target: new Vector3(0, 70, 0),
    };
  }
  return {
    alpha: Math.PI / 2,
    beta: 0.98,
    radius: 520,
    target: new Vector3(0, 70, 0),
  };
}

export function applyCameraPose(camera: ArcRotateCamera, pose: FieldCameraPose): void {
  camera.setTarget(pose.target.clone());
  camera.alpha = pose.alpha;
  camera.beta = pose.beta;
  camera.radius = pose.radius;
}

/** Temporary pair focus during a skill; caller must restore field pose afterwards. */
export function actionFocusPose(
  attacker: [number, number, number],
  target: [number, number, number],
): FieldCameraPose {
  const mid = new Vector3(
    (attacker[0] + target[0]) / 2,
    70,
    (attacker[2] + target[2]) / 2,
  );
  const dx = target[0] - attacker[0];
  const dz = target[2] - attacker[2];
  const alpha = Math.atan2(dx, dz) + Math.PI / 2;
  return {
    alpha,
    beta: 1.0,
    radius: 420,
    target: mid,
  };
}
