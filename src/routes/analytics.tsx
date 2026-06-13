import { createFileRoute } from "@tanstack/react-router";
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

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — Monthly Task Tracker Pro" },
      { name: "description", content: "Charts and stats for your monthly habits." },
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
    const data: { label: string; pct: number }[] = [];
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
      });
    }
    return data;
  }, [state, year, month]);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    downloadBlob(blob, `tracker-export-${dateStamp()}.json`);
    toast.success("Exported as JSON");
  };

  const exportCsv = () => {
    const header = "task_id,task_name,date,completed\n";
    const rows: string[] = [];
    state.tasks.forEach((t) => {
      for (const k of Object.keys(state.completions)) {
        const [tid, day] = k.split("|");
        if (tid === t.id) rows.push(`${t.id},"${t.name.replaceAll('"', '""')}",${day},1`);
      }
    });
    const blob = new Blob([header + rows.join("\n")], { type: "text/csv" });
    downloadBlob(blob, `tracker-export-${dateStamp()}.csv`);
    toast.success("Exported as CSV");
  };

  return (
    <AppShell title="Analytics" subtitle="This month">
      {state.tasks.length === 0 ? (
        <div className="glass rounded-2xl p-8 text-center text-sm text-muted-foreground">
          Add tasks and complete some days to see analytics here.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="glass rounded-2xl p-4">
            <h3 className="mb-3 text-sm font-semibold">Completion by task</h3>
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
            <h3 className="mb-3 text-sm font-semibold">6-month trend</h3>
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
            <h3 className="mb-3 text-sm font-semibold">Streaks</h3>
            <ul className="space-y-2">
              {state.tasks.map((t) => (
                <li key={t.id} className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full" style={{ background: t.color }} />
                    <span className="text-sm">{t.name}</span>
                  </span>
                  <span className="text-sm font-semibold">{currentStreak(state, t.id)} days</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="glass flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4">
            <div>
              <h3 className="text-sm font-semibold">Export your data</h3>
              <p className="text-xs text-muted-foreground">Download a backup for safekeeping.</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={exportCsv}>
                <Download className="mr-1 h-4 w-4" /> CSV
              </Button>
              <Button size="sm" onClick={exportJson}>
                <Download className="mr-1 h-4 w-4" /> JSON
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function dateStamp() {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
}


