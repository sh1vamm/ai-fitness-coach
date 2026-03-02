import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  AppScreen,
  DifficultyLevel,
  ExerciseType,
  FormAnalysis,
  OverlaySettings,
  UserProfile,
  WorkoutSession,
  WorkoutSummary,
  RepData,
} from '@/types';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function computeSummary(session: WorkoutSession): WorkoutSummary {
  const reps = session.repHistory;
  const bestRep = reps.length > 0 ? reps.reduce((a, b) => (a.formScore > b.formScore ? a : b)) : undefined;
  const worstRep = reps.length > 0 ? reps.reduce((a, b) => (a.formScore < b.formScore ? a : b)) : undefined;

  let formTrend: WorkoutSummary['formTrend'] = 'consistent';
  if (reps.length >= 3) {
    const first = reps.slice(0, Math.floor(reps.length / 2));
    const last = reps.slice(Math.floor(reps.length / 2));
    const firstAvg = first.reduce((s, r) => s + r.formScore, 0) / first.length;
    const lastAvg = last.reduce((s, r) => s + r.formScore, 0) / last.length;
    if (lastAvg - firstAvg > 5) formTrend = 'improving';
    else if (firstAvg - lastAvg > 5) formTrend = 'declining';
  }

  const correctionCount: Record<string, number> = {};
  for (const c of session.corrections) {
    correctionCount[c] = (correctionCount[c] ?? 0) + 1;
  }
  const commonCorrections = Object.entries(correctionCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([message, count]) => ({ message, count }));

  const improvementHighlights: string[] = [];
  const nextSessionGoals: string[] = [];

  if (session.score >= 80) improvementHighlights.push('Excellent overall form');
  if (bestRep && bestRep.formScore >= 90) improvementHighlights.push(`Best rep score: ${Math.round(bestRep.formScore)}%`);
  if (formTrend === 'improving') improvementHighlights.push('Form improved throughout the workout');

  if (session.score < 70) nextSessionGoals.push('Focus on body alignment');
  if (commonCorrections.length > 0) nextSessionGoals.push(`Reduce: ${commonCorrections[0].message}`);
  if (session.repCount < 10 && session.exercise === 'pushup') nextSessionGoals.push('Aim for 10+ reps next session');

  return {
    session,
    bestRep,
    worstRep,
    formTrend,
    improvementHighlights,
    nextSessionGoals,
    commonCorrections,
  };
}

interface AppState {
  // Navigation
  currentScreen: AppScreen;
  setScreen: (screen: AppScreen) => void;

  // User profile
  userProfile: UserProfile | null;
  setUserProfile: (profile: UserProfile) => void;

  // Workout config
  selectedExercise: ExerciseType;
  selectedDifficulty: DifficultyLevel;
  setSelectedExercise: (exercise: ExerciseType) => void;
  setSelectedDifficulty: (difficulty: DifficultyLevel) => void;

  // Live workout state
  isWorkoutActive: boolean;
  currentAnalysis: FormAnalysis | null;
  repCount: number;
  score: number;
  holdTime: number;
  workoutStartTime: number | null;
  setWorkoutActive: (active: boolean) => void;
  setCurrentAnalysis: (analysis: FormAnalysis | null) => void;
  setRepCount: (count: number) => void;
  setScore: (score: number) => void;
  setHoldTime: (time: number) => void;
  startWorkout: () => void;

  // Session management
  currentSession: WorkoutSession | null;
  lastSummary: WorkoutSummary | null;
  sessions: WorkoutSession[];
  finishWorkout: (repHistory: RepData[], corrections: string[], calories: number) => void;

  // Overlay settings
  overlaySettings: OverlaySettings;
  setOverlaySettings: (settings: Partial<OverlaySettings>) => void;

  // Audio
  audioEnabled: boolean;
  setAudioEnabled: (enabled: boolean) => void;

  // Camera
  cameraFPS: number;
  cameraReady: boolean;
  setCameraFPS: (fps: number) => void;
  setCameraReady: (ready: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentScreen: 'landing',
      setScreen: (screen) => set({ currentScreen: screen }),

      userProfile: null,
      setUserProfile: (profile) => set({ userProfile: profile }),

      selectedExercise: 'pushup',
      selectedDifficulty: 'intermediate',
      setSelectedExercise: (exercise) => set({ selectedExercise: exercise }),
      setSelectedDifficulty: (difficulty) => set({ selectedDifficulty: difficulty }),

      isWorkoutActive: false,
      currentAnalysis: null,
      repCount: 0,
      score: 0,
      holdTime: 0,
      workoutStartTime: null,
      setWorkoutActive: (active) => set({ isWorkoutActive: active }),
      setCurrentAnalysis: (analysis) =>
        set({
          currentAnalysis: analysis,
          repCount: analysis?.repCount ?? get().repCount,
          score: analysis?.score ?? get().score,
          holdTime: analysis?.holdTime ?? get().holdTime,
        }),
      setRepCount: (count) => set({ repCount: count }),
      setScore: (score) => set({ score }),
      setHoldTime: (time) => set({ holdTime: time }),
      startWorkout: () =>
        set({
          isWorkoutActive: true,
          workoutStartTime: Date.now(),
          repCount: 0,
          score: 0,
          holdTime: 0,
          currentAnalysis: null,
          currentSession: null,
        }),

      currentSession: null,
      lastSummary: null,
      sessions: [],
      finishWorkout: (repHistory, corrections, calories) => {
        const state = get();
        const now = Date.now();
        const startTime = state.workoutStartTime ?? now;
        const session: WorkoutSession = {
          id: generateId(),
          exercise: state.selectedExercise,
          difficulty: state.selectedDifficulty,
          startTime,
          endTime: now,
          duration: now - startTime,
          repCount: state.repCount,
          score: state.score,
          calories,
          repHistory,
          corrections,
        };
        const summary = computeSummary(session);
        const sessions = [session, ...state.sessions].slice(0, 100);
        set({
          currentSession: session,
          lastSummary: summary,
          sessions,
          isWorkoutActive: false,
        });
      },

      overlaySettings: {
        showSkeleton: true,
        showAngles: true,
        showCorrections: true,
        showScore: true,
      },
      setOverlaySettings: (settings) =>
        set((state) => ({ overlaySettings: { ...state.overlaySettings, ...settings } })),

      audioEnabled: true,
      setAudioEnabled: (enabled) => set({ audioEnabled: enabled }),

      cameraFPS: 0,
      cameraReady: false,
      setCameraFPS: (fps) => set({ cameraFPS: fps }),
      setCameraReady: (ready) => set({ cameraReady: ready }),
    }),
    {
      name: 'ai-fitness-coach',
      partialize: (state) => ({
        userProfile: state.userProfile,
        sessions: state.sessions,
        selectedExercise: state.selectedExercise,
        selectedDifficulty: state.selectedDifficulty,
        overlaySettings: state.overlaySettings,
        audioEnabled: state.audioEnabled,
      }),
    }
  )
);
