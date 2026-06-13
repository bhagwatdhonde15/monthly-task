import { useSyncExternalStore } from "react";

export type Task = {
  id: string;
  name: string;
  description?: string;
  color: string;
  createdAt: string;
};

export type User = {
  name: string;
  email: string;
  avatarUrl?: string;
};

export type AppState = {
  user: User | null;
  tasks: Task[];
  // key: `${taskId}|${YYYY-MM-DD}` -> true
  completions: Record<string, boolean>;
  theme: "light" | "dark";
  notificationsEnabled: boolean;
  reminderTime: string; // HH:mm
};

const STORAGE_KEY = "mttp:v1";

export const TASK_COLORS = [
  "#3B82F6", // blue
  "#10B981", // emerald
  "#F59E0B", // amber
  "#EF4444", // red
  "#8B5CF6", // violet
  "#EC4899", // pink
  "#14B8A6", // teal
  "#F97316", // orange
  "#6366F1", // indigo
  "#22C55E", // green
];

const DEFAULT_STATE: AppState = {
  user: null,
  tasks: [],
  completions: {},
  theme: "light",
  notificationsEnabled: false,
  reminderTime: "09:00",
};

function load(): AppState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    return { ...DEFAULT_STATE, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_STATE;
  }
}

function save(state: AppState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

let state: AppState = DEFAULT_STATE;
let hydrated = false;
const listeners = new Set<() => void>();

function ensureHydrated() {
  if (!hydrated && typeof window !== "undefined") {
    state = load();
    hydrated = true;
    applyTheme(state.theme);
  }
}

function applyTheme(theme: "light" | "dark") {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", theme === "dark");
}

function setState(updater: (prev: AppState) => AppState) {
  ensureHydrated();
  state = updater(state);
  save(state);
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  ensureHydrated();
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

function getSnapshot() {
  ensureHydrated();
  return state;
}

function getServerSnapshot() {
  return DEFAULT_STATE;
}

export function useAppStore(): AppState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

// ---------- helpers ----------
export const dateKey = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export const completionKey = (taskId: string, day: string) => `${taskId}|${day}`;

// ---------- actions ----------
export const actions = {
  signIn(user: User) {
    setState((s) => ({ ...s, user }));
  },
  signOut() {
    setState((s) => ({ ...s, user: null }));
  },
  addTask(input: { name: string; description?: string; color: string }) {
    setState((s) => {
      if (s.tasks.length >= 10) return s;
      const task: Task = {
        id: crypto.randomUUID(),
        name: input.name.trim(),
        description: input.description?.trim() || undefined,
        color: input.color,
        createdAt: new Date().toISOString(),
      };
      return { ...s, tasks: [...s.tasks, task] };
    });
  },
  updateTask(id: string, patch: Partial<Omit<Task, "id" | "createdAt">>) {
    setState((s) => ({
      ...s,
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    }));
  },
  deleteTask(id: string) {
    setState((s) => {
      const completions = { ...s.completions };
      Object.keys(completions).forEach((k) => {
        if (k.startsWith(`${id}|`)) delete completions[k];
      });
      return { ...s, tasks: s.tasks.filter((t) => t.id !== id), completions };
    });
  },
  toggleCompletion(taskId: string, day: string) {
    setState((s) => {
      const k = completionKey(taskId, day);
      const next = { ...s.completions };
      if (next[k]) delete next[k];
      else next[k] = true;
      return { ...s, completions: next };
    });
  },
  setTheme(theme: "light" | "dark") {
    applyTheme(theme);
    setState((s) => ({ ...s, theme }));
  },
  setNotifications(enabled: boolean) {
    setState((s) => ({ ...s, notificationsEnabled: enabled }));
  },
  setReminderTime(time: string) {
    setState((s) => ({ ...s, reminderTime: time }));
  },
  importState(data: Partial<AppState>) {
    setState((s) => ({ ...s, ...data }));
  },
};

// ---------- selectors ----------
export function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

export function getMonthCompletions(
  state: AppState,
  year: number,
  month: number,
) {
  const prefix = `-${String(month + 1).padStart(2, "0")}-`;
  const yearStr = String(year);
  const result: Record<string, true> = {};
  for (const k of Object.keys(state.completions)) {
    const [, day] = k.split("|");
    if (day.startsWith(yearStr) && day.includes(prefix)) result[k] = true;
  }
  return result;
}

export function taskCompletionCount(
  state: AppState,
  taskId: string,
  year: number,
  month: number,
) {
  let count = 0;
  const days = daysInMonth(year, month);
  for (let d = 1; d <= days; d++) {
    const key = completionKey(
      taskId,
      `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
    );
    if (state.completions[key]) count++;
  }
  return count;
}

export function currentStreak(state: AppState, taskId: string) {
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    if (state.completions[completionKey(taskId, dateKey(d))]) streak++;
    else break;
  }
  return streak;
}
