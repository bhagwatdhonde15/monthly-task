import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { actions, useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Sparkles, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Monthly Task Tracker Pro" },
      { name: "description", content: "Sign in to sync your monthly habits across devices." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const state = useAppStore();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (state.user) navigate({ to: "/dashboard", replace: true });
  }, [state.user, navigate]);

  const handleSignIn = () => {
    setLoading(true);
    // Mock Google sign-in.
    setTimeout(() => {
      actions.signIn({
        name: "Alex Morgan",
        email: "alex@example.com",
        avatarUrl: undefined,
      });
      navigate({ to: "/dashboard", replace: true });
    }, 600);
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="glass-strong w-full max-w-md rounded-3xl p-8 sm:p-10">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-secondary text-primary-foreground shadow-lg">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold sm:text-3xl">Monthly Task Tracker Pro</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Build consistent habits. Track every month. Stay accountable.
          </p>
        </div>

        <ul className="mb-8 space-y-3 text-sm">
          <li className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
            <span>Up to 10 monthly habits with a beautiful calendar grid</span>
          </li>
          <li className="flex items-start gap-3">
            <TrendingUp className="mt-0.5 h-5 w-5 shrink-0 text-secondary" />
            <span>Real-time progress, streaks and monthly analytics</span>
          </li>
          <li className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <span>Synced securely with your Google account</span>
          </li>
        </ul>

        <Button onClick={handleSignIn} disabled={loading} className="h-12 w-full text-base">
          <GoogleIcon className="mr-2 h-5 w-5" />
          {loading ? "Signing in…" : "Continue with Google"}
        </Button>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          By continuing you agree to our <a className="underline" href="#">Terms</a> and{" "}
          <a className="underline" href="#">Privacy Policy</a>.
        </p>
      </div>
    </div>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.4 14.6 2.4 12 2.4 6.8 2.4 2.6 6.6 2.6 11.9S6.8 21.4 12 21.4c6.9 0 9.5-4.8 9.5-7.3 0-.5 0-.8-.1-1.2H12z" />
    </svg>
  );
}
