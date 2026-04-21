import { Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";

export function AppHeader() {
  const { user, profile, signOut } = useAuth();
  return (
    <header className="border-b border-border bg-background/80 backdrop-blur sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-7 h-7 rounded-md bg-gradient-to-br from-primary to-[var(--fiduciary)] flex items-center justify-center text-xs font-bold">
            🛡
          </div>
          <span className="font-display text-lg tracking-tight">DataGuardian</span>
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link to="/lobby" className="text-muted-foreground hover:text-foreground" activeProps={{ className: "text-foreground" }}>Play</Link>
          <Link to="/leaderboard" className="text-muted-foreground hover:text-foreground" activeProps={{ className: "text-foreground" }}>Leaderboard</Link>
          <Link to="/consent-demo" className="text-muted-foreground hover:text-foreground hidden sm:inline" activeProps={{ className: "text-foreground" }}>Consent Demo</Link>
          {user ? (
            <>
              <Link to="/profile" className="text-muted-foreground hover:text-foreground">{profile?.display_name ?? "Profile"}</Link>
              <button onClick={signOut} className="text-xs px-2.5 py-1 rounded border border-border hover:border-primary/40">Sign out</button>
            </>
          ) : (
            <Link to="/auth" className="text-xs px-3 py-1.5 rounded bg-primary text-primary-foreground font-medium">Sign in</Link>
          )}
        </nav>
      </div>
    </header>
  );
}
