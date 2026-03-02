from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import uuid

app = FastAPI(title="AI Fitness Coach API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory store (replace with PostgreSQL via Prisma for production)
profiles_db: dict = {}
workouts_db: dict = {}


class UserProfileIn(BaseModel):
    name: str
    height: Optional[float] = None
    weight: Optional[float] = None
    fitnessLevel: str = "intermediate"
    injuries: List[str] = []


class UserProfileOut(UserProfileIn):
    id: str
    createdAt: str
    updatedAt: str


class RepData(BaseModel):
    repNumber: int
    formScore: float
    duration: float
    minElbowAngle: Optional[float] = None
    corrections: List[str] = []
    timestamp: float


class WorkoutSessionIn(BaseModel):
    userId: str
    exercise: str
    difficulty: str
    startTime: float
    endTime: float
    duration: float
    repCount: int
    score: float
    calories: int
    repHistory: List[RepData] = []
    corrections: List[str] = []


class WorkoutSessionOut(WorkoutSessionIn):
    id: str
    createdAt: str


@app.get("/health")
def health():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}


@app.post("/api/profiles", response_model=UserProfileOut)
def create_profile(profile: UserProfileIn):
    profile_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    record = {**profile.model_dump(), "id": profile_id, "createdAt": now, "updatedAt": now}
    profiles_db[profile_id] = record
    return record


@app.get("/api/profiles/{user_id}", response_model=UserProfileOut)
def get_profile(user_id: str):
    if user_id not in profiles_db:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profiles_db[user_id]


@app.put("/api/profiles/{user_id}", response_model=UserProfileOut)
def update_profile(user_id: str, profile: UserProfileIn):
    if user_id not in profiles_db:
        raise HTTPException(status_code=404, detail="Profile not found")
    now = datetime.utcnow().isoformat()
    record = {**profile.model_dump(), "id": user_id,
              "createdAt": profiles_db[user_id]["createdAt"], "updatedAt": now}
    profiles_db[user_id] = record
    return record


@app.post("/api/workouts", response_model=WorkoutSessionOut)
def save_workout(session: WorkoutSessionIn):
    session_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    record = {**session.model_dump(), "id": session_id, "createdAt": now}
    workouts_db[session_id] = record
    return record


@app.get("/api/workouts/{user_id}")
def get_workouts(user_id: str):
    user_workouts = [w for w in workouts_db.values() if w.get("userId") == user_id]
    user_workouts.sort(key=lambda w: w["startTime"], reverse=True)

    # Calculate streak
    streak = 0
    if user_workouts:
        try:
            dates = sorted(set(
                datetime.fromtimestamp(w["startTime"] / 1000).date()
                for w in user_workouts
                if isinstance(w.get("startTime"), (int, float)) and w["startTime"] > 0
            ), reverse=True)
            today = datetime.utcnow().date()
            for i, date in enumerate(dates):
                delta = (today - date).days
                if delta <= i + 1:
                    streak += 1
                else:
                    break
        except (ValueError, OSError):
            streak = 0

    return {"workouts": user_workouts, "streak": streak, "total": len(user_workouts)}


@app.get("/api/analytics/{user_id}/{exercise}")
def get_analytics(user_id: str, exercise: str):
    user_workouts = [
        w for w in workouts_db.values()
        if w.get("userId") == user_id and w.get("exercise") == exercise
    ]
    if not user_workouts:
        return {"scoreTrend": [], "commonCorrections": [], "personalBest": None}

    score_trend = [{"date": w["createdAt"], "score": w["score"]} for w in user_workouts]

    correction_count: dict = {}
    for w in user_workouts:
        for c in w.get("corrections", []):
            correction_count[c] = correction_count.get(c, 0) + 1
    common_corrections = sorted(
        [{"message": k, "count": v} for k, v in correction_count.items()],
        key=lambda x: x["count"],
        reverse=True
    )[:5]

    personal_best = max(user_workouts, key=lambda w: w["score"]) if user_workouts else None

    return {
        "scoreTrend": score_trend,
        "commonCorrections": common_corrections,
        "personalBest": personal_best,
    }
