import { BaseAnalyzer } from './BaseAnalyzer';
import { FormAnalysis, ExerciseType, Landmark, LandmarkIndex, DifficultyLevel, CorrectionFeedback, JointAngle, AlignmentCheck } from '@/types';
import {
  calculateAngle,
  checkBodyLineAlignment,
  checkShoulderSymmetry,
  checkHipAlignment,
  isPoseReliable,
  weightedScore,
  scoreInRange,
  scoreDeviation,
  smoothLandmarks,
} from '@/engine/biomechanics';

interface HoldSession {
  startTime: number;
  endTime?: number;
  duration: number;
  avgScore: number;
}

const REQUIRED_GYMNASTICS = [
  LandmarkIndex.LEFT_SHOULDER, LandmarkIndex.RIGHT_SHOULDER,
  LandmarkIndex.LEFT_HIP, LandmarkIndex.RIGHT_HIP,
  LandmarkIndex.LEFT_KNEE, LandmarkIndex.RIGHT_KNEE,
  LandmarkIndex.LEFT_ANKLE, LandmarkIndex.RIGHT_ANKLE,
];

export class GymnasticsAnalyzer extends BaseAnalyzer {
  private exerciseType: ExerciseType;
  private difficulty: DifficultyLevel;
  private previousLandmarks: Landmark[] = [];
  private holdStart = 0;
  private isHolding = false;
  private holdHistory: HoldSession[] = [];
  private scoreAccum: number[] = [];
  private lastMilestoneSec = 0;

  constructor(exerciseType: ExerciseType, difficulty: DifficultyLevel = 'intermediate') {
    super();
    this.exerciseType = exerciseType;
    this.difficulty = difficulty;
  }

  analyze(landmarks: Landmark[], worldLandmarks: Landmark[], timestamp: number): FormAnalysis {
    if (!isPoseReliable(landmarks, REQUIRED_GYMNASTICS, 0.4)) {
      return this.createEmptyAnalysis();
    }

    const smoothed = smoothLandmarks(landmarks, this.previousLandmarks);
    this.previousLandmarks = smoothed;

    switch (this.exerciseType) {
      case 'plank': return this.analyzePlank(smoothed, timestamp);
      case 'hollow_body': return this.analyzeHollowBody(smoothed, timestamp);
      case 'l_sit': return this.analyzeLSit(smoothed, timestamp);
      case 'handstand': return this.analyzeHandstand(smoothed, timestamp);
      default: return this.createEmptyAnalysis();
    }
  }

  private updateHold(score: number, timestamp: number, isGoodPosition: boolean): number {
    const MIN_HOLD = 500;
    if (isGoodPosition) {
      if (!this.isHolding) {
        this.isHolding = true;
        this.holdStart = timestamp;
        this.phase = 'hold';
      }
      this.scoreAccum.push(score);
      const holdTime = timestamp - this.holdStart;

      // Milestone every 10s
      const secs = Math.floor(holdTime / 1000);
      if (secs > 0 && secs % 10 === 0 && secs !== this.lastMilestoneSec) {
        this.lastMilestoneSec = secs;
      }
      return holdTime;
    } else {
      if (this.isHolding) {
        const holdTime = timestamp - this.holdStart;
        if (holdTime >= MIN_HOLD) {
          this.holdHistory.push({
            startTime: this.holdStart,
            endTime: timestamp,
            duration: holdTime,
            avgScore: this.scoreAccum.length > 0
              ? this.scoreAccum.reduce((a, b) => a + b, 0) / this.scoreAccum.length
              : score,
          });
        }
        this.scoreAccum = [];
        this.lastMilestoneSec = 0;
      }
      this.isHolding = false;
      this.phase = 'idle';
      return 0;
    }
  }

