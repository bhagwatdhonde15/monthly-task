import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { ArrowRight, GitCompare } from "lucide-react";
import { daysInMonth, taskCompletionCount, useAppStore } from "@/lib/store";

export const Route = createFileRoute("/archive/")({
  head: () => ({
    meta: [
      { title: "Archive — Monthly Task Tracker Pro" },
      { name: "description", content: "Browse past monthly habit progress." },
    ],
  }),
  component: ArchiveIndex,
});

function ArchiveIndex() {
  const state = useAppStore();

  const months = useMemo(() => {
    const set = new Set<string>();
    for (const k of Object.keys(state.completions)) {
      const [, day] = k.split("|");
      set.add(day.slice(0, 7));
    }
    const today = new Date();
    set.add(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`);
    return Array.from(set)
      .sort()
      .reverse()
      .map((ym) => {
        const [y, m] = ym.split("-").map(Number);
        const dim = daysInMonth(y, m - 1);
        const done = state.tasks.reduce(
          (acc, t) => acc + taskCompletionCount(state, t.id, y, m - 1),
          0,
        );
        const possible = state.tasks.length * dim;
        return {
          ym,
          year: y,
          month: m,
          label: new Date(y, m - 1, 1).toLocaleString(undefined, {
            month: "long",
            year: "numeric",
          }),
          done,
          pct: possible ? Math.round((done / possible) * 100) : 0,
        };
      });
  }, [state]);

  return (
    <AppShell
      title="Archive"
      subtitle={`${months.length} month${months.length === 1 ? "" : "s"} tracked`}
      action={
        months.length >= 2 ? (
          <Link
            to="/archive/compare/$a/$b"
            params={{ a: months[1].ym, b: months[0].ym }}
          >
            <Button size="sm" variant="outline" className="rounded-full">
              <GitCompare className="h-4 w-4" />
              <span className="ml-1 hidden sm:inline">Compare</span>
            </Button>
          </Link>
        ) : null
      }
    >
      {months.length === 0 ? (
        <div className="glass rounded-2xl p-8 text-center text-sm text-muted-foreground">
          No history yet. Complete a few days to populate your archive.
        </div>
      ) : (
        <ul className="space-y-3">
          {months.map((m) => (
            <li key={m.ym}>
              <Link
                to="/archive/$month/$year"
                params={{ month: String(m.month), year: String(m.year) }}
                className="glass flex items-center gap-3 rounded-2xl p-4 transition hover:bg-primary/5"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{m.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {m.done} completions · {m.pct}% overall
                  </div>
                </div>
                <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary"
                    style={{ width: `${m.pct}%` }}
                  />
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
