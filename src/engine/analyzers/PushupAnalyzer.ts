import { BaseAnalyzer } from './BaseAnalyzer';
import { FormAnalysis, DifficultyLevel, Landmark, LandmarkIndex, RepData, CorrectionFeedback, JointAngle, AlignmentCheck } from '@/types';
import {
  calculateAngle,
  checkBodyLineAlignment,
  checkShoulderSymmetry,
  handToShoulderWidthRatio,
  isPoseReliable,
  weightedScore,
  scoreInRange,
  scoreDeviation,
  smoothLandmarks,
} from '@/engine/biomechanics';

const DIFFICULTY_CONFIG = {
  beginner: { minElbow: 100, bodyLineDeg: 20, hipSagDeg: 15 },
  intermediate: { minElbow: 90, bodyLineDeg: 12, hipSagDeg: 10 },
  advanced: { minElbow: 80, bodyLineDeg: 8, hipSagDeg: 7 },
};

const REQUIRED_LANDMARKS = [
  LandmarkIndex.LEFT_SHOULDER, LandmarkIndex.RIGHT_SHOULDER,
  LandmarkIndex.LEFT_ELBOW, LandmarkIndex.RIGHT_ELBOW,
  LandmarkIndex.LEFT_WRIST, LandmarkIndex.RIGHT_WRIST,
  LandmarkIndex.LEFT_HIP, LandmarkIndex.RIGHT_HIP,
  LandmarkIndex.LEFT_HEEL, LandmarkIndex.RIGHT_HEEL,
];

export class PushupAnalyzer extends BaseAnalyzer {
  private difficulty: DifficultyLevel;
  private previousLandmarks: Landmark[] = [];
  private phaseElbowMin = 180;
  private repStartTime = 0;
  private repCorrections: string[] = [];

  constructor(difficulty: DifficultyLevel = 'intermediate') {
    super();
    this.difficulty = difficulty;
  }

