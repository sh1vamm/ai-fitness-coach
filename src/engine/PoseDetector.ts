'use client';

import { PoseData, Landmark } from '@/types';

type PoseResultCallback = (poseData: PoseData | null) => void;
type FPSCallback = (fps: number) => void;

export class PoseDetector {
  private poseLandmarker: unknown = null;
  private isRunning = false;
  private videoElement: HTMLVideoElement | null = null;
  private canvasElement: HTMLCanvasElement | null = null;
  private lastFrameTime = 0;
  private frameCount = 0;
  private fpsTimer = 0;
  private onPoseResult: PoseResultCallback;
  private onFPS: FPSCallback;
  private animationId = 0;
  private initialized = false;

  constructor(onPoseResult: PoseResultCallback, onFPS: FPSCallback) {
    this.onPoseResult = onPoseResult;
    this.onFPS = onFPS;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    try {
      const { PoseLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm'
      );
      this.poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/1/pose_landmarker_heavy.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numPoses: 1,
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
      this.initialized = true;
    } catch {
      // Fallback to CPU / lite model
      try {
        const { PoseLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm'
        );
        this.poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
            delegate: 'CPU',
          },
          runningMode: 'VIDEO',
          numPoses: 1,
        });
        this.initialized = true;
      } catch (err) {
        console.error('Failed to initialize pose detector:', err);
        throw err;
      }
    }
  }

  async startCamera(facingMode: 'user' | 'environment' = 'user'): Promise<HTMLVideoElement> {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
    });
    const video = document.createElement('video');
    video.srcObject = stream;
    video.autoplay = true;
    video.playsInline = true;
    await new Promise<void>((resolve) => {
      video.onloadedmetadata = () => resolve();
    });
    this.videoElement = video;
    return video;
  }

  start(): void {
    if (this.isRunning || !this.poseLandmarker || !this.videoElement) return;
    this.isRunning = true;
    this.processFrame();
  }

  stop(): void {
    this.isRunning = false;
    if (this.animationId) cancelAnimationFrame(this.animationId);
    if (this.videoElement?.srcObject) {
      (this.videoElement.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
    }
  }

  private processFrame(): void {
    if (!this.isRunning || !this.poseLandmarker || !this.videoElement) return;

    const now = performance.now();
    const elapsed = now - this.lastFrameTime;

    // Throttle to ~30fps
    if (elapsed < 33) {
      this.animationId = requestAnimationFrame(() => this.processFrame());
      return;
    }
    this.lastFrameTime = now;

    // FPS counter
    this.frameCount++;
    if (now - this.fpsTimer >= 1000) {
      this.onFPS(this.frameCount);
      this.frameCount = 0;
      this.fpsTimer = now;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (this.poseLandmarker as any).detectForVideo(this.videoElement, now);
      if (result.landmarks && result.landmarks.length > 0) {
        const poseData: PoseData = {
          landmarks: result.landmarks[0] as Landmark[],
          worldLandmarks: result.worldLandmarks?.[0] ?? result.landmarks[0] as Landmark[],
          timestamp: now,
        };
        this.onPoseResult(poseData);
      } else {
        this.onPoseResult(null);
      }
    } catch {
      this.onPoseResult(null);
    }

    this.animationId = requestAnimationFrame(() => this.processFrame());
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  destroy(): void {
    this.stop();
    this.initialized = false;
    this.poseLandmarker = null;
  }
}
