# AI Fitness Coach

Real-time AI-powered fitness coaching application using computer vision to analyze exercise technique.

## Features

- 🤖 **Edge AI** - MediaPipe BlazePose runs entirely in the browser (<30ms latency)
- 💪 **Push-Up Analysis** - Rep counting, elbow angle, body alignment, hip position
- 🤸 **Gymnastics Moves** - Plank, Hollow Body Hold, L-Sit, Handstand
- 🎨 **Visual Overlay** - Skeleton, joint angles, correction banners
- 🔊 **Audio Coach** - Web Speech API with priority-based cues
- 📊 **Progress Tracking** - Session history, rep quality, form trends
- 📱 **PWA Ready** - Installable, offline-first

## Architecture

```
Client (Browser) - All AI runs locally
├── Camera Capture → MediaPipe BlazePose (33 landmarks)
├── Analysis Engine (TypeScript biomechanics)
├── Canvas Overlay (skeleton + corrections + score)
├── Audio Coach (Web Speech API)
└── Optional cloud sync → FastAPI Backend → PostgreSQL
```

## Tech Stack

- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Pose Estimation**: MediaPipe BlazePose via `@mediapipe/tasks-vision`
- **State Management**: Zustand
- **Backend** (optional): FastAPI + PostgreSQL
- **Deployment**: Docker + docker-compose

## Quick Start

### Frontend Only

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### With Backend (Docker)

```bash
docker-compose up
```

Services:
- Frontend: http://localhost:3000
- API: http://localhost:8000
- API Docs: http://localhost:8000/docs

## Project Structure

```
ai-fitness-coach/
├── src/
│   ├── app/                    # Next.js App Router
│   ├── types/index.ts          # TypeScript types
│   ├── engine/
│   │   ├── PoseDetector.ts     # MediaPipe BlazePose integration
│   │   ├── biomechanics.ts     # Angle/distance calculations
│   │   ├── OverlayRenderer.ts  # Canvas overlay rendering
│   │   ├── AudioCoach.ts       # Web Speech API coaching
│   │   └── analyzers/
│   │       ├── BaseAnalyzer.ts
│   │       ├── PushupAnalyzer.ts
│   │       ├── GymnasticsAnalyzer.ts
│   │       └── AnalyzerFactory.ts
│   ├── store/appStore.ts       # Zustand state management
│   ├── config/exercises.ts     # Exercise database
│   └── components/
│       ├── screens/            # App screens
│       └── ui/ToastProvider.tsx
├── backend/
│   ├── main.py                 # FastAPI server
│   └── requirements.txt
├── prisma/schema.prisma        # Database schema
├── docker-compose.yml
└── Dockerfile
```

## Exercises Supported

| Exercise | Category | Difficulty | Metric |
|----------|----------|------------|--------|
| Push-Up | Strength | Beginner–Advanced | Rep count |
| Plank | Strength | Beginner–Advanced | Hold time |
| Hollow Body Hold | Gymnastics | Beginner–Advanced | Hold time |
| L-Sit | Gymnastics | Intermediate–Advanced | Hold time |
| Handstand | Gymnastics | Intermediate–Advanced | Hold time |

## Scoring

Form scores are color-coded:
- 🟢 **≥85%** - Excellent
- 🟡 **≥70%** - Good
- 🟠 **≥50%** - Needs work
- 🔴 **<50%** - Poor

## Privacy

All data is stored locally in your browser. No data is sent to external servers unless you configure the optional backend.

## License

MIT
