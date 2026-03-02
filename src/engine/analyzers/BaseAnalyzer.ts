import { FormAnalysis, ExercisePhase, RepData } from '@/types';

export abstract class BaseAnalyzer {
  protected repCount = 0;
  protected repHistory: RepData[] = [];
  protected phase: ExercisePhase = 'idle';

  abstract analyze(landmarks: { x: number; y: number; z: number; visibility?: number }[], worldLandmarks: { x: number; y: number; z: number; visibility?: number }[], timestamp: number): FormAnalysis;

  getRepCount(): number {
    return this.repCount;
  }

  getRepHistory(): RepData[] {
    return this.repHistory;
  }

  reset(): void {
    this.repCount = 0;
    this.repHistory = [];
    this.phase = 'idle';
  }

  getPhase(): ExercisePhase {
    return this.phase;
  }

  protected createEmptyAnalysis(): FormAnalysis {
    return {
      score: 0,
      corrections: [],
      jointAngles: [],
      alignmentChecks: [],
      phase: this.phase,
      repCount: this.repCount,
      isReliable: false,
    };
  }

  protected getAngleStatus(angle: number, idealMin: number, idealMax: number): 'good' | 'warning' | 'error' {
    if (angle >= idealMin && angle <= idealMax) return 'good';
    const midpoint = (idealMin + idealMax) / 2;
    const range = idealMax - idealMin;
    const dist = Math.abs(angle - midpoint) - range / 2;
    if (dist < range * 0.5) return 'warning';
    return 'error';
  }
}
