'use client';

import { FormAnalysis, OverlaySettings, LandmarkIndex, Landmark } from '@/types';

const POSE_CONNECTIONS: [number, number][] = [
  [LandmarkIndex.LEFT_SHOULDER, LandmarkIndex.RIGHT_SHOULDER],
  [LandmarkIndex.LEFT_SHOULDER, LandmarkIndex.LEFT_ELBOW],
  [LandmarkIndex.LEFT_ELBOW, LandmarkIndex.LEFT_WRIST],
  [LandmarkIndex.RIGHT_SHOULDER, LandmarkIndex.RIGHT_ELBOW],
  [LandmarkIndex.RIGHT_ELBOW, LandmarkIndex.RIGHT_WRIST],
  [LandmarkIndex.LEFT_SHOULDER, LandmarkIndex.LEFT_HIP],
  [LandmarkIndex.RIGHT_SHOULDER, LandmarkIndex.RIGHT_HIP],
  [LandmarkIndex.LEFT_HIP, LandmarkIndex.RIGHT_HIP],
  [LandmarkIndex.LEFT_HIP, LandmarkIndex.LEFT_KNEE],
  [LandmarkIndex.LEFT_KNEE, LandmarkIndex.LEFT_ANKLE],
  [LandmarkIndex.RIGHT_HIP, LandmarkIndex.RIGHT_KNEE],
  [LandmarkIndex.RIGHT_KNEE, LandmarkIndex.RIGHT_ANKLE],
  [LandmarkIndex.LEFT_ANKLE, LandmarkIndex.LEFT_HEEL],
  [LandmarkIndex.RIGHT_ANKLE, LandmarkIndex.RIGHT_HEEL],
  [LandmarkIndex.LEFT_HEEL, LandmarkIndex.LEFT_FOOT_INDEX],
  [LandmarkIndex.RIGHT_HEEL, LandmarkIndex.RIGHT_FOOT_INDEX],
  [LandmarkIndex.NOSE, LandmarkIndex.LEFT_EYE],
  [LandmarkIndex.NOSE, LandmarkIndex.RIGHT_EYE],
  [LandmarkIndex.LEFT_EYE, LandmarkIndex.LEFT_EAR],
  [LandmarkIndex.RIGHT_EYE, LandmarkIndex.RIGHT_EAR],
];

const MAJOR_JOINTS = [
  LandmarkIndex.LEFT_SHOULDER, LandmarkIndex.RIGHT_SHOULDER,
  LandmarkIndex.LEFT_ELBOW, LandmarkIndex.RIGHT_ELBOW,
  LandmarkIndex.LEFT_WRIST, LandmarkIndex.RIGHT_WRIST,
  LandmarkIndex.LEFT_HIP, LandmarkIndex.RIGHT_HIP,
  LandmarkIndex.LEFT_KNEE, LandmarkIndex.RIGHT_KNEE,
  LandmarkIndex.LEFT_ANKLE, LandmarkIndex.RIGHT_ANKLE,
];

function scoreColor(score: number): string {
  if (score >= 85) return '#22c55e';
  if (score >= 70) return '#84cc16';
  if (score >= 50) return '#f59e0b';
  return '#ef4444';
}

