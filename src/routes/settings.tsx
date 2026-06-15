import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { actions, useAppStore } from "@/lib/store";
import { Moon, Sun, LogOut, Bell, LogIn, Download, CheckCircle2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { requestNotificationPermission, showLocalNotification, useInstallPrompt } from "@/lib/pwa";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Monthly Task Tracker Pro" },
      { name: "description", content: "Preferences, theme, notifications, install and account." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const state = useAppStore();
  const navigate = useNavigate();
  const { available, installed, promptInstall } = useInstallPrompt();

  const enableNotifications = async (on: boolean) => {
    if (!on) {
      actions.setNotifications(false);
      return;
    }
    const result = await requestNotificationPermission();
    if (result === "granted") {
      actions.setNotifications(true);
      showLocalNotification("Reminders enabled", "We'll nudge you at your reminder time.");
      toast.success("Notifications enabled");
    } else {
      actions.setNotifications(false);
      toast.error("Permission denied. Enable notifications in your browser settings.");
    }
  };

  const handleInstall = async () => {
    const outcome = await promptInstall();
    if (outcome === "accepted") toast.success("Installing app…");
    else if (outcome === "unavailable") {
      toast.info(
        "Install isn't available here. On iOS: Share → Add to Home Screen. On desktop: use the browser's install icon.",
      );
    }
  };

  const clearAll = () => {
    if (!confirm("Delete all local tasks and completion data? This can't be undone.")) return;
    actions.importState({ tasks: [], completions: {} });
    toast.success("All data cleared");
  };

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
              onClick={async () => {
                const { supabase } = await import("@/integrations/supabase/client");
                await supabase.auth.signOut();
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
        <h2 className="mb-3 text-sm font-semibold">Install app</h2>
        {installed ? (
          <div className="flex items-center gap-2 text-sm text-success">
            <CheckCircle2 className="h-4 w-4" /> App is installed on this device
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Install Tracker Pro for a full-screen, app-like experience with offline data.
            </p>
            <Button size="sm" onClick={handleInstall}>
              <Download className="mr-1 h-4 w-4" />
              {available ? "Install" : "How to install"}
            </Button>
          </div>
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
                Browser notification at your reminder time
              </div>
            </div>
          </div>
          <Switch
            checked={state.notificationsEnabled}
            onCheckedChange={enableNotifications}
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
            <p className="text-[11px] text-muted-foreground">
              You'll also get notifications when you hit streak milestones (7, 14, 30, 100 days).
            </p>
          </div>
        ) : null}
      </section>

      <section className="glass mb-4 rounded-2xl p-4">
        <h2 className="mb-3 text-sm font-semibold">Data</h2>
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Your data lives on this device. Export from Analytics to back it up.
          </p>
          <Button size="sm" variant="outline" onClick={clearAll}>
            <Trash2 className="mr-1 h-4 w-4" /> Clear data
          </Button>
        </div>
      </section>

      <section className="glass rounded-2xl p-4">
        <h2 className="mb-2 text-sm font-semibold">About</h2>
        <p className="text-xs text-muted-foreground">
          Monthly Task Tracker Pro — Phase 2. Installable PWA with analytics, streaks, badges,
          archives and exports. Connect a backend later for cross-device sync.
        </p>
      </section>
    </AppShell>
  );
}
