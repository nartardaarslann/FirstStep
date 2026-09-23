from typing import Literal
from pydantic import BaseModel, Field, EmailStr, ConfigDict


class User(BaseModel):
    user_id: str
    email: str
    name: str
    subscription: Literal['free', 'pro'] = 'free'
    onboarding: dict | None = None
    theme: Literal['light', 'dark'] = 'light'
    created_at: str


class Register(BaseModel):
    name: str = Field(min_length=2, max_length=60)
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)


class Login(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=72)


class AuthResult(BaseModel):
    session_token: str
    user: User


class SessionExchange(BaseModel):
    session_id: str = Field(min_length=5, max_length=500)


class Onboarding(BaseModel):
    energy: Literal['low', 'variable', 'high']
    goal: Literal['balance', 'energy', 'sleep']
    prep_time: Literal['quick', 'medium', 'slow']
    stress_eating: Literal['often', 'sometimes', 'rarely']


class Macros(BaseModel):
    protein: float = Field(ge=0, le=300)
    carbs: float = Field(ge=0, le=500)
    fat: float = Field(ge=0, le=300)
    fiber: float = Field(ge=0, le=100)
    sugar: float = Field(ge=0, le=300)


class DetectInput(BaseModel):
    sample: Literal['bowl', 'oats', 'snack'] = 'bowl'
    image_id: str | None = None


class Detection(BaseModel):
    detection_id: str
    name: str
    items: list[str]
    macros: Macros
    micronutrients: dict[str, float]
    image_id: str | None = None
    simulated: bool = True


class MealInput(BaseModel):
    detection_id: str
    tag: Literal['home', 'restaurant', 'packaged']
    meal_type: Literal['breakfast', 'lunch', 'dinner', 'snack'] = 'lunch'


class Meal(Detection):
    meal_id: str
    user_id: str
    tag: str
    meal_type: str
    fni: int
    macro_balance: int
    score: int
    date: str
    timestamp: str
    local_hour: int


class LogInput(BaseModel):
    sleep: float | None = Field(default=None, ge=0, le=24)
    water: int | None = Field(default=None, ge=0, le=20)
    recovery_mode: bool | None = None
    journal_entry: str | None = Field(default=None, max_length=1000)


class DailyLog(BaseModel):
    model_config = ConfigDict(extra='ignore')
    date: str
    sleep: float | None = None
    water: int = 0
    recovery_mode: bool = False
    journal_entry: str = ''
    overall_score: int | None = None


class Subscription(BaseModel):
    tier: Literal['free', 'pro']


class ThemeInput(BaseModel):
    theme: Literal['light', 'dark']