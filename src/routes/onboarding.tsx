import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/onboarding")({
  component: Onboarding,
});

const CARDS = [
  { icon: "❤️", title: "Compliance Meter", text: "Your DPDP health bar. Stay above 70% or face a DPO audit. Drop below 40% and a forced audit triggers. Hit 0% — regulatory shutdown." },
  { icon: "📞", title: "DPO Tokens", text: "Three lifelines per game. Tap 'Ask DPO' on any scenario to unlock a one-line legal hint from the Data Protection Officer." },
  { icon: "⚡", title: "Score & Levels", text: "+100 for perfect compliance, +60 for safe answers. Wrong decisions cost −50 to −150. Reach Level 3 to face the Courtroom." },
  { icon: "💰", title: "Revenue & Shift Timer", text: "Fiduciary only — ₹1,00,000 branch, 480-minute shift. Non-compliant shortcuts earn quick cash but bleed it fast." },
];

function Onboarding() {
  const navigate = useNavigate();
  const [i, setI] = useState(0);

  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem("dg_onboarded")) {
      navigate({ to: "/lobby" });
    }
  }, [navigate]);

  const finish = () => {
    if (typeof window !== "undefined") localStorage.setItem("dg_onboarded", "1");
    navigate({ to: "/lobby" });
  };

  const card = CARDS[i];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex justify-end p-4">
        <button onClick={finish} className="text-sm text-muted-foreground hover:text-foreground">Skip →</button>
      </div>
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-surface border border-border rounded-xl p-8 text-center animate-slide-up">
          <div className="text-5xl mb-4">{card.icon}</div>
          <h2 className="font-display text-2xl mb-3">{card.title}</h2>
          <p className="text-foreground/85 leading-relaxed">{card.text}</p>
          <div className="flex justify-center gap-1.5 my-6">
            {CARDS.map((_, idx) => (
              <span key={idx} className={`h-1.5 rounded-full transition-all ${idx === i ? "w-6 bg-primary" : "w-1.5 bg-border"}`} />
            ))}
          </div>
          {i < CARDS.length - 1 ? (
            <button onClick={() => setI(i + 1)} className="w-full py-2.5 rounded-md bg-primary text-primary-foreground font-medium">Next</button>
          ) : (
            <button onClick={finish} className="w-full py-2.5 rounded-md bg-accent text-accent-foreground font-semibold">Start Playing</button>
          )}
          <Link to="/" className="block text-xs text-muted-foreground hover:text-foreground mt-3">Back home</Link>
        </div>
      </div>
    </div>
  );
}
