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
              type="text"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2.5 rounded-md bg-surface-2 border border-border focus:outline-none focus:border-primary"
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
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

          <p className="text-xs text-muted-foreground mt-4 text-center">
            <Link to="/" className="hover:text-foreground">← Back home</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
