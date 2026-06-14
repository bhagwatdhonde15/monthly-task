import {
  type AppState,
  completionKey,
  dateKey,
  daysInMonth,
  taskCompletionCount,
} from "./store";

export type Badge = {
  id: string;
  label: string;
  description: string;
  threshold: number;
  unit: "day" | "week" | "month";
  earned: boolean;
};

export function longestStreak(state: AppState, taskId: string): number {
  let best = 0;
  let cur = 0;
  const today = new Date();
  // Walk back up to 2 years
  for (let i = 730; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    if (state.completions[completionKey(taskId, dateKey(d))]) {
      cur++;
      if (cur > best) best = cur;
    } else {
      cur = 0;
    }
  }
  return best;
}

// A "week" counts if user completed task on all days they had it (or >=5 days).
export function currentWeeklyStreak(state: AppState, taskId: string): number {
  let weeks = 0;
  const today = new Date();
  // Start from current week's Monday
  const monday = new Date(today);
  const dow = (monday.getDay() + 6) % 7; // 0=Mon
  monday.setDate(monday.getDate() - dow);

  for (let w = 0; w < 104; w++) {
    let done = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() - w * 7 + i);
      if (d > today) continue;
      if (state.completions[completionKey(taskId, dateKey(d))]) done++;
    }
    if (done >= 5) weeks++;
    else break;
  }
  return weeks;
}

export function totalCompletions(state: AppState, taskId?: string): number {
  let n = 0;
  for (const k of Object.keys(state.completions)) {
    if (!state.completions[k]) continue;
    if (taskId && !k.startsWith(`${taskId}|`)) continue;
    n++;
  }
  return n;
}

export function badgesFor(state: AppState): Badge[] {
  // Best streak across all tasks
  let bestStreak = 0;
  let bestWeekly = 0;
  state.tasks.forEach((t) => {
    bestStreak = Math.max(bestStreak, longestStreak(state, t.id));
    bestWeekly = Math.max(bestWeekly, currentWeeklyStreak(state, t.id));
  });

  // Perfect months: any task completed every day of a past month
  let perfectMonths = 0;
  const today = new Date();
  const seenMonths = new Set<string>();
  for (const key of Object.keys(state.completions)) {
    const [, day] = key.split("|");
    seenMonths.add(day.slice(0, 7));
  }
  seenMonths.forEach((ym) => {
    const [y, m] = ym.split("-").map(Number);
    const dim = daysInMonth(y, m - 1);
    // Only count past or current month
    if (y > today.getFullYear() || (y === today.getFullYear() && m - 1 > today.getMonth())) return;
    for (const t of state.tasks) {
      if (taskCompletionCount(state, t.id, y, m - 1) === dim) {
        perfectMonths++;
        break;
      }
    }
  });

  const defs: Omit<Badge, "earned">[] = [
    { id: "streak-7", label: "Week Warrior", description: "7-day streak on any task", threshold: 7, unit: "day" },
    { id: "streak-14", label: "Fortnight Hero", description: "14-day streak on any task", threshold: 14, unit: "day" },
    { id: "streak-30", label: "Monthly Master", description: "30-day streak on any task", threshold: 30, unit: "day" },
    { id: "streak-100", label: "Century Club", description: "100-day streak on any task", threshold: 100, unit: "day" },
    { id: "weekly-4", label: "Consistent Month", description: "4 weeks of 5+ check-ins", threshold: 4, unit: "week" },
    { id: "perfect-1", label: "Perfect Month", description: "Completed a task every day of a month", threshold: 1, unit: "month" },
  ];

  return defs.map((d) => {
    const value = d.unit === "day" ? bestStreak : d.unit === "week" ? bestWeekly : perfectMonths;
    return { ...d, earned: value >= d.threshold };
  });
}
