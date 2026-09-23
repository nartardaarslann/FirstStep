export type User = { user_id: string; name: string; email: string; subscription: 'free' | 'pro'; theme: 'light' | 'dark'; onboarding: Record<string, string> | null };
export type Macros = { protein: number; carbs: number; fat: number; fiber: number; sugar: number };
export type Detection = { detection_id: string; name: string; items: string[]; macros: Macros; image_id: string | null; micronutrients: Record<string, number>; simulated: boolean };
export type Meal = Detection & { meal_id: string; tag: string; meal_type: string; score: number; fni: number; macro_balance: number; timestamp: string; date: string };
export type Log = { date: string; sleep: number | null; water: number; recovery_mode: boolean; journal_entry: string; overall_score: number | null };
export type Dashboard = { date: string; log: Log; meals: Meal[]; timeline: Log[]; macros: Macros; camera_used: number; camera_limit: number | null; micronutrients: Record<string, number> | null; insight: { triggered: boolean; title: string; message: string; disclaimer: string } | null };
export type Tab = 'today' | 'meals' | 'habits' | 'profile';