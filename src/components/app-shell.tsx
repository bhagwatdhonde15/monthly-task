import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Calendar, ListChecks, BarChart3, MessageSquare, Settings as SettingsIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useAppStore } from "@/lib/store";
import { useReminders } from "@/lib/reminders";

const tabs = [
  { to: "/dashboard", label: "Home", icon: Home },
  { to: "/calendar", label: "Calendar", icon: Calendar },
  { to: "/tasks", label: "Tasks", icon: ListChecks },
  { to: "/analytics", label: "Stats", icon: BarChart3 },
  { to: "/feedback", label: "Community", icon: MessageSquare },
  { to: "/settings", label: "Profile", icon: SettingsIcon },
] as const;

export function AppShell({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  const state = useAppStore();
  useReminders();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-30 px-4 pt-6 pb-4 sm:px-8">
        <div className="glass-strong mx-auto flex max-w-3xl items-center justify-between gap-3 rounded-2xl px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold sm:text-xl">{title}</h1>
            {subtitle ? (
              <p className="truncate text-xs text-muted-foreground sm:text-sm">{subtitle}</p>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            {action}
            {state.user ? (
              <Link
                to="/settings"
                className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-border bg-primary/10 text-sm font-semibold text-primary"
                aria-label="Profile"
              >
                {state.user.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={state.user.avatarUrl} alt={state.user.name} className="h-full w-full object-cover" />
                ) : (
                  state.user.name.charAt(0).toUpperCase()
                )}
              </Link>
            ) : null}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 sm:px-8">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
        <div className="glass-strong mx-auto flex max-w-md items-center justify-between rounded-2xl px-2 py-2">
          {tabs.map(({ to, label, icon: Icon }) => {
            const active = pathname === to || (to !== "/dashboard" && pathname.startsWith(to));
            return (
              <Link
                key={to}
                to={to}
                className={`flex flex-1 flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-[10px] font-medium transition-colors ${
                  active
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                aria-label={label}
              >
                <Icon className="h-5 w-5" aria-hidden />
                <span>{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
