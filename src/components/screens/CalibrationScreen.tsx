'use client';

import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '@/store/appStore';
import { PoseDetector } from '@/engine/PoseDetector';
import { PoseData } from '@/types';
import { ArrowLeft, RotateCcw } from 'lucide-react';

const CALIBRATION_TIPS = [
  '📏 Stand 6-8 feet from camera',
  '💡 Ensure good lighting (face a window)',
  '👕 Wear form-fitting clothes',
  '📷 Position camera at body height',
];

export default function CalibrationScreen() {
  const { setScreen, setCameraReady } = useAppStore();
  const videoRef = useRef<HTMLVideoElement>(null);
  const detectorRef = useRef<PoseDetector | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [poseQuality, setPoseQuality] = useState(0);
  const [stableFrames, setStableFrames] = useState(0);
  const stableRef = useRef(0);
  const REQUIRED_STABLE = 20;

  const init = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const detector = new PoseDetector(
        (poseData: PoseData | null) => {
          if (poseData) {
            const visible = poseData.landmarks.filter((l) => (l.visibility ?? 0) > 0.5).length;
            const quality = Math.min(100, (visible / 20) * 100);
            setPoseQuality(quality);
            if (quality > 60) {
              stableRef.current = Math.min(stableRef.current + 1, REQUIRED_STABLE);
            } else {
              stableRef.current = Math.max(0, stableRef.current - 1);
            }
            setStableFrames(stableRef.current);
          } else {
            setPoseQuality(0);
            stableRef.current = Math.max(0, stableRef.current - 2);
            setStableFrames(stableRef.current);
          }
        },
        () => {}
      );

      await detector.initialize();
      const video = await detector.startCamera('user');

      if (videoRef.current) {
        videoRef.current.srcObject = video.srcObject;
        videoRef.current.play().catch(() => {});
      }

      detector.start();
      detectorRef.current = detector;
      setIsLoading(false);
    } catch {
      setError('Failed to access camera or load AI model. Please check permissions.');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    init();
    return () => {
      detectorRef.current?.destroy();
    };
  }, []);

  const handleStart = () => {
    setCameraReady(true);
    setScreen('workout');
  };

  const qualityColor =
    poseQuality >= 80 ? 'bg-green-500' : poseQuality >= 50 ? 'bg-amber-500' : 'bg-red-500';
  const progress = (stableFrames / REQUIRED_STABLE) * 100;
  const canStart = stableFrames >= REQUIRED_STABLE;

  return (
    <div className="min-h-screen bg-[rgb(10,10,20)] text-white flex flex-col">
      <header className="flex items-center gap-3 px-4 py-4">
        <button
          onClick={() => {
            detectorRef.current?.destroy();
            setScreen('landing');
          }}
          className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="font-semibold">Calibration</h1>
      </header>

      <div className="flex-1 flex flex-col max-w-lg mx-auto w-full px-4 pb-6 gap-4">
        {/* Camera preview */}
        <div className="relative rounded-2xl overflow-hidden bg-white/5 aspect-video">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            style={{ transform: 'scaleX(-1)' }}
            autoPlay
            playsInline
            muted
          />
          {isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60">
              <div className="w-10 h-10 border-3 border-t-[#338dff] border-white/20 rounded-full animate-spin border-[3px]" />
              <span className="text-sm text-white/70">Loading AI model...</span>
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 p-4">
              <p className="text-sm text-red-400 text-center">{error}</p>
              <button
                onClick={init}
                className="flex items-center gap-2 px-4 py-2 bg-[#338dff] rounded-lg text-sm font-medium"
              >
                <RotateCcw size={15} />
                Retry
              </button>
            </div>
          )}
        </div>

        {/* Pose quality */}
        {!isLoading && !error && (
          <div className="bg-white/5 rounded-xl p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-white/70">Pose Quality</span>
              <span className="text-sm font-semibold">{Math.round(poseQuality)}%</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${qualityColor}`}
                style={{ width: `${poseQuality}%` }}
              />
            </div>
            <div className="mt-3">
              <div className="flex justify-between text-xs text-white/50 mb-1">
                <span>Stable frames</span>
                <span>{stableFrames}/{REQUIRED_STABLE}</span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#338dff] transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Tips */}
        <div className="bg-white/5 rounded-xl p-4">
          <h3 className="text-sm font-semibold mb-3 text-white/70">Setup Tips</h3>
          <ul className="space-y-2">
            {CALIBRATION_TIPS.map((tip) => (
              <li key={tip} className="text-sm text-white/60">
                {tip}
              </li>
            ))}
          </ul>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 mt-auto">
          <button
            onClick={() => {
              detectorRef.current?.destroy();
              setScreen('landing');
            }}
            className="flex-1 py-3 rounded-xl border border-white/20 text-white/70 hover:bg-white/10 transition-colors text-sm font-medium"
          >
            Back
          </button>
          <button
            disabled={!canStart}
            onClick={handleStart}
            className="flex-1 py-3 rounded-xl bg-[#338dff] hover:bg-[#2276e0] text-white font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed text-sm"
          >
            Start Exercise
          </button>
        </div>
      </div>
    </div>
  );
}
