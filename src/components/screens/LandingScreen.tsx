'use client';

import { EXERCISES, EXERCISE_MAP } from '@/config/exercises';
import { useAppStore } from '@/store/appStore';
import { ExerciseType, DifficultyLevel } from '@/types';
import { History, User, Zap, Cpu, Clock } from 'lucide-react';

const DIFFICULTY_COLORS: Record<DifficultyLevel, string> = {
  beginner: 'bg-green-500/20 text-green-400 border-green-500/30',
  intermediate: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  advanced: 'bg-red-500/20 text-red-400 border-red-500/30',
};

export default function LandingScreen() {
  const {
    selectedExercise,
    selectedDifficulty,
    setSelectedExercise,
    setSelectedDifficulty,
    setScreen,
    userProfile,
  } = useAppStore();

  const exercise = EXERCISE_MAP[selectedExercise];
  const availableDifficulties = exercise?.difficulty ?? [];

  const handleStart = () => {
    setScreen('calibration');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[rgb(10,10,20)] to-[rgb(15,15,30)] text-white">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-4 max-w-lg mx-auto">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-[#338dff]">AI</span>
          <span className="text-lg font-semibold text-white/80">FitCoach</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setScreen('history')}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            aria-label="History"
          >
            <History size={18} />
          </button>
          <button
            onClick={() => setScreen('profile')}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            aria-label="Profile"
          >
            <User size={18} />
          </button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pb-8">
        {/* Hero */}
        <div className="text-center py-8">
          <h1 className="text-4xl font-extrabold mb-3">
            <span className="bg-gradient-to-r from-[#338dff] to-purple-400 bg-clip-text text-transparent">
              AI Fitness Coach
            </span>
          </h1>
          <p className="text-white/60 text-base">
            Real-time pose analysis powered by on-device AI
          </p>
          {!userProfile && (
            <button
              onClick={() => setScreen('profile')}
              className="mt-3 text-sm text-[#338dff] hover:underline"
            >
              Set up your profile →
            </button>
          )}
        </div>

        {/* Feature badges */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {[
            { icon: <Cpu size={13} />, label: 'Edge AI' },
            { icon: <Clock size={13} />, label: '<30ms Latency' },
            { icon: <Zap size={13} />, label: 'Local Processing' },
          ].map((badge) => (
            <span
              key={badge.label}
              className="flex items-center gap-1 px-3 py-1 rounded-full bg-[#338dff]/10 border border-[#338dff]/20 text-[#338dff] text-xs font-medium"
            >
              {badge.icon}
              {badge.label}
            </span>
          ))}
        </div>

        {/* Exercise selection */}
        <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-3">
          Choose Exercise
        </h2>
        <div className="grid grid-cols-1 gap-3 mb-6">
          {EXERCISES.map((ex) => (
            <button
              key={ex.id}
              onClick={() => {
                setSelectedExercise(ex.id as ExerciseType);
                if (!ex.difficulty.includes(selectedDifficulty)) {
                  setSelectedDifficulty(ex.difficulty[0]);
                }
              }}
              className={`flex items-start gap-4 p-4 rounded-xl border text-left transition-all ${
                selectedExercise === ex.id
                  ? 'border-[#338dff] bg-[#338dff]/10'
                  : 'border-white/10 bg-white/5 hover:bg-white/10'
              }`}
            >
              <span className="text-3xl">{ex.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-sm">{ex.name}</span>
                  <span className="text-xs text-white/40 uppercase">{ex.category}</span>
                </div>
                <p className="text-xs text-white/50 mt-1 leading-relaxed">{ex.description}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {ex.difficulty.map((d) => (
                    <span key={d} className={`text-xs px-2 py-0.5 rounded-full border ${DIFFICULTY_COLORS[d]}`}>
                      {d}
                    </span>
                  ))}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Difficulty selector */}
        <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-3">
          Difficulty
        </h2>
        <div className="flex gap-3 mb-8">
          {(['beginner', 'intermediate', 'advanced'] as DifficultyLevel[]).map((d) => (
            <button
              key={d}
              disabled={!availableDifficulties.includes(d)}
              onClick={() => setSelectedDifficulty(d)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium capitalize transition-all border ${
                selectedDifficulty === d
                  ? DIFFICULTY_COLORS[d] + ' border-current'
                  : 'bg-white/5 text-white/40 border-white/10 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed'
              }`}
            >
              {d}
            </button>
          ))}
        </div>

        {/* Start button */}
        <button
          onClick={handleStart}
          className="w-full py-4 rounded-xl bg-[#338dff] hover:bg-[#2276e0] text-white font-bold text-lg transition-all shadow-lg shadow-[#338dff]/30 active:scale-95"
        >
          Start Workout
        </button>
      </main>
    </div>
  );
}
