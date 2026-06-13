import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Archive } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { actions, completionKey, dateKey, daysInMonth, useAppStore } from "@/lib/store";

export const Route = createFileRoute("/calendar")({
  head: () => ({
    meta: [
      { title: "Calendar — Monthly Task Tracker Pro" },
      { name: "description", content: "Visual monthly calendar for tracking habit completion." },
    ],
  }),
  component: CalendarPage,
});

function CalendarPage() {
  const state = useAppStore();
  const today = new Date();
  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const dim = daysInMonth(cursor.year, cursor.month);
  const monthLabel = new Date(cursor.year, cursor.month, 1).toLocaleString(undefined, {
    month: "long",
    year: "numeric",
  });

  const shift = (delta: number) => {
    const d = new Date(cursor.year, cursor.month + delta, 1);
    setCursor({ year: d.getFullYear(), month: d.getMonth() });
  };

  const isToday = (day: number) =>
    cursor.year === today.getFullYear() &&
    cursor.month === today.getMonth() &&
    day === today.getDate();

  return (
    <AppShell
      title="Calendar"
      subtitle={monthLabel}
      action={
        <Link to="/archive/$month/$year" params={{ month: String(cursor.month + 1), year: String(cursor.year) }}>
          <Button size="sm" variant="outline" className="rounded-full">
            <Archive className="h-4 w-4" />
            <span className="ml-1 hidden sm:inline">Archive</span>
          </Button>
        </Link>
      }
    >
      <div className="glass mb-4 flex items-center justify-between rounded-2xl px-3 py-2">
        <Button size="icon" variant="ghost" onClick={() => shift(-1)} aria-label="Previous month">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <span className="text-sm font-semibold">{monthLabel}</span>
        <Button size="icon" variant="ghost" onClick={() => shift(1)} aria-label="Next month">
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {state.tasks.length === 0 ? (
        <div className="glass rounded-2xl p-8 text-center text-sm text-muted-foreground">
          Add a task first to start tracking days.
        </div>
      ) : (
        <div className="space-y-4">
          {state.tasks.map((t) => (
            <div key={t.id} className="glass rounded-2xl p-4">
              <div className="mb-3 flex items-center gap-2">
                <span className="h-3 w-3 rounded-full" style={{ background: t.color }} aria-hidden />
                <h3 className="font-semibold">{t.name}</h3>
              </div>
              <div className="grid grid-cols-7 gap-1.5 sm:grid-cols-10">
                {Array.from({ length: dim }, (_, i) => i + 1).map((day) => {
                  const key = completionKey(
                    t.id,
                    `${cursor.year}-${String(cursor.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
                  );
                  const done = !!state.completions[key];
                  const td = isToday(day);
                  return (
                    <button
                      key={day}
                      onClick={() =>
                        actions.toggleCompletion(
                          t.id,
                          `${cursor.year}-${String(cursor.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
                        )
                      }
                      className={`relative aspect-square min-h-[40px] rounded-lg text-xs font-medium transition-all ${
                        done
                          ? "text-white shadow-sm"
                          : "bg-muted/60 text-muted-foreground hover:bg-muted"
                      } ${td ? "ring-2 ring-foreground ring-offset-1" : ""}`}
                      style={done ? { background: t.color } : undefined}
                      aria-label={`Day ${day} ${done ? "completed" : "not completed"}`}
                      aria-pressed={done}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 text-center text-xs text-muted-foreground">
        Today: {dateKey(today)}
      </div>
    </AppShell>
  );
}