export class OverlayRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animationFrame = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
  }

  render(
    landmarks: Landmark[],
    analysis: FormAnalysis | null,
    settings: OverlaySettings,
    timestamp: number
  ): void {
    const { width, height } = this.canvas;
    this.ctx.clearRect(0, 0, width, height);

    if (!landmarks || landmarks.length === 0) return;

    const color = analysis ? scoreColor(analysis.score) : '#338dff';
    const errorJoints = new Set<number>(
      analysis?.corrections
        .filter(c => c.joint)
        .map(c => {
          const jointMap: Record<string, number[]> = {
            hips: [LandmarkIndex.LEFT_HIP, LandmarkIndex.RIGHT_HIP],
            elbows: [LandmarkIndex.LEFT_ELBOW, LandmarkIndex.RIGHT_ELBOW],
            wrists: [LandmarkIndex.LEFT_WRIST, LandmarkIndex.RIGHT_WRIST],
          };
          return jointMap[c.joint ?? ''] ?? [];
        })
        .flat() ?? []
    );

    if (settings.showSkeleton) {
      this.drawSkeleton(landmarks, color, errorJoints, timestamp, width, height);
    }

    if (settings.showAngles && analysis) {
      this.drawAngles(analysis, landmarks, width, height);
    }

    if (settings.showCorrections && analysis && analysis.corrections.length > 0) {
      this.drawCorrections(analysis, width, height);
    }

    if (settings.showScore && analysis) {
      this.drawScore(analysis);
    }
  }

  private drawSkeleton(
    landmarks: Landmark[],
    color: string,
    errorJoints: Set<number>,
    timestamp: number,
    width: number,
    height: number
  ): void {
    // Draw connections
    this.ctx.lineWidth = 3;
    for (const [a, b] of POSE_CONNECTIONS) {
      const lmA = landmarks[a];
      const lmB = landmarks[b];
      if (!lmA || !lmB) continue;
      if ((lmA.visibility ?? 1) < 0.3 || (lmB.visibility ?? 1) < 0.3) continue;

      this.ctx.strokeStyle = color;
      this.ctx.beginPath();
      this.ctx.moveTo(lmA.x * width, lmA.y * height);
      this.ctx.lineTo(lmB.x * width, lmB.y * height);
      this.ctx.stroke();
    }

    // Draw joints
    for (const idx of MAJOR_JOINTS) {
      const lm = landmarks[idx];
      if (!lm || (lm.visibility ?? 1) < 0.3) continue;

      const x = lm.x * width;
      const y = lm.y * height;

      if (errorJoints.has(idx)) {
        // Pulsing red highlight
        const pulse = (Math.sin(timestamp * 0.005) + 1) / 2;
        const radius = 8 + pulse * 4;
        this.ctx.fillStyle = `rgba(239,68,68,${0.5 + pulse * 0.5})`;
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.fill();
      }

      // White border + colored fill
      this.ctx.fillStyle = '#ffffff';
      this.ctx.beginPath();
      this.ctx.arc(x, y, 7, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.fillStyle = errorJoints.has(idx) ? '#ef4444' : color;
      this.ctx.beginPath();
      this.ctx.arc(x, y, 5, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  private drawAngles(analysis: FormAnalysis, landmarks: Landmark[], width: number, height: number): void {
    for (const ja of analysis.jointAngles) {
      const jointMap: Record<string, number> = {
        'Left Elbow': LandmarkIndex.LEFT_ELBOW,
        'Right Elbow': LandmarkIndex.RIGHT_ELBOW,
        'Left Shoulder': LandmarkIndex.LEFT_SHOULDER,
        'Right Shoulder': LandmarkIndex.RIGHT_SHOULDER,
        'Hip': LandmarkIndex.LEFT_HIP,
        'Hip Flexion': LandmarkIndex.LEFT_HIP,
        'Knee': LandmarkIndex.LEFT_KNEE,
        'Shoulder': LandmarkIndex.LEFT_SHOULDER,
      };
      const idx = jointMap[ja.joint];
      if (idx === undefined) continue;
      const lm = landmarks[idx];
      if (!lm) continue;

      const x = lm.x * width;
      const y = lm.y * height;

      const bgColor = ja.status === 'good' ? '#22c55e' : ja.status === 'warning' ? '#f59e0b' : '#ef4444';
      const text = `${ja.angle.toFixed(0)}°`;

      this.ctx.fillStyle = bgColor;
      const tw = this.ctx.measureText(text).width + 10;
      this.ctx.beginPath();
      this.ctx.roundRect(x + 8, y - 12, tw, 20, 4);
      this.ctx.fill();

      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = 'bold 11px sans-serif';
      this.ctx.fillText(text, x + 13, y + 3);
    }
  }

  private drawCorrections(analysis: FormAnalysis, width: number, height: number): void {
    const corrections = analysis.corrections.slice(0, 3);
    let y = height * 0.15;

    for (const corr of corrections) {
      const bgColor = corr.severity === 'critical' ? 'rgba(239,68,68,0.85)' :
        corr.severity === 'moderate' ? 'rgba(245,158,11,0.85)' : 'rgba(59,130,246,0.85)';

      const text = corr.message;
      this.ctx.font = 'bold 14px sans-serif';
      const tw = this.ctx.measureText(text).width + 20;
      const bx = (width - tw) / 2;

      this.ctx.fillStyle = bgColor;
      this.ctx.beginPath();
      this.ctx.roundRect(bx, y, tw, 28, 6);
      this.ctx.fill();

      this.ctx.fillStyle = '#ffffff';
      this.ctx.fillText(text, bx + 10, y + 19);
      y += 36;
    }
  }

  private drawScore(analysis: FormAnalysis): void {
    const x = 50;
    const y = 50;
    const radius = 30;
    const score = analysis.score;
    const color = scoreColor(score);

    // Background circle
    this.ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    this.ctx.lineWidth = 5;
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.stroke();

    // Progress arc
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 5;
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, -Math.PI / 2, -Math.PI / 2 + (score / 100) * Math.PI * 2);
    this.ctx.stroke();

    // Score text
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 16px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(`${Math.round(score)}`, x, y + 6);
    this.ctx.textAlign = 'left';
  }

  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
  }
}
