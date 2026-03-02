'use client';

import { useAppStore } from '@/store/appStore';
import { EXERCISE_MAP } from '@/config/exercises';
import { ArrowLeft, Calendar } from 'lucide-react';

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  if (m === 0) return `${s}s`;
  return `${m}m ${s % 60}s`;
}

function scoreTextColor(score: number): string {
  if (score >= 85) return 'text-green-400';
  if (score >= 70) return 'text-lime-400';
  if (score >= 50) return 'text-amber-400';
  return 'text-red-400';
}

export default function HistoryScreen() {
  const { sessions, setScreen } = useAppStore();

  const totalWorkouts = sessions.length;
  const totalReps = sessions.reduce((s, w) => s + w.repCount, 0);
  const avgScore =
    sessions.length > 0
      ? Math.round(sessions.reduce((s, w) => s + w.score, 0) / sessions.length)
      : 0;

  return (
    <div className="min-h-screen bg-[rgb(10,10,20)] text-white pb-8">
      <div className="max-w-lg mx-auto px-4">
        <header className="flex items-center gap-3 py-4">
          <button
            onClick={() => setScreen('landing')}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="font-semibold">History</h1>
        </header>

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Workouts', value: totalWorkouts },
            { label: 'Total Reps', value: totalReps },
            { label: 'Avg Score', value: `${avgScore}%` },
          ].map((stat) => (
            <div key={stat.label} className="bg-white/5 rounded-xl p-3 text-center">
              <div className="text-xl font-bold">{stat.value}</div>
              <div className="text-xs text-white/50 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Session list */}
        {sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-white/30">
            <Calendar size={48} />
            <p className="text-sm">No workouts yet. Start your first session!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => {
              const exercise = EXERCISE_MAP[session.exercise];
              return (
                <div key={session.id} className="bg-white/5 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{exercise?.icon ?? '🏋️'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-sm">{exercise?.name ?? session.exercise}</span>
                        <span className={`text-lg font-bold ${scoreTextColor(session.score)}`}>
                          {Math.round(session.score)}%
                        </span>
                      </div>
                      <div className="text-xs text-white/40 mt-0.5">{formatDate(session.startTime)}</div>
                      <div className="flex items-center gap-3 mt-2 text-xs text-white/50">
                        <span>{session.repCount} reps</span>
                        <span>·</span>
                        <span>{formatDuration(session.duration)}</span>
                        <span>·</span>
                        <span className="capitalize">{session.difficulty}</span>
                        <span>·</span>
                        <span>~{session.calories} kcal</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
