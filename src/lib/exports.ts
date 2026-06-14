import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import {
  type AppState,
  completionKey,
  daysInMonth,
  taskCompletionCount,
} from "./store";
import { currentWeeklyStreak, longestStreak } from "./streaks";

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function stamp() {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
}

export function exportCSV(state: AppState) {
  const header = "task_id,task_name,date,completed\n";
  const rows: string[] = [];
  state.tasks.forEach((t) => {
    for (const k of Object.keys(state.completions)) {
      const [tid, day] = k.split("|");
      if (tid === t.id && state.completions[k]) {
        rows.push(`${t.id},"${t.name.replaceAll('"', '""')}",${day},1`);
      }
    }
  });
  downloadBlob(new Blob([header + rows.join("\n")], { type: "text/csv" }), `tracker-${stamp()}.csv`);
}

export function exportJSON(state: AppState) {
  downloadBlob(
    new Blob([JSON.stringify(state, null, 2)], { type: "application/json" }),
    `tracker-${stamp()}.json`,
  );
}

export function exportExcel(state: AppState) {
  const wb = XLSX.utils.book_new();

  // Tasks sheet
  const tasksData = state.tasks.map((t) => ({
    ID: t.id,
    Name: t.name,
    Color: t.color,
    Created: t.createdAt,
    LongestStreak: longestStreak(state, t.id),
    WeeklyStreak: currentWeeklyStreak(state, t.id),
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(tasksData), "Tasks");

  // Completions sheet
  const compData = Object.keys(state.completions)
    .filter((k) => state.completions[k])
    .map((k) => {
      const [tid, day] = k.split("|");
      const t = state.tasks.find((x) => x.id === tid);
      return { Task: t?.name ?? tid, Date: day, Completed: 1 };
    });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(compData), "Completions");

  // Current month matrix
  const today = new Date();
  const y = today.getFullYear();
  const m = today.getMonth();
  const dim = daysInMonth(y, m);
  const matrix: Record<string, string | number>[] = [];
  state.tasks.forEach((t) => {
    const row: Record<string, string | number> = { Task: t.name };
    for (let d = 1; d <= dim; d++) {
      const k = completionKey(
        t.id,
        `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
      );
      row[String(d)] = state.completions[k] ? 1 : 0;
    }
    row.Total = taskCompletionCount(state, t.id, y, m);
    matrix.push(row);
  });
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(matrix),
    `${today.toLocaleString(undefined, { month: "short" })} ${y}`,
  );

  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  downloadBlob(new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `tracker-${stamp()}.xlsx`);
}

export function exportMonthlyPDF(state: AppState, year: number, month: number) {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const monthLabel = new Date(year, month, 1).toLocaleString(undefined, {
    month: "long",
    year: "numeric",
  });
  const dim = daysInMonth(year, month);

  doc.setFontSize(20);
  doc.setTextColor("#0F172A");
  doc.text("Monthly Task Tracker Pro", 40, 50);
  doc.setFontSize(13);
  doc.setTextColor("#475569");
  doc.text(`Monthly report — ${monthLabel}`, 40, 70);

  const totals = state.tasks.map((t) => ({
    name: t.name,
    done: taskCompletionCount(state, t.id, year, month),
    pct: Math.round((taskCompletionCount(state, t.id, year, month) / dim) * 100),
    longest: longestStreak(state, t.id),
  }));
  const totalCompleted = totals.reduce((a, t) => a + t.done, 0);
  const totalPossible = state.tasks.length * dim;
  const overall = totalPossible ? Math.round((totalCompleted / totalPossible) * 100) : 0;

  doc.setFontSize(11);
  doc.setTextColor("#0F172A");
  doc.text(`Overall completion: ${overall}%   ·   ${totalCompleted}/${totalPossible} days`, 40, 95);

  autoTable(doc, {
    startY: 115,
    head: [["Task", "Completed", "Days in month", "Completion %", "Longest streak"]],
    body: totals.map((t) => [t.name, t.done, dim, `${t.pct}%`, `${t.longest}d`]),
    styles: { fontSize: 10 },
    headStyles: { fillColor: [59, 130, 246], textColor: 255 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  // Day-by-day grid
  const head = ["Task", ...Array.from({ length: dim }, (_, i) => String(i + 1))];
  const body = state.tasks.map((t) => {
    const row: (string | number)[] = [t.name.length > 18 ? t.name.slice(0, 18) + "…" : t.name];
    for (let d = 1; d <= dim; d++) {
      const k = completionKey(
        t.id,
        `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
      );
      row.push(state.completions[k] ? "●" : "");
    }
    return row;
  });
  autoTable(doc, {
    startY: (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20,
    head: [head],
    body,
    styles: { fontSize: 7, halign: "center", cellPadding: 2 },
    headStyles: { fillColor: [16, 185, 129], textColor: 255, fontSize: 7 },
    columnStyles: { 0: { halign: "left", cellWidth: 70 } },
  });

  doc.save(`tracker-${year}-${String(month + 1).padStart(2, "0")}.pdf`);
}
