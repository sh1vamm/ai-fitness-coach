'use client';

import { useState } from 'react';
import { useAppStore } from '@/store/appStore';
import { UserProfile, DifficultyLevel } from '@/types';
import { ArrowLeft, Save } from 'lucide-react';

const INJURY_OPTIONS = [
  'Lower Back', 'Knee', 'Shoulder', 'Wrist', 'Ankle', 'Neck', 'Hip', 'Elbow',
];

const FITNESS_LEVELS: { value: DifficultyLevel; label: string; desc: string }[] = [
  { value: 'beginner', label: 'Beginner', desc: 'New to fitness or returning after a break' },
  { value: 'intermediate', label: 'Intermediate', desc: 'Regular training for 6+ months' },
  { value: 'advanced', label: 'Advanced', desc: 'Serious athlete with 2+ years experience' },
];

export default function ProfileScreen() {
  const { userProfile, setUserProfile, setScreen } = useAppStore();

  const [name, setName] = useState(userProfile?.name ?? '');
  const [height, setHeight] = useState(String(userProfile?.height ?? ''));
  const [weight, setWeight] = useState(String(userProfile?.weight ?? ''));
  const [fitnessLevel, setFitnessLevel] = useState<DifficultyLevel>(userProfile?.fitnessLevel ?? 'intermediate');
  const [injuries, setInjuries] = useState<string[]>(userProfile?.injuries ?? []);
  const [saved, setSaved] = useState(false);

  const toggleInjury = (injury: string) => {
    setInjuries((prev) =>
      prev.includes(injury) ? prev.filter((i) => i !== injury) : [...prev, injury]
    );
  };

  const handleSave = () => {
    const profile: UserProfile = {
      name: name.trim(),
      height: parseFloat(height) || 170,
      weight: parseFloat(weight) || 70,
      fitnessLevel,
      injuries,
    };
    setUserProfile(profile);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

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
          <h1 className="font-semibold">Profile</h1>
        </header>

        {/* Avatar */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-full bg-[#338dff]/20 border-2 border-[#338dff]/40 flex items-center justify-center text-3xl">
            {name ? name[0].toUpperCase() : '👤'}
          </div>
        </div>

        {/* Form */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-white/50 mb-1.5 font-medium uppercase tracking-wider">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#338dff] transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-white/50 mb-1.5 font-medium uppercase tracking-wider">Height (cm)</label>
              <input
                type="number"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                placeholder="170"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#338dff] transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1.5 font-medium uppercase tracking-wider">Weight (kg)</label>
              <input
                type="number"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="70"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#338dff] transition-colors"
              />
            </div>
          </div>

          {/* Fitness level */}
          <div>
            <label className="block text-xs text-white/50 mb-2 font-medium uppercase tracking-wider">Fitness Level</label>
            <div className="space-y-2">
              {FITNESS_LEVELS.map(({ value, label, desc }) => (
                <button
                  key={value}
                  onClick={() => setFitnessLevel(value)}
                  className={`w-full text-left p-3 rounded-xl border transition-all ${
                    fitnessLevel === value
                      ? 'border-[#338dff] bg-[#338dff]/10'
                      : 'border-white/10 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <div className="text-sm font-medium">{label}</div>
                  <div className="text-xs text-white/40 mt-0.5">{desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Injuries */}
          <div>
            <label className="block text-xs text-white/50 mb-2 font-medium uppercase tracking-wider">
              Injuries / Areas to Avoid
            </label>
            <div className="flex flex-wrap gap-2">
              {INJURY_OPTIONS.map((injury) => (
                <button
                  key={injury}
                  onClick={() => toggleInjury(injury)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    injuries.includes(injury)
                      ? 'border-red-500/50 bg-red-500/20 text-red-400'
                      : 'border-white/15 bg-white/5 text-white/60 hover:bg-white/10'
                  }`}
                >
                  {injury}
                </button>
              ))}
            </div>
          </div>

          {/* Privacy notice */}
          <p className="text-xs text-white/30 text-center">
            🔒 All data stored locally on your device. Never shared.
          </p>

          {/* Save button */}
          <button
            onClick={handleSave}
            className={`w-full flex items-center justify-center gap-2 py-4 rounded-xl font-bold transition-all text-sm ${
              saved
                ? 'bg-green-600 text-white'
                : 'bg-[#338dff] hover:bg-[#2276e0] text-white'
            }`}
          >
            <Save size={16} />
            {saved ? 'Saved!' : 'Save Profile'}
          </button>
        </div>
      </div>
    </div>
  );
}
