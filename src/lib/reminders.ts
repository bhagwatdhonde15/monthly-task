import { useEffect, useRef } from "react";
import { showLocalNotification } from "./pwa";
import { type AppState, useAppStore } from "./store";
import { currentStreak } from "./store";

const STREAK_MILESTONES = [7, 14, 30, 100];
const NOTIFIED_KEY = "mttp:notified-v1";
const REMINDER_KEY = "mttp:reminder-v1";

type Notified = Record<string, true>;

function loadNotified(): Notified {
  try {
    return JSON.parse(localStorage.getItem(NOTIFIED_KEY) ?? "{}");
  } catch {
    return {};
  }
}
function saveNotified(n: Notified) {
  try {
    localStorage.setItem(NOTIFIED_KEY, JSON.stringify(n));
  } catch {
    /* ignore */
  }
}

function checkStreaks(state: AppState) {
  if (!state.notificationsEnabled) return;
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  const notified = loadNotified();
  state.tasks.forEach((t) => {
    const streak = currentStreak(state, t.id);
    STREAK_MILESTONES.forEach((m) => {
      const key = `${t.id}:${m}`;
      if (streak >= m && !notified[key]) {
        showLocalNotification(
          `🔥 ${m}-day streak!`,
          `Amazing — you've completed "${t.name}" ${m} days in a row.`,
        );
        notified[key] = true;
      }
    });
  });
  saveNotified(notified);
}

function maybeRemind(state: AppState) {
  if (!state.notificationsEnabled || state.tasks.length === 0) return;
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  const [h, m] = state.reminderTime.split(":").map(Number);
  const now = new Date();
  const target = new Date();
  target.setHours(h, m, 0, 0);
  if (now < target) return; // not yet
  const todayKey = now.toISOString().slice(0, 10);
  let last = "";
  try {
    last = localStorage.getItem(REMINDER_KEY) ?? "";
  } catch {
    /* ignore */
  }
  if (last === todayKey) return;

  const incomplete = state.tasks.filter(
    (t) => !state.completions[`${t.id}|${todayKey}`],
  );
  if (incomplete.length === 0) return;
  showLocalNotification(
    "Daily habit reminder",
    `${incomplete.length} task${incomplete.length === 1 ? "" : "s"} still to check off today.`,
  );
  try {
    localStorage.setItem(REMINDER_KEY, todayKey);
  } catch {
    /* ignore */
  }
}

export function useReminders() {
  const state = useAppStore();
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    checkStreaks(state);
    maybeRemind(state);
    if (ref.current) clearInterval(ref.current);
    ref.current = setInterval(() => {
      checkStreaks(state);
      maybeRemind(state);
    }, 60_000);
    return () => {
      if (ref.current) clearInterval(ref.current);
    };
  }, [state]);
}
