import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, Flame, Target, CheckCircle2, TrendingUp } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import {
  actions,
  completionKey,
  currentStreak,
  dateKey,
  daysInMonth,
  taskCompletionCount,
  useAppStore,
} from "@/lib/store";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Monthly Task Tracker Pro" },
      { name: "description", content: "Your monthly habit progress at a glance." },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const state = useAppStore();
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const dim = daysInMonth(year, month);
  const monthLabel = today.toLocaleString(undefined, { month: "long", year: "numeric" });

  const totalCompleted = state.tasks.reduce(
    (acc, t) => acc + taskCompletionCount(state, t.id, year, month),
    0,
  );
  const totalPossible = state.tasks.length * dim;
  const overall = totalPossible ? Math.round((totalCompleted / totalPossible) * 100) : 0;

  const todayKey = dateKey(today);
  const completedToday = state.tasks.filter(
    (t) => state.completions[completionKey(t.id, todayKey)],
  ).length;

  return (
    <AppShell
      title={`Hi${state.user ? `, ${state.user.name.split(" ")[0]}` : ""} 👋`}
      subtitle={monthLabel}
      action={
        <Link to="/tasks">
          <Button size="sm" className="rounded-full">
            <Plus className="h-4 w-4" />
            <span className="ml-1 hidden sm:inline">Task</span>
          </Button>
        </Link>
      }
    >
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={Target} label="Active tasks" value={`${state.tasks.length}/10`} tint="primary" />
        <StatCard icon={CheckCircle2} label="Today" value={`${completedToday}/${state.tasks.length || 0}`} tint="secondary" />
        <StatCard icon={TrendingUp} label="This month" value={`${totalCompleted}`} tint="accent" />
        <StatCard icon={Flame} label="Overall" value={`${overall}%`} tint="success" />
      </section>

      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">Your tasks</h2>
          <Link to="/tasks" className="text-xs font-medium text-primary">
            Manage
          </Link>
        </div>

        {state.tasks.length === 0 ? (
          <EmptyTasks />
        ) : (
          <ul className="space-y-3">
            {state.tasks.map((t) => {
              const done = taskCompletionCount(state, t.id, year, month);
              const pct = Math.round((done / dim) * 100);
              const streak = currentStreak(state, t.id);
              const completedToday = !!state.completions[completionKey(t.id, todayKey)];
              return (
                <li key={t.id} className="glass rounded-2xl p-4">
                  <div className="flex items-center gap-3">
                    <span
                      className="h-10 w-10 shrink-0 rounded-xl"
                      style={{ background: t.color }}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="truncate font-semibold">{t.name}</h3>
                        <span className="text-xs text-muted-foreground">
                          {done}/{dim} days
                        </span>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, background: t.color }}
                        />
                      </div>
                      <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Flame className="h-3.5 w-3.5 text-accent" /> {streak}d streak
                        </span>
                        <span>{pct}% this month</span>
                      </div>
                    </div>
                    <Button
                      variant={completedToday ? "default" : "outline"}
                      size="sm"
                      className="shrink-0 rounded-full"
                      onClick={() => actions.toggleCompletion(t.id, todayKey)}
                      aria-label={completedToday ? "Mark today incomplete" : "Mark today done"}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </AppShell>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tint: "primary" | "secondary" | "accent" | "success";
}) {
  const map = {
    primary: "bg-primary/15 text-primary",
    secondary: "bg-secondary/15 text-secondary",
    accent: "bg-accent/20 text-accent-foreground",
    success: "bg-success/15 text-success",
  } as const;
  return (
    <div className="glass rounded-2xl p-4">
      <div className={`mb-2 inline-flex h-9 w-9 items-center justify-center rounded-xl ${map[tint]}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="text-xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function EmptyTasks() {
  return (
    <div className="glass flex flex-col items-center rounded-2xl p-8 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
        <Target className="h-6 w-6" />
      </div>
      <h3 className="font-semibold">Start your first habit</h3>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">
        Add up to 10 monthly tasks and check them off each day to build streaks.
      </p>
      <Link to="/tasks" className="mt-4">
        <Button>
          <Plus className="mr-1 h-4 w-4" /> Add your first task
        </Button>
      </Link>
    </div>
  );
}
