import { Landmark, LandmarkIndex } from '@/types';

export function calculateAngle(a: Landmark, b: Landmark, c: Landmark): number {
  const radians =
    Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs((radians * 180.0) / Math.PI);
  if (angle > 180.0) angle = 360 - angle;
  return angle;
}

export function calculate3DAngle(a: Landmark, b: Landmark, c: Landmark): number {
  const ba = { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
  const bc = { x: c.x - b.x, y: c.y - b.y, z: c.z - b.z };
  const dot = ba.x * bc.x + ba.y * bc.y + ba.z * bc.z;
  const magBa = Math.sqrt(ba.x ** 2 + ba.y ** 2 + ba.z ** 2);
  const magBc = Math.sqrt(bc.x ** 2 + bc.y ** 2 + bc.z ** 2);
  if (magBa === 0 || magBc === 0) return 0;
  const cosAngle = Math.min(1, Math.max(-1, dot / (magBa * magBc)));
  return (Math.acos(cosAngle) * 180) / Math.PI;
}

export function calculateLineDeviation(
  point: Landmark,
  lineStart: Landmark,
  lineEnd: Landmark
): number {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return 0;
  const cross = Math.abs(
    (lineEnd.x - lineStart.x) * (lineStart.y - point.y) -
      (lineStart.x - point.x) * (lineEnd.y - lineStart.y)
  );
  return cross / len;
}

export function landmarkDistance(a: Landmark, b: Landmark): number {
  return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
}

export function landmarkDistance3D(a: Landmark, b: Landmark): number {
  return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2 + (b.z - a.z) ** 2);
}

export function midpoint(a: Landmark, b: Landmark): Landmark {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    z: (a.z + b.z) / 2,
    visibility: Math.min(a.visibility ?? 1, b.visibility ?? 1),
  };
}

export function checkBodyLineAlignment(
  landmarks: Landmark[]
): { passed: boolean; deviation: number; message: string } {
  const head = landmarks[LandmarkIndex.NOSE];
  const leftHeel = landmarks[LandmarkIndex.LEFT_HEEL];
  const rightHeel = landmarks[LandmarkIndex.RIGHT_HEEL];
  const heels = midpoint(leftHeel, rightHeel);
  const leftHip = landmarks[LandmarkIndex.LEFT_HIP];
  const rightHip = landmarks[LandmarkIndex.RIGHT_HIP];
  const hips = midpoint(leftHip, rightHip);

  const dev = calculateLineDeviation(hips, head, heels);
  const deviationDeg = Math.atan(dev) * (180 / Math.PI);

  return {
    passed: deviationDeg < 15,
    deviation: deviationDeg,
    message:
      deviationDeg >= 15
        ? `Body line off by ${deviationDeg.toFixed(1)}°`
        : 'Body line straight',
  };
}

export function checkShoulderSymmetry(
  landmarks: Landmark[]
): { passed: boolean; deviation: number; message: string } {
  const left = landmarks[LandmarkIndex.LEFT_SHOULDER];
  const right = landmarks[LandmarkIndex.RIGHT_SHOULDER];
  const deviation = Math.abs(left.y - right.y) * 100;
  return {
    passed: deviation < 5,
    deviation,
    message: deviation >= 5 ? 'Level your shoulders' : 'Shoulders level',
  };
}

export function checkHipAlignment(
  landmarks: Landmark[]
): { passed: boolean; deviation: number; message: string } {
  const left = landmarks[LandmarkIndex.LEFT_HIP];
  const right = landmarks[LandmarkIndex.RIGHT_HIP];
  const deviation = Math.abs(left.y - right.y) * 100;
  return {
    passed: deviation < 5,
    deviation,
    message: deviation >= 5 ? 'Level your hips' : 'Hips level',
  };
}

export function handToShoulderWidthRatio(landmarks: Landmark[]): number {
  const shoulderWidth = landmarkDistance(
    landmarks[LandmarkIndex.LEFT_SHOULDER],
    landmarks[LandmarkIndex.RIGHT_SHOULDER]
  );
  const handWidth = landmarkDistance(
    landmarks[LandmarkIndex.LEFT_WRIST],
    landmarks[LandmarkIndex.RIGHT_WRIST]
  );
  if (shoulderWidth === 0) return 1;
  return handWidth / shoulderWidth;
}

export function smoothLandmarks(
  current: Landmark[],
  previous: Landmark[],
  alpha = 0.65
): Landmark[] {
  if (previous.length === 0) return current;
  return current.map((lm, i) => {
    const prev = previous[i];
    if (!prev) return lm;
    return {
      x: alpha * lm.x + (1 - alpha) * prev.x,
      y: alpha * lm.y + (1 - alpha) * prev.y,
      z: alpha * lm.z + (1 - alpha) * prev.z,
      visibility: lm.visibility,
    };
  });
}

export function landmarkVelocity(a: Landmark, b: Landmark, dt: number): number {
  if (dt <= 0) return 0;
  return landmarkDistance(a, b) / dt;
}

export function isPoseReliable(
  landmarks: Landmark[],
  requiredIndices: number[],
  minVisibility = 0.5
): boolean {
  return requiredIndices.every(
    (i) => landmarks[i] && (landmarks[i].visibility ?? 1) >= minVisibility
  );
}

export function scoreInRange(
  value: number,
  idealMin: number,
  idealMax: number,
  tolerance: number
): number {
  if (value >= idealMin && value <= idealMax) return 100;
  const distMin = value < idealMin ? idealMin - value : 0;
  const distMax = value > idealMax ? value - idealMax : 0;
  const dist = Math.max(distMin, distMax);
  return Math.max(0, 100 - (dist / tolerance) * 100);
}

export function scoreDeviation(deviation: number, maxAcceptable: number): number {
  if (deviation <= 0) return 100;
  return Math.max(0, 100 - (deviation / maxAcceptable) * 100);
}

export function weightedScore(scores: { score: number; weight: number }[]): number {
  const totalWeight = scores.reduce((s, item) => s + item.weight, 0);
  if (totalWeight === 0) return 0;
  return scores.reduce((s, item) => s + item.score * item.weight, 0) / totalWeight;
}
