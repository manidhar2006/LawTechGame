import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AppHeader } from "@/components/layout/AppHeader";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);

  // Already signed in? bounce
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate({ to: "/lobby" });
    });
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (tab === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/lobby`,
            data: { display_name: displayName || email.split("@")[0] },
          },
        });
        if (error) throw error;
        toast.success("Account created!");
        navigate({ to: "/lobby" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back!");
        navigate({ to: "/lobby" });
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGuest = async () => {
    setLoading(true);
    try {
      const guestName = `Agent_${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      const guestEmail = `guest_${Date.now()}_${Math.random().toString(36).slice(2, 6)}@dataguardian.local`;
      const guestPass = crypto.randomUUID();
      const { error } = await supabase.auth.signUp({
        email: guestEmail,
        password: guestPass,
        options: { data: { display_name: guestName } },
      });
      if (error) throw error;
      // Auto sign in (in case email confirm is on, signUp returns session if not required)
      await supabase.auth.signInWithPassword({ email: guestEmail, password: guestPass });
      toast.success(`Welcome, ${guestName}!`);
      navigate({ to: "/lobby" });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Guest login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="max-w-md mx-auto px-4 pt-12">
        <div className="bg-surface border border-border rounded-xl p-6 animate-slide-up">
          <h1 className="font-display text-2xl mb-1">Sign in to DataGuardian</h1>
          <p className="text-sm text-muted-foreground mb-5">Track your scores and challenge friends.</p>

          <div className="flex gap-1 mb-5 p-1 bg-surface-2 rounded-md">
            {(["signin", "signup"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-1.5 rounded text-sm font-medium transition ${
                  tab === t ? "bg-background text-foreground" : "text-muted-foreground"
                }`}
              >
                {t === "signin" ? "Sign In" : "Sign Up"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {tab === "signup" && (
              <input
                type="text"
                placeholder="Display name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3 py-2.5 rounded-md bg-surface-2 border border-border focus:outline-none focus:border-primary"
                required
              />
            )}
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2.5 rounded-md bg-surface-2 border border-border focus:outline-none focus:border-primary"
              required
            />
            <input
              type="password"
              placeholder="Password (min 6 chars)"
              value={password}
              minLength={6}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2.5 rounded-md bg-surface-2 border border-border focus:outline-none focus:border-primary"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-md bg-primary text-primary-foreground font-medium disabled:opacity-50"
            >
              {loading ? "..." : tab === "signin" ? "Sign In" : "Create Account"}
            </button>
          </form>

          <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="flex-1 h-px bg-border" />
            OR
            <div className="flex-1 h-px bg-border" />
          </div>

          <button
            onClick={handleGuest}
            disabled={loading}
            className="w-full py-2.5 rounded-md border border-border bg-surface-2 hover:border-primary/40 transition"
          >
            Continue as Guest
          </button>

          <p className="text-xs text-muted-foreground mt-4 text-center">
            <Link to="/" className="hover:text-foreground">← Back home</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
