import { createFileRoute, Link } from "@tanstack/react-router";
import { AppHeader } from "@/components/layout/AppHeader";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="px-3 py-1.5 rounded-full bg-surface-2 border border-border text-xs">
      <span className="font-mono font-bold mr-1.5">{value}</span>
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader />

      <main className="relative overflow-hidden">
        {/* Background pulsing arc */}
        <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <svg viewBox="0 0 600 600" className="w-[700px] h-[700px] opacity-20 animate-pulse-ring">
            <defs>
              <linearGradient id="g" x1="0" x2="1">
                <stop offset="0" stopColor="#3B82F6" />
                <stop offset="1" stopColor="#10B981" />
              </linearGradient>
            </defs>
            <circle cx="300" cy="300" r="240" fill="none" stroke="url(#g)" strokeWidth="1.5" />
            <circle cx="300" cy="300" r="180" fill="none" stroke="url(#g)" strokeWidth="1" />
            <path d="M 300,80 A 220,220 0 0 1 480,400" stroke="url(#g)" strokeWidth="3" fill="none" />
          </svg>
        </div>

        <div className="relative max-w-5xl mx-auto px-4 pt-20 md:pt-28 pb-20 text-center">
          <h1
            className="font-display text-5xl md:text-7xl tracking-tighter mb-3 animate-fade-in"
            style={{ animationDelay: "0ms" }}
          >
            DataGuardian
          </h1>
          <p
            className="text-xl md:text-2xl text-muted-foreground mb-5 animate-fade-in"
            style={{ animationDelay: "150ms" }}
          >
            The Compliance Challenge
          </p>
          <p
            className="max-w-xl mx-auto text-foreground/80 mb-9 animate-fade-in"
            style={{ animationDelay: "300ms" }}
          >
            Master India's DPDP Act 2023 through real banking & insurance scenarios.
            Not a PDF. A simulation.
          </p>

          <div
            className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10 animate-fade-in"
            style={{ animationDelay: "450ms" }}
          >
            <Link
              to="/lobby"
              search={{ mode: "solo" }}
              className="w-full sm:w-auto px-7 py-3 rounded-lg bg-primary text-primary-foreground font-semibold glow-primary hover:opacity-90 transition"
            >
              Play Solo
            </Link>
            <Link
              to="/lobby"
              search={{ mode: "multiplayer" }}
              className="w-full sm:w-auto px-7 py-3 rounded-lg border border-border bg-surface-2 hover:border-primary/40 transition"
            >
              Multiplayer
            </Link>
          </div>

          <div
            className="flex flex-wrap items-center justify-center gap-2 animate-fade-in"
            style={{ animationDelay: "600ms" }}
          >
            <Stat value="₹250Cr" label="Max Fine" />
            <Stat value="72 hrs" label="Breach Window" />
            <Stat value="26" label="Scenarios" />
            <Stat value="17" label="DPDP Principles" />
          </div>
        </div>

        <footer className="relative text-center text-xs text-muted-foreground pb-8">
          A DPDP Act 2023 Gamification Project · Banking & Insurance
        </footer>
      </main>
    </div>
  );
}
