'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAppStore } from '@/store/appStore';
import { PoseDetector } from '@/engine/PoseDetector';
import { AnalyzerFactory } from '@/engine/analyzers/AnalyzerFactory';
import { OverlayRenderer } from '@/engine/OverlayRenderer';
import { AudioCoach } from '@/engine/AudioCoach';
import { BaseAnalyzer } from '@/engine/analyzers/BaseAnalyzer';
import { FormAnalysis, PoseData, ExercisePhase, RepData } from '@/types';
import { EXERCISE_MAP } from '@/config/exercises';
import { Volume2, VolumeX, Grid, Pause, Play, StopCircle } from 'lucide-react';

function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m.toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
}

function formatHoldTime(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`;
}

function scoreColor(score: number): string {
  if (score >= 85) return 'text-green-400';
  if (score >= 70) return 'text-lime-400';
  if (score >= 50) return 'text-amber-400';
  return 'text-red-400';
}

const MET_VALUES: Record<string, number> = {
  pushup: 8,
  plank: 4,
  hollow_body: 4,
  l_sit: 5,
  handstand: 6,
};

export default function WorkoutScreen() {
  const {
    selectedExercise,
    selectedDifficulty,
    overlaySettings,
    setOverlaySettings,
    audioEnabled,
    setAudioEnabled,
    setCameraFPS,
    setCurrentAnalysis,
    startWorkout,
    finishWorkout,
    setScreen,
    userProfile,
  } = useAppStore();

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const detectorRef = useRef<PoseDetector | null>(null);
  const analyzerRef = useRef<BaseAnalyzer | null>(null);
  const rendererRef = useRef<OverlayRenderer | null>(null);
  const audioRef = useRef<AudioCoach | null>(null);
  const lastPhaseRef = useRef<ExercisePhase>('idle');
  const lastRepCountRef = useRef(0);
  const repHistoryRef = useRef<RepData[]>([]);
  const correctionsAccRef = useRef<string[]>([]);
  const scoreAccRef = useRef<number[]>([]);
  const startTimeRef = useRef(Date.now());

  const [isPaused, setIsPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [fps, setFps] = useState(0);
  const [analysis, setAnalysis] = useState<FormAnalysis | null>(null);
  const isPausedRef = useRef(false);

  const exercise = EXERCISE_MAP[selectedExercise];
  const isHoldExercise = selectedExercise !== 'pushup';

  const handlePoseResult = useCallback(
    (poseData: PoseData | null) => {
      if (!poseData || isPausedRef.current || !analyzerRef.current) return;

      const result = analyzerRef.current.analyze(
        poseData.landmarks,
        poseData.worldLandmarks,
        poseData.timestamp
      );

      setAnalysis(result);
      setCurrentAnalysis(result);
      scoreAccRef.current.push(result.score);

      // Accumulate corrections
      for (const c of result.corrections) {
        correctionsAccRef.current.push(c.message);
      }

      // Overlay
      if (rendererRef.current && canvasRef.current && videoRef.current) {
        const { videoWidth, videoHeight } = videoRef.current;
        if (videoWidth && videoHeight) {
          rendererRef.current.resize(videoWidth, videoHeight);
        }
        rendererRef.current.render(poseData.landmarks, result, overlaySettings, poseData.timestamp);
      }

      // Audio cues
      if (audioRef.current && audioEnabled) {
        const phase = result.phase;
        if (phase !== lastPhaseRef.current) {
          audioRef.current.announcePhase(phase);
          lastPhaseRef.current = phase;
        }
        if (result.repCount > lastRepCountRef.current) {
          lastRepCountRef.current = result.repCount;
          repHistoryRef.current = analyzerRef.current.getRepHistory();
          const lastRep = repHistoryRef.current[repHistoryRef.current.length - 1];
          if (lastRep) audioRef.current.announceRep(result.repCount, lastRep.formScore);
        }
        if (result.corrections.length > 0) {
          const crit = result.corrections.find(c => c.severity === 'critical');
          if (crit) audioRef.current.announceCorrection(crit.message, 'critical');
        }
      }
    },
    [overlaySettings, audioEnabled, setCurrentAnalysis]
  );

  useEffect(() => {
    const setup = async () => {
      try {
        const detector = new PoseDetector(handlePoseResult, (fps) => {
          setFps(fps);
          setCameraFPS(fps);
        });
        await detector.initialize();
        const video = await detector.startCamera('user');

        if (videoRef.current) {
          videoRef.current.srcObject = video.srcObject;
          await videoRef.current.play().catch(() => {});
        }

        if (canvasRef.current) {
          rendererRef.current = new OverlayRenderer(canvasRef.current);
        }

        analyzerRef.current = AnalyzerFactory.create(selectedExercise, selectedDifficulty);
        audioRef.current = new AudioCoach();
        audioRef.current.setEnabled(audioEnabled);

        detectorRef.current = detector;
        detector.start();

        startWorkout();
        startTimeRef.current = Date.now();

        if (audioRef.current) {
          audioRef.current.announceWorkoutStart(exercise?.name ?? selectedExercise);
        }
      } catch (err) {
        console.error('Workout setup failed:', err);
        setScreen('calibration');
      }
    };

    setup();

    const timer = setInterval(() => {
      if (!isPausedRef.current) {
        setElapsed(Date.now() - startTimeRef.current);
      }
    }, 1000);

    return () => {
      clearInterval(timer);
      detectorRef.current?.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePause = () => {
    const newPaused = !isPaused;
    setIsPaused(newPaused);
    isPausedRef.current = newPaused;
  };

  const handleStop = () => {
    detectorRef.current?.destroy();

    const reps = analyzerRef.current?.getRepHistory() ?? [];
    const allCorrections = correctionsAccRef.current;
    const avgScore = scoreAccRef.current.length > 0
      ? scoreAccRef.current.reduce((a, b) => a + b, 0) / scoreAccRef.current.length
      : 0;

    // Calorie estimate (MET-based)
    const weightKg = userProfile?.weight ?? 70;
    const durationHours = elapsed / 3600000;
    const met = MET_VALUES[selectedExercise] ?? 6;
    const calories = Math.round(met * weightKg * durationHours);

    if (audioRef.current) {
      audioRef.current.announceWorkoutEnd(reps.length, avgScore);
    }

    finishWorkout(reps, allCorrections, calories);
    setScreen('summary');
  };

  return (
    <div className="fixed inset-0 bg-black flex flex-col">
      {/* Video + Canvas */}
      <div className="relative flex-1 overflow-hidden">
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ transform: 'scaleX(-1)' }}
          autoPlay
          playsInline
          muted
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pose-canvas"
          style={{ transform: 'scaleX(-1)' }}
        />

        {/* Top HUD */}
        <div className="absolute top-0 left-0 right-0 p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="backdrop-blur-md bg-black/40 rounded-lg px-3 py-1.5 text-sm font-mono font-bold">
              {formatTime(elapsed)}
            </div>
            <div className="backdrop-blur-md bg-black/40 rounded-lg px-2 py-1.5 text-xs text-white/60">
              {fps} fps
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const newEnabled = !audioEnabled;
                setAudioEnabled(newEnabled);
                audioRef.current?.setEnabled(newEnabled);
              }}
              className="p-2 backdrop-blur-md bg-black/40 rounded-lg"
            >
              {audioEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
            <button
              onClick={() => setOverlaySettings({ showSkeleton: !overlaySettings.showSkeleton })}
              className={`p-2 backdrop-blur-md rounded-lg ${overlaySettings.showSkeleton ? 'bg-[#338dff]/50' : 'bg-black/40'}`}
            >
              <Grid size={16} />
            </button>
          </div>
        </div>

        {/* Phase indicator */}
        {analysis && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2">
            <span className="backdrop-blur-md bg-black/50 px-3 py-1 rounded-full text-xs font-medium capitalize">
              {analysis.phase}
            </span>
          </div>
        )}

        {/* Bottom HUD */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="backdrop-blur-md bg-black/50 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-4">
              {/* Rep count or hold time */}
              <div className="text-center">
                <div className="text-3xl font-bold">
                  {isHoldExercise
                    ? formatHoldTime(analysis?.holdTime ?? 0)
                    : analysis?.repCount ?? 0}
                </div>
                <div className="text-xs text-white/50">{isHoldExercise ? 'Hold Time' : 'Reps'}</div>
              </div>

              {/* Score */}
              <div className="text-center">
                <div className={`text-3xl font-bold ${scoreColor(analysis?.score ?? 0)}`}>
                  {Math.round(analysis?.score ?? 0)}
                </div>
                <div className="text-xs text-white/50">Form Score</div>
              </div>

              {/* Exercise name */}
              <div className="text-center">
                <div className="text-2xl">{exercise?.icon}</div>
                <div className="text-xs text-white/50 capitalize">{selectedDifficulty}</div>
              </div>
            </div>

            {/* Controls */}
            <div className="flex gap-3">
              <button
                onClick={handlePause}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-white/10 hover:bg-white/20 transition-colors font-medium text-sm"
              >
                {isPaused ? <Play size={16} /> : <Pause size={16} />}
                {isPaused ? 'Resume' : 'Pause'}
              </button>
              <button
                onClick={handleStop}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-red-600 hover:bg-red-700 transition-colors font-medium text-sm"
              >
                <StopCircle size={16} />
                Stop
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
