import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { daysInMonth, taskCompletionCount, useAppStore } from "@/lib/store";

export const Route = createFileRoute("/archive/compare/$a/$b")({
  head: () => ({
    meta: [{ title: "Compare months — Monthly Task Tracker Pro" }],
  }),
  component: CompareMonths,
});

function parseYM(s: string) {
  const [y, m] = s.split("-").map(Number);
  return { year: y, month: m - 1 };
}

function CompareMonths() {
  const { a, b } = Route.useParams();
  const state = useAppStore();
  const A = parseYM(a);
  const B = parseYM(b);

  const buildStats = (year: number, month: number) => {
    const dim = daysInMonth(year, month);
    const totals = state.tasks.map((t) => ({
      task: t,
      done: taskCompletionCount(state, t.id, year, month),
      pct: Math.round((taskCompletionCount(state, t.id, year, month) / dim) * 100),
    }));
    const total = totals.reduce((s, x) => s + x.done, 0);
    const possible = state.tasks.length * dim;
    return {
      label: new Date(year, month, 1).toLocaleString(undefined, { month: "long", year: "numeric" }),
      dim,
      totals,
      total,
      possible,
      overall: possible ? Math.round((total / possible) * 100) : 0,
    };
  };

  const sa = buildStats(A.year, A.month);
  const sb = buildStats(B.year, B.month);
  const delta = sb.overall - sa.overall;

  return (
    <AppShell
      title="Compare"
      subtitle={`${sa.label} vs ${sb.label}`}
      action={
        <Link to="/archive">
          <Button size="sm" variant="outline" className="rounded-full">
            <ChevronLeft className="h-4 w-4" />
            <span className="ml-1 hidden sm:inline">Back</span>
          </Button>
        </Link>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <SummaryCard label={sa.label} value={`${sa.overall}%`} sub={`${sa.total}/${sa.possible} days`} />
        <SummaryCard
          label={sb.label}
          value={`${sb.overall}%`}
          sub={`${sb.total}/${sb.possible} days`}
          delta={delta}
        />
      </div>

      <div className="glass mt-4 rounded-2xl p-4">
        <h3 className="mb-3 text-sm font-semibold">Per-task comparison</h3>
        {state.tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tasks to compare.</p>
        ) : (
          <ul className="space-y-3">
            {state.tasks.map((t) => {
              const aRow = sa.totals.find((x) => x.task.id === t.id)!;
              const bRow = sb.totals.find((x) => x.task.id === t.id)!;
              const d = bRow.pct - aRow.pct;
              return (
                <li key={t.id}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full" style={{ background: t.color }} />
                      <span className="font-medium">{t.name}</span>
                    </span>
                    <span
                      className={`text-xs font-semibold ${
                        d > 0 ? "text-success" : d < 0 ? "text-destructive" : "text-muted-foreground"
                      }`}
                    >
                      {d > 0 ? "+" : ""}
                      {d}%
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Bar pct={aRow.pct} color={t.color} muted />
                    <Bar pct={bRow.pct} color={t.color} />
                  </div>
                  <div className="mt-1 grid grid-cols-2 text-[10px] text-muted-foreground">
                    <span>{aRow.pct}%</span>
                    <span className="text-right">{bRow.pct}%</span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </AppShell>
  );
}

function SummaryCard({
  label,
  value,
  sub,
  delta,
}: {
  label: string;
  value: string;
  sub: string;
  delta?: number;
}) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 flex items-baseline gap-2">
        <div className="text-2xl font-bold">{value}</div>
        {delta !== undefined ? (
          <div
            className={`text-xs font-semibold ${
              delta > 0 ? "text-success" : delta < 0 ? "text-destructive" : "text-muted-foreground"
            }`}
          >
            {delta > 0 ? "▲" : delta < 0 ? "▼" : "—"} {Math.abs(delta)}%
          </div>
        ) : null}
      </div>
      <div className="text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}

function Bar({ pct, color, muted }: { pct: number; color: string; muted?: boolean }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-muted">
      <div
        className="h-full rounded-full"
        style={{ width: `${pct}%`, background: color, opacity: muted ? 0.55 : 1 }}
      />
    </div>
  );
}
