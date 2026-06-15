import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { actions } from "@/lib/store";

async function hydrateUser(userId: string, email: string | null | undefined) {
  // Fetch profile and admin role in parallel. Defer to avoid race with onAuthStateChange.
  const [{ data: profile }, { data: roles }] = await Promise.all([
    supabase.from("profiles").select("display_name, avatar_url").eq("id", userId).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", userId),
  ]);
  actions.signIn({
    id: userId,
    email: email ?? "",
    name: profile?.display_name || email?.split("@")[0] || "User",
    avatarUrl: profile?.avatar_url ?? undefined,
    isAdmin: !!roles?.some((r) => r.role === "admin"),
  });
}

/**
 * Mirrors the Supabase auth session into the local app store.
 * Runs once at the root.
 */
export function useSupabaseAuthSync() {
  useEffect(() => {
    let cancelled = false;

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (event === "SIGNED_OUT" || !session?.user) {
        if (event === "SIGNED_OUT") actions.signOut();
        return;
      }
      // Defer Supabase calls to avoid deadlocking the auth callback.
      setTimeout(() => {
        if (!cancelled) hydrateUser(session.user.id, session.user.email);
      }, 0);
    });

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      if (data.session?.user) {
        hydrateUser(data.session.user.id, data.session.user.email);
      } else {
        actions.signOut();
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);
}
