import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useAppStore } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Heart,
  MessageCircle,
  Send,
  Trash2,
  Sparkles,
  Bug,
  Lightbulb,
  MessagesSquare,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/feedback")({
  head: () => ({
    meta: [
      { title: "Community & Feedback — Monthly Task Tracker Pro" },
      {
        name: "description",
        content:
          "Share feedback, suggestions, and feature requests. Vote on ideas and discuss with the community.",
      },
    ],
  }),
  component: FeedbackPage,
});

type Category = "general" | "suggestion" | "feature" | "bug";

type ProfileLite = { id: string; display_name: string; avatar_url: string | null };

type FeedbackRow = {
  id: string;
  user_id: string;
  category: Category;
  content: string;
  created_at: string;
};

type CommentRow = {
  id: string;
  feedback_id: string;
  user_id: string;
  content: string;
  created_at: string;
};

type LikeRow = { feedback_id: string; user_id: string };

const CATEGORIES: { value: Category; label: string; icon: typeof Sparkles }[] = [
  { value: "general", label: "General", icon: MessagesSquare },
  { value: "suggestion", label: "Suggestion", icon: Lightbulb },
  { value: "feature", label: "Feature request", icon: Sparkles },
  { value: "bug", label: "Bug report", icon: Bug },
];

const MAX_LEN = 2000;
const COMMENT_MAX = 1000;

