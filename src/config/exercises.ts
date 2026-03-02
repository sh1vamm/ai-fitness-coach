import { ExerciseConfig } from '@/types';

export const EXERCISES: ExerciseConfig[] = [
  {
    id: 'pushup',
    name: 'Push-Up',
    description: 'Classic upper body strength exercise targeting chest, shoulders and triceps',
    category: 'strength',
    difficulty: ['beginner', 'intermediate', 'advanced'],
    targetMuscles: ['Chest', 'Shoulders', 'Triceps', 'Core'],
    icon: '💪',
    analyzers: ['PushupAnalyzer'],
  },
  {
    id: 'plank',
    name: 'Plank Hold',
    description: 'Isometric core exercise for stability and endurance',
    category: 'strength',
    difficulty: ['beginner', 'intermediate', 'advanced'],
    targetMuscles: ['Core', 'Shoulders', 'Glutes'],
    icon: '🏋️',
    analyzers: ['GymnasticsAnalyzer'],
  },
  {
    id: 'hollow_body',
    name: 'Hollow Body Hold',
    description: 'Gymnastics foundational skill for core compression and body tension',
    category: 'gymnastics',
    difficulty: ['beginner', 'intermediate', 'advanced'],
    targetMuscles: ['Core', 'Hip Flexors', 'Shoulders'],
    icon: '🤸',
    analyzers: ['GymnasticsAnalyzer'],
  },
  {
    id: 'l_sit',
    name: 'L-Sit',
    description: 'Advanced static hold requiring hip flexion, core strength, and shoulder depression',
    category: 'gymnastics',
    difficulty: ['intermediate', 'advanced'],
    targetMuscles: ['Core', 'Hip Flexors', 'Triceps', 'Shoulders'],
    icon: '🏅',
    analyzers: ['GymnasticsAnalyzer'],
  },
  {
    id: 'handstand',
    name: 'Handstand',
    description: 'Full-body inversion exercise requiring balance, shoulder strength, and body awareness',
    category: 'gymnastics',
    difficulty: ['intermediate', 'advanced'],
    targetMuscles: ['Shoulders', 'Core', 'Wrists', 'Upper Back'],
    icon: '🙃',
    analyzers: ['GymnasticsAnalyzer'],
  },
];

export const EXERCISE_MAP = Object.fromEntries(EXERCISES.map((e) => [e.id, e]));
