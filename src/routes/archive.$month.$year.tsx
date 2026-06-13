import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { completionKey, daysInMonth, taskCompletionCount, useAppStore } from "@/lib/store";

export const Route = createFileRoute("/archive/$month/$year")({
  head: () => ({
    meta: [{ title: "Archive — Monthly Task Tracker Pro" }],
  }),
  component: ArchivePage,
});

function ArchivePage() {
  const { month, year } = Route.useParams();
  const state = useAppStore();
  const m = Math.max(0, Math.min(11, Number(month) - 1));
  const y = Number(year);
  const dim = daysInMonth(y, m);
  const label = new Date(y, m, 1).toLocaleString(undefined, { month: "long", year: "numeric" });

  const totals = state.tasks.map((t) => ({
    task: t,
    done: taskCompletionCount(state, t.id, y, m),
  }));
  const totalCompleted = totals.reduce((a, t) => a + t.done, 0);
  const totalPossible = state.tasks.length * dim;
  const overall = totalPossible ? Math.round((totalCompleted / totalPossible) * 100) : 0;

  return (
    <AppShell
      title={label}
      subtitle={`Archive · ${overall}% overall`}
      action={
        <Link to="/calendar">
          <Button size="sm" variant="outline" className="rounded-full">
            <ChevronLeft className="h-4 w-4" />
            <span className="ml-1 hidden sm:inline">Back</span>
          </Button>
        </Link>
      }
    >
      {state.tasks.length === 0 ? (
        <div className="glass rounded-2xl p-8 text-center text-sm text-muted-foreground">
          No tasks recorded.
        </div>
      ) : (
        <div className="space-y-4">
          {totals.map(({ task, done }) => {
            const pct = Math.round((done / dim) * 100);
            return (
              <div key={task.id} className="glass rounded-2xl p-4">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full" style={{ background: task.color }} />
                    <h3 className="font-semibold">{task.name}</h3>
                  </div>
                  <span className="text-xs text-muted-foreground">{done}/{dim} · {pct}%</span>
                </div>
                <div className="grid grid-cols-7 gap-1 sm:grid-cols-10">
                  {Array.from({ length: dim }, (_, i) => i + 1).map((day) => {
                    const key = completionKey(
                      task.id,
                      `${y}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
                    );
                    const done = !!state.completions[key];
                    return (
                      <div
                        key={day}
                        className={`aspect-square min-h-[28px] rounded-md text-[10px] flex items-center justify-center ${
                          done ? "text-white" : "bg-muted/60 text-muted-foreground"
                        }`}
                        style={done ? { background: task.color } : undefined}
                      >
                        {day}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
