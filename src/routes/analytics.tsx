import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { AppShell } from "@/components/app-shell";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  currentStreak,
  daysInMonth,
  taskCompletionCount,
  useAppStore,
} from "@/lib/store";
import { badgesFor, currentWeeklyStreak, longestStreak } from "@/lib/streaks";
import { exportCSV, exportExcel, exportJSON, exportMonthlyPDF } from "@/lib/exports";
import { Button } from "@/components/ui/button";
import { Award, Download, FileSpreadsheet, FileText, Flame, Archive as ArchiveIcon } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — Monthly Task Tracker Pro" },
      { name: "description", content: "Charts, streaks, badges and reports for your monthly habits." },
    ],
  }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const state = useAppStore();
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const dim = daysInMonth(year, month);

  const taskBar = useMemo(
    () =>
      state.tasks.map((t) => ({
        name: t.name.length > 12 ? t.name.slice(0, 12) + "…" : t.name,
        pct: Math.round((taskCompletionCount(state, t.id, year, month) / dim) * 100),
        color: t.color,
      })),
    [state, year, month, dim],
  );

  const trend = useMemo(() => {
    const data: { label: string; pct: number; total: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(year, month - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth();
      const mdim = daysInMonth(y, m);
      let done = 0;
      state.tasks.forEach((t) => {
        done += taskCompletionCount(state, t.id, y, m);
      });
      const total = state.tasks.length * mdim;
      data.push({
        label: d.toLocaleString(undefined, { month: "short" }),
        pct: total ? Math.round((done / total) * 100) : 0,
        total: done,
      });
    }
    return data;
  }, [state, year, month]);

  const comparison = useMemo(
    () =>
      state.tasks.map((t) => ({
        name: t.name.length > 10 ? t.name.slice(0, 10) + "…" : t.name,
        current: Math.round((taskCompletionCount(state, t.id, year, month) / dim) * 100),
        previous: (() => {
          const d = new Date(year, month - 1, 1);
          const py = d.getFullYear();
          const pm = d.getMonth();
          const pdim = daysInMonth(py, pm);
          return Math.round((taskCompletionCount(state, t.id, py, pm) / pdim) * 100);
        })(),
        color: t.color,
      })),
    [state, year, month, dim],
  );

  const badges = useMemo(() => badgesFor(state), [state]);
  const earned = badges.filter((b) => b.earned).length;

  return (
    <AppShell
      title="Analytics"
      subtitle="Trends, streaks & reports"
      action={
        <Link to="/archive">
          <Button size="sm" variant="outline" className="rounded-full">
            <ArchiveIcon className="h-4 w-4" />
            <span className="ml-1 hidden sm:inline">Archive</span>
          </Button>
        </Link>
      }
    >
      {state.tasks.length === 0 ? (
        <div className="glass rounded-2xl p-8 text-center text-sm text-muted-foreground">
          Add tasks and complete some days to see analytics here.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="glass rounded-2xl p-4">
            <h3 className="mb-3 text-sm font-semibold">Completion by task — this month</h3>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={taskBar}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.85 0.01 250)" />
                  <XAxis dataKey="name" fontSize={11} tickLine={false} />
                  <YAxis fontSize={11} tickLine={false} unit="%" domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid var(--color-border)",
                      background: "var(--color-popover)",
                    }}
                  />
                  <Bar dataKey="pct" radius={[8, 8, 0, 0]}>
                    {taskBar.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass rounded-2xl p-4">
            <h3 className="mb-3 text-sm font-semibold">6-month completion trend</h3>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.85 0.01 250)" />
                  <XAxis dataKey="label" fontSize={11} tickLine={false} />
                  <YAxis fontSize={11} tickLine={false} unit="%" domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid var(--color-border)",
                      background: "var(--color-popover)",
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="pct"
                    name="Overall %"
                    stroke="var(--color-primary)"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass rounded-2xl p-4">
            <h3 className="mb-3 text-sm font-semibold">Task comparison — last vs this month</h3>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparison}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.85 0.01 250)" />
                  <XAxis dataKey="name" fontSize={11} tickLine={false} />
                  <YAxis fontSize={11} tickLine={false} unit="%" domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid var(--color-border)",
                      background: "var(--color-popover)",
                    }}
                  />
                  <Legend />
                  <Bar dataKey="previous" name="Last month" fill="oklch(0.85 0.04 250)" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="current" name="This month" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass rounded-2xl p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Flame className="h-4 w-4 text-accent" /> Streaks
            </h3>
            <ul className="space-y-2">
              {state.tasks.map((t) => (
                <li key={t.id} className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full" style={{ background: t.color }} />
                    <span className="text-sm">{t.name}</span>
                  </span>
                  <span className="flex items-center gap-3 text-xs">
                    <span>
                      <strong className="text-foreground">{currentStreak(state, t.id)}d</strong>{" "}
                      <span className="text-muted-foreground">current</span>
                    </span>
                    <span>
                      <strong className="text-foreground">{longestStreak(state, t.id)}d</strong>{" "}
                      <span className="text-muted-foreground">best</span>
                    </span>
                    <span>
                      <strong className="text-foreground">{currentWeeklyStreak(state, t.id)}w</strong>{" "}
                      <span className="text-muted-foreground">weekly</span>
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="glass rounded-2xl p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <Award className="h-4 w-4 text-primary" /> Achievement badges
              </h3>
              <span className="text-xs text-muted-foreground">
                {earned}/{badges.length} earned
              </span>
            </div>
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {badges.map((b) => (
                <li
                  key={b.id}
                  className={`rounded-xl border p-3 text-center transition ${
                    b.earned
                      ? "border-primary/40 bg-primary/10"
                      : "border-border bg-muted/40 opacity-60"
                  }`}
                >
                  <Award
                    className={`mx-auto h-6 w-6 ${b.earned ? "text-primary" : "text-muted-foreground"}`}
                  />
                  <div className="mt-1 text-xs font-semibold">{b.label}</div>
                  <div className="text-[10px] text-muted-foreground">{b.description}</div>
                </li>
              ))}
            </ul>
          </div>

          <div className="glass rounded-2xl p-4">
            <h3 className="mb-3 text-sm font-semibold">Export & reports</h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  exportCSV(state);
                  toast.success("CSV downloaded");
                }}
              >
                <Download className="mr-1 h-4 w-4" /> CSV
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  exportJSON(state);
                  toast.success("JSON downloaded");
                }}
              >
                <Download className="mr-1 h-4 w-4" /> JSON
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  exportExcel(state);
                  toast.success("Excel downloaded");
                }}
              >
                <FileSpreadsheet className="mr-1 h-4 w-4" /> Excel
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  exportMonthlyPDF(state, year, month);
                  toast.success("Monthly PDF report downloaded");
                }}
              >
                <FileText className="mr-1 h-4 w-4" /> PDF
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
