import { BaseAnalyzer } from './BaseAnalyzer';
import { PushupAnalyzer } from './PushupAnalyzer';
import { GymnasticsAnalyzer } from './GymnasticsAnalyzer';
import { ExerciseType, DifficultyLevel } from '@/types';

export class AnalyzerFactory {
  static create(exerciseType: ExerciseType, difficulty: DifficultyLevel = 'intermediate'): BaseAnalyzer {
    switch (exerciseType) {
      case 'pushup':
        return new PushupAnalyzer(difficulty);
      case 'plank':
      case 'hollow_body':
      case 'l_sit':
      case 'handstand':
        return new GymnasticsAnalyzer(exerciseType, difficulty);
      default:
        return new PushupAnalyzer(difficulty);
    }
  }
}