  private analyzePlank(landmarks: Landmark[], timestamp: number): FormAnalysis {
    const corrections: CorrectionFeedback[] = [];
    const jointAngles: JointAngle[] = [];
    const alignmentChecks: AlignmentCheck[] = [];

    const bodyLine = checkBodyLineAlignment(landmarks);
    alignmentChecks.push({ name: 'Body Line', passed: bodyLine.passed, deviation: bodyLine.deviation, message: bodyLine.message });

    const shoulderSym = checkShoulderSymmetry(landmarks);
    alignmentChecks.push({ name: 'Shoulder Symmetry', passed: shoulderSym.passed, deviation: shoulderSym.deviation, message: shoulderSym.message });

    const hipCheck = checkHipAlignment(landmarks);
    alignmentChecks.push({ name: 'Hip Level', passed: hipCheck.passed, deviation: hipCheck.deviation, message: hipCheck.message });

    const leftShoulderAngle = calculateAngle(
      landmarks[LandmarkIndex.LEFT_ELBOW],
      landmarks[LandmarkIndex.LEFT_SHOULDER],
      landmarks[LandmarkIndex.LEFT_HIP]
    );
    jointAngles.push({ joint: 'Left Shoulder', angle: leftShoulderAngle, status: this.getAngleStatus(leftShoulderAngle, 80, 100), ideal: 90 });

    const avgHip = (
      calculateAngle(landmarks[LandmarkIndex.LEFT_SHOULDER], landmarks[LandmarkIndex.LEFT_HIP], landmarks[LandmarkIndex.LEFT_KNEE]) +
      calculateAngle(landmarks[LandmarkIndex.RIGHT_SHOULDER], landmarks[LandmarkIndex.RIGHT_HIP], landmarks[LandmarkIndex.RIGHT_KNEE])
    ) / 2;

    if (bodyLine.deviation > 15) corrections.push({ message: 'Keep your body straight', severity: 'critical' as const });
    if (avgHip < 165) corrections.push({ message: 'Hips sagging - raise them', severity: 'critical' as const });
    if (avgHip > 195) corrections.push({ message: 'Lower your hips', severity: 'moderate' as const });

    const isGood = bodyLine.deviation < 20 && avgHip >= 160 && avgHip <= 200;
    const score = weightedScore([
      { score: scoreDeviation(bodyLine.deviation, 30), weight: 0.40 },
      { score: scoreInRange(avgHip, 170, 190, 20), weight: 0.30 },
      { score: scoreInRange(leftShoulderAngle, 80, 100, 20), weight: 0.15 },
      { score: scoreDeviation(shoulderSym.deviation, 10), weight: 0.15 },
    ]);

    const holdTime = this.updateHold(score, timestamp, isGood);
    return { score, corrections, jointAngles, alignmentChecks, phase: this.phase, repCount: this.repCount, holdTime, isReliable: true };
  }

  private analyzeHollowBody(landmarks: Landmark[], timestamp: number): FormAnalysis {
    const corrections: CorrectionFeedback[] = [];
    const jointAngles: JointAngle[] = [];
    const alignmentChecks: AlignmentCheck[] = [];

    const leftHipAngle = calculateAngle(
      landmarks[LandmarkIndex.LEFT_SHOULDER],
      landmarks[LandmarkIndex.LEFT_HIP],
      landmarks[LandmarkIndex.LEFT_KNEE]
    );
    const rightHipAngle = calculateAngle(
      landmarks[LandmarkIndex.RIGHT_SHOULDER],
      landmarks[LandmarkIndex.RIGHT_HIP],
      landmarks[LandmarkIndex.RIGHT_KNEE]
    );
    const avgHip = (leftHipAngle + rightHipAngle) / 2;

    const leftKnee = calculateAngle(landmarks[LandmarkIndex.LEFT_HIP], landmarks[LandmarkIndex.LEFT_KNEE], landmarks[LandmarkIndex.LEFT_ANKLE]);
    const rightKnee = calculateAngle(landmarks[LandmarkIndex.RIGHT_HIP], landmarks[LandmarkIndex.RIGHT_KNEE], landmarks[LandmarkIndex.RIGHT_ANKLE]);
    const avgKnee = (leftKnee + rightKnee) / 2;

    jointAngles.push({ joint: 'Hip', angle: avgHip, status: this.getAngleStatus(avgHip, 145, 170), ideal: 157 });
    jointAngles.push({ joint: 'Knee', angle: avgKnee, status: this.getAngleStatus(avgKnee, 160, 180), ideal: 170 });

    if (avgHip < 145) corrections.push({ message: 'Open hips more - not enough hollow shape', severity: 'moderate' as const });
    if (avgHip > 170) corrections.push({ message: 'Increase hollow position - compress hips', severity: 'moderate' as const });
    if (avgKnee < 160) corrections.push({ message: 'Extend legs straighter', severity: 'minor' as const });

    const isGood = avgHip >= 140 && avgHip <= 175 && avgKnee >= 155;
    const score = weightedScore([
      { score: scoreInRange(avgHip, 145, 170, 25), weight: 0.50 },
      { score: scoreInRange(avgKnee, 170, 180, 20), weight: 0.30 },
      { score: 100, weight: 0.20 },
    ]);

    const holdTime = this.updateHold(score, timestamp, isGood);
    return { score, corrections, jointAngles, alignmentChecks, phase: this.phase, repCount: this.repCount, holdTime, isReliable: true };
  }

