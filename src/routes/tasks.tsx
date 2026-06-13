import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { actions, TASK_COLORS, useAppStore, type Task } from "@/lib/store";
import { toast } from "sonner";

export const Route = createFileRoute("/tasks")({
  head: () => ({
    meta: [
      { title: "Tasks — Monthly Task Tracker Pro" },
      { name: "description", content: "Manage up to 10 monthly habits." },
    ],
  }),
  component: TasksPage,
});

function TasksPage() {
  const state = useAppStore();
  const [editing, setEditing] = useState<Task | null>(null);
  const [creating, setCreating] = useState(false);
  const atLimit = state.tasks.length >= 10;

  return (
    <AppShell
      title="Tasks"
      subtitle={`${state.tasks.length} of 10 active`}
      action={
        <Dialog open={creating} onOpenChange={setCreating}>
          <DialogTrigger asChild>
            <Button size="sm" className="rounded-full" disabled={atLimit}>
              <Plus className="h-4 w-4" />
              <span className="ml-1 hidden sm:inline">New</span>
            </Button>
          </DialogTrigger>
          <TaskFormDialog
            mode="create"
            onClose={() => setCreating(false)}
          />
        </Dialog>
      }
    >
      {atLimit ? (
        <p className="mb-3 rounded-xl bg-accent/15 px-3 py-2 text-xs text-accent-foreground">
          You've reached the 10-task limit. Delete a task to add another.
        </p>
      ) : null}

      {state.tasks.length === 0 ? (
        <div className="glass flex flex-col items-center rounded-2xl p-10 text-center">
          <h3 className="font-semibold">No tasks yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Add your first habit to start tracking.
          </p>
          <Button className="mt-4" onClick={() => setCreating(true)}>
            <Plus className="mr-1 h-4 w-4" /> Add task
          </Button>
        </div>
      ) : (
        <ul className="space-y-3">
          {state.tasks.map((t) => (
            <li key={t.id} className="glass flex items-center gap-3 rounded-2xl p-4">
              <span
                className="h-10 w-10 shrink-0 rounded-xl"
                style={{ background: t.color }}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-semibold">{t.name}</h3>
                {t.description ? (
                  <p className="truncate text-xs text-muted-foreground">{t.description}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Added {new Date(t.createdAt).toLocaleDateString()}
                  </p>
                )}
              </div>
              <Dialog
                open={editing?.id === t.id}
                onOpenChange={(o) => setEditing(o ? t : null)}
              >
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Edit task">
                    <Pencil className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                {editing?.id === t.id ? (
                  <TaskFormDialog
                    mode="edit"
                    task={t}
                    onClose={() => setEditing(null)}
                  />
                ) : null}
              </Dialog>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Delete task">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete "{t.name}"?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will also remove all completion history for this task.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => {
                        actions.deleteTask(t.id);
                        toast.success("Task deleted");
                      }}
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}

function TaskFormDialog({
  mode,
  task,
  onClose,
}: {
  mode: "create" | "edit";
  task?: Task;
  onClose: () => void;
}) {
  const [name, setName] = useState(task?.name ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [color, setColor] = useState(task?.color ?? TASK_COLORS[0]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (mode === "create") {
      actions.addTask({ name, description, color });
      toast.success("Task added");
    } else if (task) {
      actions.updateTask(task.id, { name: name.trim(), description: description.trim() || undefined, color });
      toast.success("Task updated");
    }
    onClose();
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{mode === "create" ? "New task" : "Edit task"}</DialogTitle>
      </DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="task-name">Name</Label>
          <Input
            id="task-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            placeholder="e.g. Morning run"
            autoFocus
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="task-desc">Description (optional)</Label>
          <Textarea
            id="task-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={200}
            rows={2}
            placeholder="Why this matters…"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Color</Label>
          <div className="flex flex-wrap gap-2">
            {TASK_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`h-9 w-9 rounded-xl ring-offset-2 transition-transform ${
                  color === c ? "ring-2 ring-foreground scale-105" : "hover:scale-105"
                }`}
                style={{ background: c }}
                aria-label={`Color ${c}`}
              />
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">{mode === "create" ? "Add task" : "Save"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
