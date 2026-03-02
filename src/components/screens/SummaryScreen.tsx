'use client';

import { useAppStore } from '@/store/appStore';
import { EXERCISE_MAP } from '@/config/exercises';
import { Trophy, Home, RotateCcw, TrendingUp, TrendingDown, Minus } from 'lucide-react';

function scoreColor(score: number): string {
  if (score >= 85) return 'bg-green-500';
  if (score >= 70) return 'bg-lime-500';
  if (score >= 50) return 'bg-amber-500';
  return 'bg-red-500';
}

function scoreTextColor(score: number): string {
  if (score >= 85) return 'text-green-400';
  if (score >= 70) return 'text-lime-400';
  if (score >= 50) return 'text-amber-400';
  return 'text-red-400';
}

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  if (m === 0) return `${s}s`;
  return `${m}m ${s % 60}s`;
}

export default function SummaryScreen() {
  const { lastSummary, setScreen } = useAppStore();

  if (!lastSummary) {
    return (
      <div className="min-h-screen bg-[rgb(10,10,20)] text-white flex flex-col items-center justify-center gap-4">
        <p className="text-white/50">No workout data found</p>
        <button onClick={() => setScreen('landing')} className="px-6 py-3 bg-[#338dff] rounded-xl font-medium">
          Go Home
        </button>
      </div>
    );
  }

  const { session, bestRep, formTrend, improvementHighlights, nextSessionGoals, commonCorrections } = lastSummary;
  const exercise = EXERCISE_MAP[session.exercise];

  const trendIcon =
    formTrend === 'improving' ? <TrendingUp size={16} className="text-green-400" /> :
    formTrend === 'declining' ? <TrendingDown size={16} className="text-red-400" /> :
    <Minus size={16} className="text-white/50" />;

  const trendLabel =
    formTrend === 'improving' ? 'Improving' :
    formTrend === 'declining' ? 'Declining' : 'Consistent';

  return (
    <div className="min-h-screen bg-gradient-to-b from-[rgb(10,10,20)] to-[rgb(15,15,30)] text-white pb-8">
      <div className="max-w-lg mx-auto px-4">
        {/* Header */}
        <div className="pt-10 pb-6 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-500/20 mb-4">
            <Trophy size={32} className="text-amber-400" />
          </div>
          <h1 className="text-2xl font-bold">Workout Complete!</h1>
          <p className="text-white/50 text-sm mt-1 capitalize">
            {exercise?.name} · {session.difficulty}
          </p>
        </div>

        {/* Score card */}
        <div className="bg-white/5 rounded-2xl p-6 mb-4 text-center">
          <div className={`text-6xl font-extrabold ${scoreTextColor(session.score)} mb-2`}>
            {Math.round(session.score)}
          </div>
          <div className="text-white/50 text-sm mb-3">Form Score</div>
          <div className="flex items-center justify-center gap-2 text-sm">
            {trendIcon}
            <span className="text-white/70">{trendLabel}</span>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {[
            { label: 'Total Reps', value: session.repCount },
            { label: 'Duration', value: formatDuration(session.duration) },
            { label: 'Best Rep', value: bestRep ? `${Math.round(bestRep.formScore)}%` : '—' },
            { label: 'Calories', value: `~${session.calories} kcal` },
          ].map((stat) => (
            <div key={stat.label} className="bg-white/5 rounded-xl p-4 text-center">
              <div className="text-xl font-bold">{stat.value}</div>
              <div className="text-xs text-white/50 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Rep quality */}
        {session.repHistory.length > 0 && (
          <div className="bg-white/5 rounded-2xl p-4 mb-4">
            <h3 className="text-sm font-semibold text-white/70 mb-3">Rep Quality</h3>
            <div className="space-y-1.5">
              {session.repHistory.map((rep) => (
                <div key={rep.repNumber} className="flex items-center gap-3">
                  <span className="text-xs text-white/40 w-10">Rep {rep.repNumber}</span>
                  <div className="flex-1 h-4 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${scoreColor(rep.formScore)}`}
                      style={{ width: `${rep.formScore}%` }}
                    />
                  </div>
                  <span className={`text-xs font-medium w-8 text-right ${scoreTextColor(rep.formScore)}`}>
                    {Math.round(rep.formScore)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Key feedback */}
        {commonCorrections.length > 0 && (
          <div className="bg-white/5 rounded-2xl p-4 mb-4">
            <h3 className="text-sm font-semibold text-white/70 mb-3">Key Feedback</h3>
            <div className="space-y-2">
              {commonCorrections.slice(0, 4).map((c, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-white/70">{c.message}</span>
                  <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">×{c.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* What went well */}
        {improvementHighlights.length > 0 && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4 mb-4">
            <h3 className="text-sm font-semibold text-green-400 mb-2">✅ What Went Well</h3>
            <ul className="space-y-1">
              {improvementHighlights.map((h, i) => (
                <li key={i} className="text-sm text-white/70">• {h}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Next session goals */}
        {nextSessionGoals.length > 0 && (
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 mb-6">
            <h3 className="text-sm font-semibold text-blue-400 mb-2">🎯 Next Session Goals</h3>
            <ul className="space-y-1">
              {nextSessionGoals.map((g, i) => (
                <li key={i} className="text-sm text-white/70">• {g}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => setScreen('landing')}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-white/20 text-white/70 hover:bg-white/10 transition-colors font-medium text-sm"
          >
            <Home size={16} />
            Home
          </button>
          <button
            onClick={() => setScreen('calibration')}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-[#338dff] hover:bg-[#2276e0] text-white font-bold transition-all text-sm"
          >
            <RotateCcw size={16} />
            Go Again
          </button>
        </div>
      </div>
    </div>
  );
}
