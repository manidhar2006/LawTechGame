import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppHeader } from "@/components/layout/AppHeader";

export const Route = createFileRoute("/consent-demo")({
  component: ConsentDemo,
});

interface ConsentState {
  marketing: boolean;
  analytics: boolean;
  thirdParty: boolean;
  wealth: boolean;
}

function ConsentDemo() {
  const [c, setC] = useState<ConsentState>({ marketing: true, analytics: true, thirdParty: false, wealth: false });

  const Toggle = ({ k, label, desc }: { k: keyof ConsentState; label: string; desc: string }) => (
    <div className="flex items-start justify-between gap-3 p-3 rounded-lg border border-border bg-surface-2">
      <div className="flex-1">
        <div className="font-medium text-sm">{label}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{desc}</div>
        <div className="text-[10px] text-muted-foreground mt-1 font-mono">Last modified: today</div>
      </div>
      <button
        role="switch"
        aria-checked={c[k]}
        aria-label={`Toggle ${label} consent`}
        onClick={() => setC({ ...c, [k]: !c[k] })}
        className={`w-11 h-6 rounded-full p-0.5 transition ${c[k] ? "bg-accent" : "bg-border"}`}
      >
        <span className={`block w-5 h-5 rounded-full bg-background transition-transform ${c[k] ? "translate-x-5" : ""}`} />
      </button>
    </div>
  );

  const Status = ({ on, onText, offText }: { on: boolean; onText: string; offText: string }) => (
    <div className={`mt-2 text-xs px-2.5 py-1 rounded font-mono ${on ? "bg-accent/15 text-accent" : "bg-destructive/15 text-destructive"}`}>
      {on ? `✅ ${onText}` : `❌ ${offText}`}
    </div>
  );

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="max-w-5xl mx-auto px-4 pt-10 pb-16">
        <h1 className="font-display text-3xl mb-1">DPDP Consent Management Portal</h1>
        <p className="text-muted-foreground mb-6">Toggle a consent on the left and watch enforcement update on the right in real time.</p>

        <div className="grid md:grid-cols-2 gap-5">
          <section className="bg-surface border border-border rounded-xl p-5">
            <h2 className="font-display text-lg mb-3">Your Data Consents — Axiom Bank</h2>
            <div className="space-y-2.5">
              <Toggle k="marketing" label="Marketing (Email/SMS)" desc="Promotional offers, newsletters & product updates." />
              <Toggle k="analytics" label="Analytics & Profiling" desc="Used to personalise dashboards & spending insights." />
              <Toggle k="thirdParty" label="Third-Party Sharing (Partners)" desc="Share with partner banks for cross-product offers." />
              <Toggle k="wealth" label="Wealth Management Cross-Sell" desc="Investment & advisory recommendations." />
            </div>
            <button
              onClick={() => setC({ marketing: false, analytics: false, thirdParty: false, wealth: false })}
              className="mt-4 w-full py-2 rounded-md border border-destructive/40 text-destructive text-sm hover:bg-destructive/10"
            >
              Withdraw All Consent
            </button>
          </section>

          <section className="bg-surface border border-border rounded-xl p-5">
            <h2 className="font-display text-lg mb-3">Live Enforcement Demo</h2>
            <div className="space-y-3">
              <div className="rounded-lg border border-border p-3 bg-surface-2">
                <div className="text-sm font-medium">📨 Loan Offer</div>
                <div className="text-xs text-muted-foreground">Marketing consent required.</div>
                <Status on={c.marketing} onText="Loan offer displayed" offText="Loan offer blocked" />
              </div>
              <div className="rounded-lg border border-border p-3 bg-surface-2">
                <div className="text-sm font-medium">📊 Analytics Dashboard</div>
                <div className="text-xs text-muted-foreground">Analytics consent required.</div>
                {c.analytics ? (
                  <div className="mt-2 grid grid-cols-3 gap-2 text-xs font-mono">
                    <div className="bg-background rounded p-2">Bal ₹1,24,500</div>
                    <div className="bg-background rounded p-2">Spend ₹38,200</div>
                    <div className="bg-background rounded p-2">Savings 18%</div>
                  </div>
                ) : (
                  <Status on={false} onText="" offText="Analytics blocked — no consent" />
                )}
              </div>
              <div className="rounded-lg border border-border p-3 bg-surface-2">
                <div className="text-sm font-medium">🤝 Third-Party Partner Access</div>
                <div className="text-xs text-muted-foreground">Partner consent required.</div>
                <Status on={c.thirdParty} onText="Partner API: 200 OK" offText="Partner API returns 403" />
              </div>
              <div className="rounded-lg border border-border p-3 bg-surface-2">
                <div className="text-sm font-medium">💼 Wealth Cross-Sell</div>
                <div className="text-xs text-muted-foreground">Wealth consent required.</div>
                <Status on={c.wealth} onText="SIP recommendations active" offText="Cross-sell suppressed" />
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
