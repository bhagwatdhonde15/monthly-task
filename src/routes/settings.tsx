import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { actions, useAppStore } from "@/lib/store";
import { Moon, Sun, LogOut, Bell, LogIn } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Monthly Task Tracker Pro" },
      { name: "description", content: "Preferences, theme, notifications and account." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const state = useAppStore();
  const navigate = useNavigate();

  return (
    <AppShell title="Settings" subtitle="Preferences & account">
      <section className="glass mb-4 rounded-2xl p-4">
        <h2 className="mb-3 text-sm font-semibold">Account</h2>
        {state.user ? (
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-base font-semibold text-primary">
              {state.user.name.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{state.user.name}</div>
              <div className="truncate text-xs text-muted-foreground">{state.user.email}</div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                actions.signOut();
                toast.success("Signed out");
                navigate({ to: "/auth" });
              }}
            >
              <LogOut className="mr-1 h-4 w-4" /> Sign out
            </Button>
          </div>
        ) : (
          <Button onClick={() => navigate({ to: "/auth" })} className="w-full">
            <LogIn className="mr-1 h-4 w-4" /> Sign in with Google
          </Button>
        )}
      </section>

      <section className="glass mb-4 rounded-2xl p-4">
        <h2 className="mb-3 text-sm font-semibold">Appearance</h2>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {state.theme === "dark" ? (
              <Moon className="h-5 w-5 text-primary" />
            ) : (
              <Sun className="h-5 w-5 text-accent" />
            )}
            <div>
              <div className="font-medium">Dark mode</div>
              <div className="text-xs text-muted-foreground">
                {state.theme === "dark" ? "On" : "Off"}
              </div>
            </div>
          </div>
          <Switch
            checked={state.theme === "dark"}
            onCheckedChange={(v) => actions.setTheme(v ? "dark" : "light")}
          />
        </div>
      </section>

      <section className="glass mb-4 rounded-2xl p-4">
        <h2 className="mb-3 text-sm font-semibold">Notifications</h2>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-secondary" />
            <div>
              <div className="font-medium">Daily reminder</div>
              <div className="text-xs text-muted-foreground">
                Browser push (enable in backend integration)
              </div>
            </div>
          </div>
          <Switch
            checked={state.notificationsEnabled}
            onCheckedChange={actions.setNotifications}
          />
        </div>
        {state.notificationsEnabled ? (
          <div className="mt-3 space-y-1.5">
            <Label htmlFor="reminder">Reminder time</Label>
            <Input
              id="reminder"
              type="time"
              value={state.reminderTime}
              onChange={(e) => actions.setReminderTime(e.target.value)}
              className="max-w-[140px]"
            />
          </div>
        ) : null}
      </section>

      <section className="glass rounded-2xl p-4">
        <h2 className="mb-2 text-sm font-semibold">About</h2>
        <p className="text-xs text-muted-foreground">
          Monthly Task Tracker Pro v1 (UI preview). Data is stored locally on this device. Connect
          Lovable Cloud to enable Google sign-in, real-time sync across devices and push notifications.
        </p>
      </section>
    </AppShell>
  );
}