  private analyzeLSit(landmarks: Landmark[], timestamp: number): FormAnalysis {
    const corrections: CorrectionFeedback[] = [];
    const jointAngles: JointAngle[] = [];

    const leftHip = calculateAngle(
      landmarks[LandmarkIndex.LEFT_SHOULDER],
      landmarks[LandmarkIndex.LEFT_HIP],
      landmarks[LandmarkIndex.LEFT_KNEE]
    );
    const rightHip = calculateAngle(
      landmarks[LandmarkIndex.RIGHT_SHOULDER],
      landmarks[LandmarkIndex.RIGHT_HIP],
      landmarks[LandmarkIndex.RIGHT_KNEE]
    );
    const avgHip = (leftHip + rightHip) / 2;

    const leftKnee = calculateAngle(landmarks[LandmarkIndex.LEFT_HIP], landmarks[LandmarkIndex.LEFT_KNEE], landmarks[LandmarkIndex.LEFT_ANKLE]);
    const rightKnee = calculateAngle(landmarks[LandmarkIndex.RIGHT_HIP], landmarks[LandmarkIndex.RIGHT_KNEE], landmarks[LandmarkIndex.RIGHT_ANKLE]);
    const avgKnee = (leftKnee + rightKnee) / 2;

    const leftShoulder = calculateAngle(
      landmarks[LandmarkIndex.LEFT_ELBOW],
      landmarks[LandmarkIndex.LEFT_SHOULDER],
      landmarks[LandmarkIndex.LEFT_HIP]
    );
    jointAngles.push({ joint: 'Hip Flexion', angle: avgHip, status: this.getAngleStatus(avgHip, 80, 100), ideal: 90 });
    jointAngles.push({ joint: 'Knee', angle: avgKnee, status: this.getAngleStatus(avgKnee, 170, 180), ideal: 175 });
    jointAngles.push({ joint: 'Shoulder', angle: leftShoulder, status: this.getAngleStatus(leftShoulder, 160, 180), ideal: 170 });

    if (avgHip > 110) corrections.push({ message: 'Raise legs higher - increase hip flexion', severity: 'critical' as const });
    if (avgHip < 75) corrections.push({ message: 'Lower legs slightly', severity: 'minor' as const });
    if (avgKnee < 160) corrections.push({ message: 'Straighten legs fully', severity: 'moderate' as const });
    if (leftShoulder < 150) corrections.push({ message: 'Depress shoulders - push down harder', severity: 'moderate' as const });

    const isGood = avgHip >= 75 && avgHip <= 110 && avgKnee >= 155;
    const score = weightedScore([
      { score: scoreInRange(avgHip, 80, 100, 20), weight: 0.40 },
      { score: scoreInRange(avgKnee, 170, 180, 20), weight: 0.30 },
      { score: scoreInRange(leftShoulder, 160, 180, 20), weight: 0.30 },
    ]);

    const holdTime = this.updateHold(score, timestamp, isGood);
    return { score, corrections, jointAngles, alignmentChecks: [], phase: this.phase, repCount: this.repCount, holdTime, isReliable: true };
  }

  private analyzeHandstand(landmarks: Landmark[], timestamp: number): FormAnalysis {
    const corrections: CorrectionFeedback[] = [];
    const jointAngles: JointAngle[] = [];
    const alignmentChecks: AlignmentCheck[] = [];

    const bodyLine = checkBodyLineAlignment(landmarks);
    alignmentChecks.push({ name: 'Vertical Alignment', passed: bodyLine.deviation < 10, deviation: bodyLine.deviation, message: bodyLine.message });

    const leftHip = calculateAngle(
      landmarks[LandmarkIndex.LEFT_SHOULDER],
      landmarks[LandmarkIndex.LEFT_HIP],
      landmarks[LandmarkIndex.LEFT_KNEE]
    );
    const rightHip = calculateAngle(
      landmarks[LandmarkIndex.RIGHT_SHOULDER],
      landmarks[LandmarkIndex.RIGHT_HIP],
      landmarks[LandmarkIndex.RIGHT_KNEE]
    );
    const avgHip = (leftHip + rightHip) / 2;

    const leftShoulder = calculateAngle(
      landmarks[LandmarkIndex.LEFT_ELBOW],
      landmarks[LandmarkIndex.LEFT_SHOULDER],
      landmarks[LandmarkIndex.LEFT_HIP]
    );

    // Inversion check: wrists above head
    const isInverted = landmarks[LandmarkIndex.LEFT_WRIST].y < landmarks[LandmarkIndex.NOSE].y;

    jointAngles.push({ joint: 'Hip', angle: avgHip, status: this.getAngleStatus(avgHip, 170, 190), ideal: 180 });
    jointAngles.push({ joint: 'Shoulder', angle: leftShoulder, status: this.getAngleStatus(leftShoulder, 160, 180), ideal: 170 });

    if (!isInverted) corrections.push({ message: 'Get fully inverted', severity: 'critical' as const });
    if (bodyLine.deviation > 15) corrections.push({ message: 'Align body vertically', severity: 'critical' as const });
    if (avgHip < 165) corrections.push({ message: 'Extend hips fully', severity: 'moderate' as const });
    if (leftShoulder < 150) corrections.push({ message: 'Open shoulders more', severity: 'moderate' as const });

    const isGood = isInverted && bodyLine.deviation < 20 && avgHip >= 160;
    const score = weightedScore([
      { score: scoreDeviation(bodyLine.deviation, 30), weight: 0.40 },
      { score: scoreInRange(avgHip, 170, 190, 20), weight: 0.30 },
      { score: scoreInRange(leftShoulder, 160, 180, 20), weight: 0.20 },
      { score: isInverted ? 100 : 0, weight: 0.10 },
    ]);

    const holdTime = this.updateHold(score, timestamp, isGood);
    return { score, corrections, jointAngles, alignmentChecks, phase: this.phase, repCount: this.repCount, holdTime, isReliable: true };
  }

  getHoldHistory(): HoldSession[] {
    return this.holdHistory;
  }
}
