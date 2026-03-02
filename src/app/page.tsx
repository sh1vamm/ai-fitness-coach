'use client';

import { useAppStore } from '@/store/appStore';
import LandingScreen from '@/components/screens/LandingScreen';
import CalibrationScreen from '@/components/screens/CalibrationScreen';
import WorkoutScreen from '@/components/screens/WorkoutScreen';
import SummaryScreen from '@/components/screens/SummaryScreen';
import ProfileScreen from '@/components/screens/ProfileScreen';
import HistoryScreen from '@/components/screens/HistoryScreen';

export default function Home() {
  const { currentScreen } = useAppStore();

  switch (currentScreen) {
    case 'landing': return <LandingScreen />;
    case 'calibration': return <CalibrationScreen />;
    case 'workout': return <WorkoutScreen />;
    case 'summary': return <SummaryScreen />;
    case 'profile': return <ProfileScreen />;
    case 'history': return <HistoryScreen />;
    default: return <LandingScreen />;
  }
}