function FeedbackPage() {
  const state = useAppStore();
  const navigate = useNavigate();

  const [feedback, setFeedback] = useState<FeedbackRow[]>([]);
  const [likes, setLikes] = useState<LikeRow[]>([]);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileLite>>({});
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<"top" | "new">("top");
  const [draft, setDraft] = useState("");
  const [category, setCategory] = useState<Category>("general");
  const [submitting, setSubmitting] = useState(false);
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});

  const userId = state.user?.id;
  const isAdmin = !!state.user?.isAdmin;

  // Redirect non-signed-in users to /auth (feedback is for signed-in users only).
  useEffect(() => {
    if (state.user === null) navigate({ to: "/auth" });
  }, [state.user, navigate]);

  // ----- initial load -----
  const loadAll = useCallback(async () => {
    setLoading(true);
    const [fbRes, likeRes, commentRes] = await Promise.all([
      supabase.from("feedback").select("*").order("created_at", { ascending: false }),
      supabase.from("feedback_likes").select("feedback_id, user_id"),
      supabase.from("feedback_comments").select("*").order("created_at", { ascending: true }),
    ]);
    if (fbRes.error) toast.error("Failed to load feedback", { description: fbRes.error.message });
    setFeedback((fbRes.data ?? []) as FeedbackRow[]);
    setLikes((likeRes.data ?? []) as LikeRow[]);
    setComments((commentRes.data ?? []) as CommentRow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!userId) return;
    loadAll();
  }, [userId, loadAll]);

  // ----- ensure profiles are loaded for all users we display -----
  useEffect(() => {
    const ids = new Set<string>();
    feedback.forEach((f) => ids.add(f.user_id));
    comments.forEach((c) => ids.add(c.user_id));
    const missing = [...ids].filter((id) => !profiles[id]);
    if (missing.length === 0) return;
    supabase
      .from("profiles")
      .select("id, display_name, avatar_url")
      .in("id", missing)
      .then(({ data }) => {
        if (!data) return;
        setProfiles((prev) => {
          const next = { ...prev };
          for (const p of data as ProfileLite[]) next[p.id] = p;
          return next;
        });
      });
  }, [feedback, comments, profiles]);

  // ----- realtime subscriptions -----
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel("feedback-community")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "feedback" },
        (payload) => {
          setFeedback((prev) => {
            if (payload.eventType === "INSERT") {
              const row = payload.new as FeedbackRow;
              if (prev.some((p) => p.id === row.id)) return prev;
              return [row, ...prev];
            }
            if (payload.eventType === "UPDATE") {
              const row = payload.new as FeedbackRow;
              return prev.map((p) => (p.id === row.id ? row : p));
            }
            if (payload.eventType === "DELETE") {
              const row = payload.old as FeedbackRow;
              return prev.filter((p) => p.id !== row.id);
            }
            return prev;
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "feedback_likes" },
        (payload) => {
          setLikes((prev) => {
            if (payload.eventType === "INSERT") {
              const row = payload.new as LikeRow;
              if (prev.some((l) => l.feedback_id === row.feedback_id && l.user_id === row.user_id))
                return prev;
              return [...prev, row];
            }
            if (payload.eventType === "DELETE") {
              const row = payload.old as LikeRow;
              return prev.filter(
                (l) => !(l.feedback_id === row.feedback_id && l.user_id === row.user_id),
              );
            }
            return prev;
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "feedback_comments" },
        (payload) => {
          setComments((prev) => {
            if (payload.eventType === "INSERT") {
              const row = payload.new as CommentRow;
              if (prev.some((c) => c.id === row.id)) return prev;
              return [...prev, row];
            }
            if (payload.eventType === "DELETE") {
              const row = payload.old as CommentRow;
              return prev.filter((c) => c.id !== row.id);
            }
            if (payload.eventType === "UPDATE") {
              const row = payload.new as CommentRow;
              return prev.map((c) => (c.id === row.id ? row : c));
            }
            return prev;
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // ----- derived -----
  const likeCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const l of likes) map.set(l.feedback_id, (map.get(l.feedback_id) ?? 0) + 1);
    return map;
  }, [likes]);

  const likedByMe = useMemo(() => {
    const s = new Set<string>();
    if (!userId) return s;
    for (const l of likes) if (l.user_id === userId) s.add(l.feedback_id);
    return s;
  }, [likes, userId]);

  const commentsByFeedback = useMemo(() => {
    const map = new Map<string, CommentRow[]>();
    for (const c of comments) {
      const arr = map.get(c.feedback_id) ?? [];
      arr.push(c);
      map.set(c.feedback_id, arr);
    }
    return map;
  }, [comments]);

  const sortedFeedback = useMemo(() => {
    const copy = [...feedback];
    if (sort === "top") {
      copy.sort((a, b) => {
        const diff = (likeCounts.get(b.id) ?? 0) - (likeCounts.get(a.id) ?? 0);
        if (diff !== 0) return diff;
        return b.created_at.localeCompare(a.created_at);
      });
    } else {
      copy.sort((a, b) => b.created_at.localeCompare(a.created_at));
    }
    return copy;
  }, [feedback, likeCounts, sort]);

  // ----- mutations -----
  const submitFeedback = async () => {
    const content = draft.trim();
    if (!userId) return;
    if (content.length < 3) {
      toast.error("Please write at least 3 characters.");
      return;
    }
    if (content.length > MAX_LEN) {
      toast.error(`Maximum ${MAX_LEN} characters.`);
      return;
    }
    setSubmitting(true);
    const { error } = await supabase
      .from("feedback")
      .insert({ user_id: userId, category, content });
    setSubmitting(false);
    if (error) {
      toast.error("Couldn't post", { description: error.message });
      return;
    }
    setDraft("");
    setCategory("general");
    toast.success("Feedback posted");
  };

  const toggleLike = async (feedbackId: string) => {
    if (!userId) return;
    const already = likedByMe.has(feedbackId);
    // optimistic
    setLikes((prev) =>
      already
        ? prev.filter((l) => !(l.feedback_id === feedbackId && l.user_id === userId))
        : [...prev, { feedback_id: feedbackId, user_id: userId }],
    );
    if (already) {
      const { error } = await supabase
        .from("feedback_likes")
        .delete()
        .eq("feedback_id", feedbackId)
        .eq("user_id", userId);
      if (error) toast.error("Couldn't remove like", { description: error.message });
    } else {
      const { error } = await supabase
        .from("feedback_likes")
        .insert({ feedback_id: feedbackId, user_id: userId });
      if (error) toast.error("Couldn't like", { description: error.message });
    }
  };

  const deleteFeedback = async (id: string, authorId: string) => {
    if (!userId) return;
    if (!(isAdmin || authorId === userId)) return;
    if (!window.confirm("Delete this feedback and all its comments?")) return;
    const { error } = await supabase.from("feedback").delete().eq("id", id);
    if (error) toast.error("Couldn't delete", { description: error.message });
  };

  const deleteComment = async (id: string, authorId: string) => {
    if (!userId) return;
    if (!(isAdmin || authorId === userId)) return;
    const { error } = await supabase.from("feedback_comments").delete().eq("id", id);
    if (error) toast.error("Couldn't delete comment", { description: error.message });
  };

  const addComment = async (feedbackId: string, content: string) => {
    if (!userId) return;
    const trimmed = content.trim();
    if (trimmed.length < 1) return;
    if (trimmed.length > COMMENT_MAX) {
      toast.error(`Comments are limited to ${COMMENT_MAX} characters.`);
      return;
    }
    const { error } = await supabase
      .from("feedback_comments")
      .insert({ feedback_id: feedbackId, user_id: userId, content: trimmed });
    if (error) toast.error("Couldn't comment", { description: error.message });
  };

  if (!state.user?.id) {
    return null;
  }

  return (
    <AppShell title="Community" subtitle="Feedback, ideas & requests">
      {/* Composer */}
      <section className="glass-strong mb-5 rounded-2xl p-4 sm:p-5">
        <div className="mb-3 flex items-center gap-3">
          <Avatar
            name={state.user.name}
            avatarUrl={state.user.avatarUrl}
            className="h-10 w-10 text-sm"
          />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">{state.user.name}</div>
            <div className="truncate text-xs text-muted-foreground">
              Share what would make this app better.
            </div>
          </div>
        </div>
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value.slice(0, MAX_LEN))}
          placeholder="What's on your mind? Suggestions, requests, bugs…"
          rows={3}
          className="resize-none border-border/60 bg-background/60"
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
              <SelectTrigger className="h-9 w-[160px] bg-background/60">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    <span className="flex items-center gap-2">
                      <c.icon className="h-4 w-4" />
                      {c.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground">
              {draft.length}/{MAX_LEN}
            </span>
          </div>
          <Button
            onClick={submitFeedback}
            disabled={submitting || draft.trim().length < 3}
            className="gap-2"
          >
            <Send className="h-4 w-4" />
            {submitting ? "Posting…" : "Post"}
          </Button>
        </div>
      </section>

      {/* Sort tabs */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold">
          {feedback.length} {feedback.length === 1 ? "post" : "posts"}
        </h2>
        <div className="glass flex rounded-full p-1 text-xs font-medium">
          <button
            onClick={() => setSort("top")}
            className={cn(
              "rounded-full px-3 py-1.5 transition-colors",
              sort === "top" ? "bg-primary text-primary-foreground" : "text-muted-foreground",
            )}
          >
            Most liked
          </button>
          <button
            onClick={() => setSort("new")}
            className={cn(
              "rounded-full px-3 py-1.5 transition-colors",
              sort === "new" ? "bg-primary text-primary-foreground" : "text-muted-foreground",
            )}
          >
            Newest
          </button>
        </div>
      </div>

      {/* Feed */}
      {loading ? (
        <div className="glass rounded-2xl p-8 text-center text-sm text-muted-foreground">
          Loading community feedback…
        </div>
      ) : sortedFeedback.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center">
          <MessagesSquare className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="font-medium">No feedback yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Be the first to share an idea or request.
          </p>
        </div>
      ) : (
        <ul className="space-y-4">
          {sortedFeedback.map((f) => {
            const author = profiles[f.user_id];
            const name = author?.display_name ?? "Member";
            const cat = CATEGORIES.find((c) => c.value === f.category) ?? CATEGORIES[0];
            const CatIcon = cat.icon;
            const liked = likedByMe.has(f.id);
            const count = likeCounts.get(f.id) ?? 0;
            const fbComments = commentsByFeedback.get(f.id) ?? [];
            const canDelete = isAdmin || f.user_id === userId;
            const showComments = !!openComments[f.id];

            return (
              <li key={f.id} className="glass-strong rounded-2xl p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <Avatar name={name} avatarUrl={author?.avatar_url} className="h-10 w-10 text-sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="truncate font-semibold">{name}</span>
                      <span className="text-xs text-muted-foreground">
                        · {formatDistanceToNow(new Date(f.created_at), { addSuffix: true })}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                        <CatIcon className="h-3 w-3" />
                        {cat.label}
                      </span>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed">
                      {f.content}
                    </p>

                    <div className="mt-3 flex items-center gap-1">
                      <button
                        onClick={() => toggleLike(f.id)}
                        className={cn(
                          "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                          liked
                            ? "bg-red-500/15 text-red-500"
                            : "text-muted-foreground hover:bg-foreground/5",
                        )}
                        aria-pressed={liked}
                        aria-label={liked ? "Remove like" : "Like"}
                      >
                        <Heart
                          className={cn("h-4 w-4", liked && "fill-current")}
                          aria-hidden
                        />
                        {count}
                      </button>
                      <button
                        onClick={() =>
                          setOpenComments((prev) => ({ ...prev, [f.id]: !prev[f.id] }))
                        }
                        className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-foreground/5"
                      >
                        <MessageCircle className="h-4 w-4" />
                        {fbComments.length}
                      </button>
                      <div className="flex-1" />
                      {canDelete ? (
                        <button
                          onClick={() => deleteFeedback(f.id, f.user_id)}
                          className="flex items-center gap-1 rounded-full px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                          aria-label="Delete feedback"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      ) : null}
                    </div>

                    {showComments ? (
                      <CommentsThread
                        feedbackId={f.id}
                        comments={fbComments}
                        profiles={profiles}
                        currentUserId={userId!}
                        isAdmin={isAdmin}
                        onSubmit={(content) => addComment(f.id, content)}
                        onDelete={deleteComment}
                      />
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </AppShell>
  );
}

function CommentsThread({
  feedbackId,
  comments,
  profiles,
  currentUserId,
  isAdmin,
  onSubmit,
  onDelete,
}: {
  feedbackId: string;
  comments: CommentRow[];
  profiles: Record<string, ProfileLite>;
  currentUserId: string;
  isAdmin: boolean;
  onSubmit: (content: string) => Promise<void> | void;
  onDelete: (id: string, authorId: string) => Promise<void> | void;
}) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!value.trim()) return;
    setBusy(true);
    await onSubmit(value);
    setBusy(false);
    setValue("");
  };

  return (
    <div className="mt-4 border-t border-border/60 pt-3">
      {comments.length === 0 ? (
        <p className="mb-3 text-xs text-muted-foreground">Be the first to reply.</p>
      ) : (
        <ul className="mb-3 space-y-3">
          {comments.map((c) => {
            const author = profiles[c.user_id];
            const name = author?.display_name ?? "Member";
            const canDelete = isAdmin || c.user_id === currentUserId;
            return (
              <li key={c.id} className="flex items-start gap-2">
                <Avatar
                  name={name}
                  avatarUrl={author?.avatar_url}
                  className="h-7 w-7 text-[10px]"
                />
                <div className="min-w-0 flex-1 rounded-2xl bg-foreground/5 px-3 py-2">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="truncate font-semibold">{name}</span>
                    <span className="text-muted-foreground">
                      · {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                    </span>
                    {canDelete ? (
                      <button
                        onClick={() => onDelete(c.id, c.user_id)}
                        className="ml-auto text-muted-foreground hover:text-destructive"
                        aria-label="Delete comment"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    ) : null}
                  </div>
                  <p className="mt-1 whitespace-pre-wrap break-words text-sm">{c.content}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <div className="flex items-start gap-2">
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value.slice(0, COMMENT_MAX))}
          rows={1}
          placeholder="Write a reply…"
          className="min-h-[40px] resize-none bg-background/60 text-sm"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              submit();
            }
          }}
          aria-label={`Reply to feedback ${feedbackId}`}
        />
        <Button size="sm" onClick={submit} disabled={busy || !value.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function Avatar({
  name,
  avatarUrl,
  className,
}: {
  name: string;
  avatarUrl?: string | null;
  className?: string;
}) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className={cn("rounded-full object-cover", className)}
      />
    );
  }
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full bg-primary/15 font-semibold text-primary",
        className,
      )}
      aria-hidden
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}