  analyze(landmarks: Landmark[], worldLandmarks: Landmark[], timestamp: number): FormAnalysis {
    if (!isPoseReliable(landmarks, REQUIRED_LANDMARKS, 0.5)) {
      return this.createEmptyAnalysis();
    }

    const smoothed = smoothLandmarks(landmarks, this.previousLandmarks);
    this.previousLandmarks = smoothed;

    const config = DIFFICULTY_CONFIG[this.difficulty];
    const corrections: CorrectionFeedback[] = [];
    const jointAngles: JointAngle[] = [];
    const alignmentChecks: AlignmentCheck[] = [];

    // Elbow angles
    const leftElbow = calculateAngle(
      smoothed[LandmarkIndex.LEFT_SHOULDER],
      smoothed[LandmarkIndex.LEFT_ELBOW],
      smoothed[LandmarkIndex.LEFT_WRIST]
    );
    const rightElbow = calculateAngle(
      smoothed[LandmarkIndex.RIGHT_SHOULDER],
      smoothed[LandmarkIndex.RIGHT_ELBOW],
      smoothed[LandmarkIndex.RIGHT_WRIST]
    );
    const avgElbow = (leftElbow + rightElbow) / 2;

    jointAngles.push({
      joint: 'Left Elbow',
      angle: leftElbow,
      status: this.getAngleStatus(leftElbow, config.minElbow, 180),
      ideal: 90,
    });
    jointAngles.push({
      joint: 'Right Elbow',
      angle: rightElbow,
      status: this.getAngleStatus(rightElbow, config.minElbow, 180),
      ideal: 90,
    });

    // Hip angle (sag/pike detection)
    const leftHip = calculateAngle(
      smoothed[LandmarkIndex.LEFT_SHOULDER],
      smoothed[LandmarkIndex.LEFT_HIP],
      smoothed[LandmarkIndex.LEFT_KNEE]
    );
    const rightHip = calculateAngle(
      smoothed[LandmarkIndex.RIGHT_SHOULDER],
      smoothed[LandmarkIndex.RIGHT_HIP],
      smoothed[LandmarkIndex.RIGHT_KNEE]
    );
    const avgHip = (leftHip + rightHip) / 2;

    // Body line alignment
    const bodyLine = checkBodyLineAlignment(smoothed);
    alignmentChecks.push({
      name: 'Body Line',
      passed: bodyLine.passed,
      deviation: bodyLine.deviation,
      message: bodyLine.message,
    });

    // Shoulder symmetry
    const shoulderSym = checkShoulderSymmetry(smoothed);
    alignmentChecks.push({
      name: 'Shoulder Symmetry',
      passed: shoulderSym.passed,
      deviation: shoulderSym.deviation,
      message: shoulderSym.message,
    });

    // Hand placement
    const handRatio = handToShoulderWidthRatio(smoothed);

    // Shoulder angle (elbow flare)
    const leftShoulderAngle = calculateAngle(
      smoothed[LandmarkIndex.LEFT_ELBOW],
      smoothed[LandmarkIndex.LEFT_SHOULDER],
      smoothed[LandmarkIndex.LEFT_HIP]
    );
    const rightShoulderAngle = calculateAngle(
      smoothed[LandmarkIndex.RIGHT_ELBOW],
      smoothed[LandmarkIndex.RIGHT_SHOULDER],
      smoothed[LandmarkIndex.RIGHT_HIP]
    );

    // Corrections
    if (bodyLine.deviation > config.bodyLineDeg) {
      corrections.push({ message: 'Keep your body in a straight line', severity: 'critical' as const, joint: 'hips' });
    }
    if (avgHip < 170) {
      corrections.push({ message: `Hips sagging - raise them (${avgHip.toFixed(0)}°)`, severity: 'critical' as const, joint: 'hips' });
    }
    if (avgHip > 190) {
      corrections.push({ message: `Hips too high - lower them (${avgHip.toFixed(0)}°)`, severity: 'moderate' as const, joint: 'hips' });
    }
    if (handRatio > 1.8) {
      corrections.push({ message: 'Hands too wide - bring them closer', severity: 'minor' as const, joint: 'wrists' });
    } else if (handRatio < 0.8) {
      corrections.push({ message: 'Hands too narrow - widen your grip', severity: 'minor' as const, joint: 'wrists' });
    }
    if (leftShoulderAngle > 80 || rightShoulderAngle > 80) {
      corrections.push({ message: 'Keep elbows closer to body', severity: 'moderate' as const, joint: 'elbows' });
    }

    // Phase state machine
    if (this.phase === 'idle' || this.phase === 'starting') {
      if (avgElbow < 150) {
        this.phase = 'down';
        this.phaseElbowMin = avgElbow;
        if (this.repCount === 0) this.repStartTime = timestamp;
      } else {
        this.phase = 'starting';
      }
    } else if (this.phase === 'down') {
      this.phaseElbowMin = Math.min(this.phaseElbowMin, avgElbow);
      if (avgElbow > 150) {
        this.phase = 'up';
      }
    } else if (this.phase === 'up') {
      if (avgElbow > 160) {
        // Count rep
        if (this.phaseElbowMin <= config.minElbow + 10) {
          this.repCount++;
          const repDuration = timestamp - this.repStartTime;
          const repScore = this.calculateRepScore(bodyLine.deviation, avgHip, this.phaseElbowMin, shoulderSym.deviation, config);
          const repData: RepData = {
            repNumber: this.repCount,
            formScore: repScore,
            duration: repDuration,
            minElbowAngle: this.phaseElbowMin,
            corrections: corrections.map(c => c.message),
            timestamp,
          };
          this.repHistory.push(repData);
        }
        this.phaseElbowMin = 180;
        this.repStartTime = timestamp;
        this.phase = 'starting';
      }
    }

    // Score
    const bodyLineScore = scoreDeviation(bodyLine.deviation, config.bodyLineDeg * 2);
    const hipScore = scoreInRange(avgHip, 170, 190, 20);
    const elbowScore = this.phase === 'down' || this.phase === 'up'
      ? scoreInRange(avgElbow, config.minElbow, 180, 30)
      : 100;
    const symmetryScore = scoreDeviation(shoulderSym.deviation, 10);

    const score = weightedScore([
      { score: bodyLineScore, weight: 0.30 },
      { score: hipScore, weight: 0.30 },
      { score: elbowScore, weight: 0.25 },
      { score: symmetryScore, weight: 0.15 },
    ]);

    return {
      score,
      corrections,
      jointAngles,
      alignmentChecks,
      phase: this.phase,
      repCount: this.repCount,
      isReliable: true,
    };
  }

  private calculateRepScore(
    bodyLineDev: number,
    avgHip: number,
    minElbow: number,
    shoulderDev: number,
    config: { minElbow: number; bodyLineDeg: number; hipSagDeg: number }
  ): number {
    return weightedScore([
      { score: scoreDeviation(bodyLineDev, config.bodyLineDeg * 2), weight: 0.30 },
      { score: scoreInRange(avgHip, 170, 190, 20), weight: 0.30 },
      { score: scoreInRange(minElbow, config.minElbow, 180, 30), weight: 0.25 },
      { score: scoreDeviation(shoulderDev, 10), weight: 0.15 },
    ]);
  }
}
