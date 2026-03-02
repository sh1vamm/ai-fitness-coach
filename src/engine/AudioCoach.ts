'use client';

export class AudioCoach {
  private synth: SpeechSynthesis | null = null;
  private voice: SpeechSynthesisVoice | null = null;
  private enabled = true;
  private volume = 1;
  private rate = 1;
  private lastSpoken: Record<string, number> = {};
  private readonly cooldowns = { high: 3000, medium: 5000, low: 8000 };

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.loadVoice();
    }
  }

  private loadVoice(): void {
    const setVoice = () => {
      if (!this.synth) return;
      const voices = this.synth.getVoices();
      this.voice =
        voices.find(
          (v) =>
            v.lang.startsWith('en') &&
            v.name.toLowerCase().includes('female')
        ) ||
        voices.find((v) => v.lang.startsWith('en')) ||
        voices[0] ||
        null;
    };
    setVoice();
    if (this.synth && this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = setVoice;
    }
  }

  speak(message: string, priority: 'high' | 'medium' | 'low' = 'medium'): void {
    if (!this.enabled || !this.synth) return;

    const now = Date.now();
    const lastTime = this.lastSpoken[message] ?? 0;
    const cooldown = this.cooldowns[priority];

    if (now - lastTime < cooldown) return;

    this.lastSpoken[message] = now;
    this.synth.cancel();

    const utterance = new SpeechSynthesisUtterance(message);
    if (this.voice) utterance.voice = this.voice;
    utterance.volume = this.volume;
    utterance.rate = this.rate;
    this.synth.speak(utterance);
  }

  announceRep(repCount: number, score: number): void {
    const quality = score >= 85 ? 'Perfect form!' : score >= 70 ? 'Good rep.' : 'Watch your form.';
    this.speak(`Rep ${repCount}. ${quality}`, 'high');
  }

  announceCorrection(message: string, severity: 'critical' | 'moderate' | 'minor'): void {
    const priority = severity === 'critical' ? 'high' : severity === 'moderate' ? 'medium' : 'low';
    this.speak(message, priority);
  }

  announcePhase(phase: string): void {
    const messages: Record<string, string> = {
      hold: 'Hold it!',
      starting: 'Getting into position.',
      idle: 'Ready when you are.',
    };
    const msg = messages[phase];
    if (msg) this.speak(msg, 'medium');
  }

  announceHoldMilestone(seconds: number): void {
    this.speak(`${seconds} seconds.`, 'low');
  }

  announceWorkoutStart(exerciseName: string): void {
    this.speak(`Starting ${exerciseName}. Let us go!`, 'high');
  }

  announceWorkoutEnd(repCount: number, avgScore: number): void {
    this.speak(
      `Workout complete. ${repCount} reps with ${Math.round(avgScore)} percent average form. Great job!`,
      'high'
    );
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled && this.synth) this.synth.cancel();
  }

  setVolume(volume: number): void {
    this.volume = Math.min(1, Math.max(0, volume));
  }

  setRate(rate: number): void {
    this.rate = Math.min(2, Math.max(0.5, rate));
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}
