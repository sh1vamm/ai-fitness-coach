export interface Landmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

export interface PoseData {
  landmarks: Landmark[];
  worldLandmarks: Landmark[];
  timestamp: number;
}

export enum LandmarkIndex {
  NOSE = 0,
  LEFT_EYE_INNER = 1,
  LEFT_EYE = 2,
  LEFT_EYE_OUTER = 3,
  RIGHT_EYE_INNER = 4,
  RIGHT_EYE = 5,
  RIGHT_EYE_OUTER = 6,
  LEFT_EAR = 7,
  RIGHT_EAR = 8,
  MOUTH_LEFT = 9,
  MOUTH_RIGHT = 10,
  LEFT_SHOULDER = 11,
  RIGHT_SHOULDER = 12,
  LEFT_ELBOW = 13,
  RIGHT_ELBOW = 14,
  LEFT_WRIST = 15,
  RIGHT_WRIST = 16,
  LEFT_PINKY = 17,
  RIGHT_PINKY = 18,
  LEFT_INDEX = 19,
  RIGHT_INDEX = 20,
  LEFT_THUMB = 21,
  RIGHT_THUMB = 22,
  LEFT_HIP = 23,
  RIGHT_HIP = 24,
  LEFT_KNEE = 25,
  RIGHT_KNEE = 26,
  LEFT_ANKLE = 27,
  RIGHT_ANKLE = 28,
  LEFT_HEEL = 29,
  RIGHT_HEEL = 30,
  LEFT_FOOT_INDEX = 31,
  RIGHT_FOOT_INDEX = 32,
}

export type ExerciseType = 'pushup' | 'plank' | 'hollow_body' | 'l_sit' | 'handstand';
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';
export type ExerciseCategory = 'strength' | 'gymnastics';

export interface ExerciseConfig {
  id: ExerciseType;
  name: string;
  description: string;
  category: ExerciseCategory;
  difficulty: DifficultyLevel[];
  targetMuscles: string[];
  icon: string;
  analyzers: string[];
}

export interface JointAngle {
  joint: string;
  angle: number;
  status: 'good' | 'warning' | 'error';
  ideal?: number;
}

export interface AlignmentCheck {
  name: string;
  passed: boolean;
  deviation: number;
  message: string;
}

export type CorrectionSeverity = 'critical' | 'moderate' | 'minor';

export interface CorrectionFeedback {
  message: string;
  severity: CorrectionSeverity;
  joint?: string;
}

export interface FormAnalysis {
  score: number;
  corrections: CorrectionFeedback[];
  jointAngles: JointAngle[];
  alignmentChecks: AlignmentCheck[];
  phase: ExercisePhase;
  repCount: number;
  holdTime?: number;
  isReliable: boolean;
}

export type ExercisePhase = 'idle' | 'starting' | 'down' | 'up' | 'hold' | 'transition';

export interface RepData {
  repNumber: number;
  formScore: number;
  duration: number;
  minElbowAngle?: number;
  corrections: string[];
  timestamp: number;
}

export interface WorkoutSession {
  id: string;
  exercise: ExerciseType;
  difficulty: DifficultyLevel;
  startTime: number;
  endTime: number;
  duration: number;
  repCount: number;
  score: number;
  calories: number;
  repHistory: RepData[];
  corrections: string[];
}

export interface WorkoutSummary {
  session: WorkoutSession;
  bestRep?: RepData;
  worstRep?: RepData;
  formTrend: 'improving' | 'consistent' | 'declining';
  improvementHighlights: string[];
  nextSessionGoals: string[];
  commonCorrections: { message: string; count: number }[];
}

export interface UserProfile {
  name: string;
  height: number;
  weight: number;
  fitnessLevel: DifficultyLevel;
  injuries: string[];
}

export interface WorkoutHistory {
  sessions: WorkoutSession[];
}

export type AppScreen = 'landing' | 'calibration' | 'workout' | 'summary' | 'profile' | 'history';

export interface CameraSettings {
  fps: number;
  isReady: boolean;
  facingMode: 'user' | 'environment';
}

export interface OverlaySettings {
  showSkeleton: boolean;
  showAngles: boolean;
  showCorrections: boolean;
  showScore: boolean;
}

export interface AudioCue {
  message: string;
  priority: 'high' | 'medium' | 'low';
  timestamp: number;
}
