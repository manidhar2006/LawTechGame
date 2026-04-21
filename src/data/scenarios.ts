export type Choice = "A" | "B" | "C" | "D";
export type Role = "fiduciary" | "principal";
export type SimulationFormat =
  | "bank_desk"
  | "email"
  | "chat"
  | "phone"
  | "alert"
  | "courtroom"
  | "call_centre"
  | "form_audit";

export interface Scenario {
  id: string;
  level: 1 | 2 | 3;
  scenarioNumber: number;
  totalInLevel: number;
  role: Role;
  title: string;
  domain: string;
  dpdpConcepts: string[];
  simulationFormat: SimulationFormat;
  isTimed: boolean;
  timerSeconds?: number;
  situation: string;
  choices: { A: string; B: string; C: string; D: string };
  correctChoice: "A";
  choiceScores: { A: 100; B: 60; C: -50; D: -150 };
  choiceComplianceDelta: { A: number; B: number; C: number; D: number };
  choiceRevenueDelta?: { A: number; B: number; C: number; D: number };
  explanation: string;
  dpoHint: string;
}

const baseScores = { A: 100, B: 60, C: -50, D: -150 } as const;
const baseCompliance = { A: 5, B: 0, C: -15, D: -15 } as const;
const baseRevenue = { A: -2000, B: -1000, C: 5000, D: 10000 } as const;

const sc = (s: Omit<Scenario, "correctChoice" | "choiceScores" | "choiceComplianceDelta">): Scenario => ({
  ...s,
  correctChoice: "A",
  choiceScores: { ...baseScores },
  choiceComplianceDelta: { ...baseCompliance },
});

export const SCENARIOS: Scenario[] = [
  // ===== LEVEL 1 — AWARENESS (4) =====
  sc({
    id: "L1-01", level: 1, scenarioNumber: 1, totalInLevel: 4,
    role: "fiduciary", title: "The KYC Photo Grab",
    domain: "Banking", dpdpConcepts: ["Data Minimisation"],
    simulationFormat: "bank_desk", isTimed: false,
    situation:
      "Bank officer photographs a customer's entire Aadhaar card — front, back & biometrics — even though only name & address are needed for KYC.",
    choices: {
      A: "Collect only name & address. Delete the photograph from the shared branch folder immediately.",
      B: "Photograph the full card but store it in a restricted compliance folder.",
      C: "Photograph both sides for records but delete biometric data only.",
      D: "Approve full capture — 'it might be useful later.'",
    },
    choiceRevenueDelta: { ...baseRevenue },
    explanation:
      "DPDP §4 + §6: a Data Fiduciary may only process the minimum personal data necessary for the stated purpose. Aadhaar biometrics are never required for routine KYC.",
    dpoHint:
      "Apply Data Minimisation under DPDP §4 — only collect what is strictly required for the specific purpose.",
  }),
  sc({
    id: "L1-02", level: 1, scenarioNumber: 2, totalInLevel: 4,
    role: "fiduciary", title: "The Third-Party Vendor",
    domain: "Banking", dpdpConcepts: ["Data Processing Agreements"],
    simulationFormat: "email", isTimed: false,
    situation:
      "A new analytics vendor wants access to customer transaction data for 'fraud pattern modelling.' No DPA signed yet. Your manager says 'approve it verbally for now.'",
    choices: {
      A: "Refuse access until a signed DPA is in place. Draft the DPA template from the compliance repository.",
      B: "Allow read-only access temporarily until the DPA is signed next week.",
      C: "Share only aggregated data (no PII) while the DPA is being prepared.",
      D: "Approve verbally and email the vendor the raw transaction dump.",
    },
    choiceRevenueDelta: { ...baseRevenue },
    explanation:
      "DPDP §8(2): a Data Fiduciary remains liable for any Data Processor it engages. A signed Data Processing Agreement is mandatory before any access — verbal approvals are non-compliant.",
    dpoHint:
      "Under DPDP §8(2), any third-party processor must be engaged via a written contract before data flows.",
  }),
  sc({
    id: "L1-03", level: 1, scenarioNumber: 3, totalInLevel: 4,
    role: "principal", title: "The Right to Erasure",
    domain: "Banking", dpdpConcepts: ["Right to Erasure"],
    simulationFormat: "chat", isTimed: false,
    situation:
      "You closed your savings account 2 years ago. The bank app still shows your old loan EMI history and sends you promotional emails for new loans.",
    choices: {
      A: "Send a formal written erasure request citing DPDP §12. Specify all data categories to be deleted and request confirmation within the statutory period.",
      B: "Just unsubscribe from promotional emails using the unsubscribe link.",
      C: "Call customer care and ask them to 'remove you from the system.'",
      D: "Ignore it — the data is old and not really sensitive.",
    },
    explanation:
      "DPDP §12(3): a Data Principal has the right to erasure of personal data once the purpose is fulfilled, unless retention is required by law.",
    dpoHint:
      "Send a formal §12 erasure request in writing — informal opt-outs do not trigger statutory obligations.",
  }),
  sc({
    id: "L1-04", level: 1, scenarioNumber: 4, totalInLevel: 4,
    role: "principal", title: "The FD Renewal Pre-Ticked",
    domain: "Banking", dpdpConcepts: ["Informed Consent", "Right to Correction"],
    simulationFormat: "phone", isTimed: false,
    situation:
      "FD renewal screen shows two pre-ticked boxes: deceased father as nominee & consent to share FD data with group companies for wealth management upselling.",
    choices: {
      A: "Uncheck both boxes. Update nominee to a current family member. Re-tick wealth management consent only if genuinely wanted.",
      B: "Uncheck only the deceased nominee box — the wealth management consent seems harmless.",
      C: "Proceed with renewal — you'll update the details later.",
      D: "Proceed without reviewing — FD renewal is the priority.",
    },
    explanation:
      "DPDP §6: consent must be free, specific, informed, unconditional and unambiguous — pre-ticked boxes are invalid consent.",
    dpoHint:
      "Pre-ticked consent is not consent under DPDP §6 — every purpose needs an explicit, separate opt-in.",
  }),

  // ===== LEVEL 2 — APPLICATION (6) =====
  sc({
    id: "L2-01", level: 2, scenarioNumber: 1, totalInLevel: 6,
    role: "fiduciary", title: "The Recovery Agent WhatsApp",
    domain: "Banking / Lending", dpdpConcepts: ["Data Breach Notification", "Unauthorized Sharing"],
    simulationFormat: "alert", isTimed: true, timerSeconds: 5400,
    situation:
      "A recovery agent shared borrower photos, addresses & outstanding amounts in a WhatsApp group with 12 agents. 340 customers are affected. The 90-minute breach response window has begun.",
    choices: {
      A: "Escalate to the DPO immediately. Document the breach, notify affected customers and report to the Data Protection Board within 72 hrs. Revoke the agent's data access.",
      B: "Remove the agent from the group and send a generic 'security advisory' to affected borrowers.",
      C: "Notify only customers whose full identity was shared; others don't need to know.",
      D: "Handle it quietly — log it as a minor procedural violation.",
    },
    choiceRevenueDelta: { A: -3000, B: -1500, C: 4000, D: 12000 },
    explanation:
      "DPDP §8(6): every personal data breach must be reported to the Data Protection Board AND each affected Data Principal — the 72-hour clock runs from discovery.",
    dpoHint:
      "DPDP §8(6) mandates breach notification to the DPB and affected principals — silence is itself a violation.",
  }),
  sc({
    id: "L2-02", level: 2, scenarioNumber: 2, totalInLevel: 6,
    role: "fiduciary", title: "The Language Barrier",
    domain: "Banking", dpdpConcepts: ["Accessible Consent"],
    simulationFormat: "bank_desk", isTimed: false,
    situation:
      "An elderly Kannada-speaking farmer wants to open a Jan Dhan account. Your branch has only English consent forms. The relationship manager says 'just get his thumb impression.'",
    choices: {
      A: "Arrange a Kannada-translated consent form or interpreter. Ensure consent is fully informed before proceeding. Document the language assistance provided.",
      B: "Use the English form but read it aloud in Kannada before taking the thumb impression.",
      C: "Take the thumb impression and attach a note saying consent was explained orally.",
      D: "Proceed with the English form — a thumb impression is legally sufficient.",
    },
    choiceRevenueDelta: { ...baseRevenue },
    explanation:
      "DPDP §6(3): consent notice must be available in English or any of the 22 languages in the 8th Schedule of the Constitution. Consent is invalid if the principal cannot understand it.",
    dpoHint:
      "DPDP §6(3) — consent notices must be offered in the principal's language. Provide a translation.",
  }),
  sc({
    id: "L2-03", level: 2, scenarioNumber: 3, totalInLevel: 6,
    role: "principal", title: "The Minor's Policy",
    domain: "Insurance", dpdpConcepts: ["Children's Data Protection"],
    simulationFormat: "phone", isTimed: false,
    situation:
      "You are enrolling your 15-year-old in a health policy. The insurer's app asks for the minor's social media profiles and school grades 'to personalise coverage.'",
    choices: {
      A: "Refuse to provide social media and school data. They are unnecessary for health insurance underwriting. Challenge the purpose under DPDP §9.",
      B: "Provide school grades only — grades are less sensitive than social media.",
      C: "Provide social media handles but mark them private, hoping the insurer won't access them.",
      D: "Provide all requested data — personalised coverage is worth it.",
    },
    explanation:
      "DPDP §9: data of children must be processed in a manner verifiably consented to by the parent and never used for tracking, behavioural monitoring, or targeted advertising.",
    dpoHint:
      "DPDP §9 prohibits behavioural tracking or targeting of minors — challenge any non-essential data ask.",
  }),
  sc({
    id: "L2-04", level: 2, scenarioNumber: 4, totalInLevel: 6,
    role: "principal", title: "The Forgotten Customer",
    domain: "Banking", dpdpConcepts: ["Data Retention"],
    simulationFormat: "chat", isTimed: false,
    situation:
      "You discover a fintech app you deleted 3 years ago still has your KYC documents, PAN card, and credit score data stored in their system.",
    choices: {
      A: "Issue a formal data erasure notice. Request confirmation of deletion within the statutory window. If no response in 30 days, escalate to the Data Protection Board.",
      B: "Email their support asking them to delete your data.",
      C: "Post about it on Twitter to pressure them into responding.",
      D: "Create a new account to see how they are using your data before deciding what to do.",
    },
    explanation:
      "DPDP §8(7): a Data Fiduciary must erase personal data once the purpose is no longer being served and consent is withdrawn — unless retention is required by law.",
    dpoHint:
      "Use §12 erasure + §13 grievance escalation. The DPB is the statutory next step if ignored.",
  }),
  sc({
    id: "L2-05", level: 2, scenarioNumber: 5, totalInLevel: 6,
    role: "fiduciary", title: "The Breach Event",
    domain: "Insurance", dpdpConcepts: ["Incident Response", "Breach Notification"],
    simulationFormat: "alert", isTimed: true, timerSeconds: 5400,
    situation:
      "Your insurer's TPA portal was breached. 50,000 health insurance claim records — including diagnosis codes and surgical histories — are now on a dark web forum. Your CEO says 'wait till Monday to assess the full impact.'",
    choices: {
      A: "Override the CEO's request. Initiate immediate DPB notification. Activate the incident response plan. Inform affected policyholders. The 72-hr clock started at discovery.",
      B: "Conduct an internal assessment first — 24 hours max — then decide whether to notify.",
      C: "Notify only policyholders whose data has been confirmed on the dark web forum.",
      D: "Wait till Monday as instructed — breaches need full information before notification.",
    },
    choiceRevenueDelta: { A: -4000, B: 2000, C: 6000, D: 14000 },
    explanation:
      "DPDP §8(6): breach notification is mandatory within the prescribed window — health data is highly sensitive and delaying notification compounds liability.",
    dpoHint:
      "Discovery starts the 72-hour clock — internal hierarchy cannot override statutory duty to notify.",
  }),
  sc({
    id: "L2-06", level: 2, scenarioNumber: 6, totalInLevel: 6,
    role: "fiduciary", title: "The Loan Analytics Vendor",
    domain: "Banking", dpdpConcepts: ["Data Processing Agreements", "Vendor Risk"],
    simulationFormat: "bank_desk", isTimed: false,
    situation:
      "A credit risk analytics company requests your branch's last 12 months of loan applicant data to train their AI model. They offer a 20% discount on their API in exchange.",
    choices: {
      A: "Decline unless a robust DPA is signed, the purpose is explicitly consent-aligned, and data is anonymised per DPDP standards. No commercial benefit justifies bypassing consent.",
      B: "Agree but anonymise all customer names before sharing — 'no PII means no DPDP issue.'",
      C: "Share only applicants who gave broad consent to 'analytics and research' on their loan forms.",
      D: "Accept the deal — 20% discount benefits the branch and the model improves risk scoring.",
    },
    choiceRevenueDelta: { A: -3000, B: 1000, C: 4000, D: 9000 },
    explanation:
      "DPDP §7: processing must be tied to a specified purpose for which consent was given. Re-purposing for AI training requires fresh, specific consent and a DPA.",
    dpoHint:
      "Purpose limitation under §7 — past consent does not authorise new uses, even if anonymised.",
  }),

  // ===== LEVEL 3 — ADVANCED (16) =====
  sc({
    id: "L3-01", level: 3, scenarioNumber: 1, totalInLevel: 16,
    role: "fiduciary", title: "The UPI Fraud Investigation",
    domain: "Banking / FinTech", dpdpConcepts: ["Lawful Data Sharing", "State Exemptions"],
    simulationFormat: "alert", isTimed: true, timerSeconds: 3600,
    situation:
      "A cybercrime unit sends a 'request letter' for transaction history, UPI device IDs, IP addresses & GPS data of 500 customers. No court order is attached. Your CEO says comply.",
    choices: {
      A: "Request a formal court order or judicial warrant. Inform law enforcement that the bank requires legal authority per RBI guidelines and DPDP §17 before releasing personal data.",
      B: "Provide transaction history only (no device IDs or GPS) since financial data is less sensitive.",
      C: "Share all data but redact customer names.",
      D: "Comply immediately with the CEO's instruction — share all requested data.",
    },
    choiceRevenueDelta: { A: -2000, B: 1000, C: 3000, D: 8000 },
    explanation:
      "DPDP §17: state exemptions apply only to notified instrumentalities and lawful procedures. Without a court order or formal direction, the bank cannot disclose personal data.",
    dpoHint:
      "§17 exemptions require lawful authority — ask for a court order before sharing any principal data.",
  }),
  sc({
    id: "L3-02", level: 3, scenarioNumber: 2, totalInLevel: 16,
    role: "fiduciary", title: "KYC Document Vault",
    domain: "Banking", dpdpConcepts: ["Storage Limitation", "Retention"],
    simulationFormat: "form_audit", isTimed: false,
    situation:
      "Your audit reveals 14,000 closed-account KYC files stored indefinitely in a 'permanent archive' server. No retention policy governs them. Some accounts were closed 12 years ago.",
    choices: {
      A: "Implement a retention schedule: apply the PMLA 5-year post-closure rule; schedule mass deletion of expired files; log all deletions with timestamps; update policy documentation.",
      B: "Keep files for 10 years from closure as a safe buffer against regulatory audits.",
      C: "Archive them to cold storage — they're 'practically inaccessible' so retention isn't an issue.",
      D: "Leave as-is until the next formal regulatory audit requires a cleanup.",
    },
    choiceRevenueDelta: { A: -3000, B: -1000, C: 2000, D: 6000 },
    explanation:
      "DPDP §8(7) read with PMLA: personal data must be erased once the retention purpose lapses. Indefinite storage is a §8(7) violation.",
    dpoHint:
      "PMLA = 5 years post-closure. After that, retention has no lawful basis under DPDP §8(7).",
  }),
  sc({
    id: "L3-03", level: 3, scenarioNumber: 3, totalInLevel: 16,
    role: "fiduciary", title: "The Marketing Blitz",
    domain: "Banking", dpdpConcepts: ["Consent", "Purpose Limitation"],
    simulationFormat: "call_centre", isTimed: false,
    situation:
      "Your call centre is about to launch a cross-sell campaign targeting 200,000 customers. The list was generated from loan inquiry data where consent was given 'for loan processing purposes only.'",
    choices: {
      A: "Halt the campaign. The consent is purpose-limited to loan processing. Obtain fresh, specific marketing consent before launching. Redesign consent flows going forward.",
      B: "Proceed but offer an easy opt-out at the start of each call.",
      C: "Proceed only with customers who haven't withdrawn consent and gave broad 'banking services' consent.",
      D: "Launch the campaign — 'loan processing' is broad enough to include product offers.",
    },
    choiceRevenueDelta: { A: -5000, B: 2000, C: 4000, D: 12000 },
    explanation:
      "DPDP §6 + §7: consent is purpose-bound. Marketing requires its own granular consent — old loan-processing consent cannot be repurposed.",
    dpoHint:
      "Each new purpose needs its own consent under §6/§7. Bundled or repurposed consent is invalid.",
  }),
  sc({
    id: "L3-04", level: 3, scenarioNumber: 4, totalInLevel: 16,
    role: "fiduciary", title: "Data Breach War Room",
    domain: "Banking", dpdpConcepts: ["Incident Response", "Insider Threat"],
    simulationFormat: "alert", isTimed: true, timerSeconds: 5400,
    situation:
      "An internal whistleblower reports that a senior data engineer has been exfiltrating customer records to a competitor for 6 months. HR wants 2 weeks for an investigation before any regulatory notification.",
    choices: {
      A: "Notify the DPB immediately — discovery resets the 72-hr clock. Place the engineer on administrative leave. Preserve digital evidence. Notify affected customers.",
      B: "Give HR one week — faster than their request but allows for a proper investigation.",
      C: "Notify the DPB only after confirming the exact number of affected records.",
      D: "Follow HR's lead — 2-week investigations are standard for insider threats.",
    },
    choiceRevenueDelta: { A: -4000, B: 1500, C: 5000, D: 13000 },
    explanation:
      "DPDP §8(6): the obligation to notify is independent of internal investigation timelines. The clock starts on discovery, not on root-cause analysis.",
    dpoHint:
      "Discovery = 72-hr clock. HR investigation runs in parallel, not before notification.",
  }),
  sc({
    id: "L3-05", level: 3, scenarioNumber: 5, totalInLevel: 16,
    role: "principal", title: "The Correction Request",
    domain: "Banking", dpdpConcepts: ["Right to Correction"],
    simulationFormat: "bank_desk", isTimed: false,
    situation:
      "Your CIBIL report shows a loan you never took — your details were used fraudulently 4 years ago. The bank says they 'cannot alter records' and tells you to 'raise a dispute with CIBIL directly.'",
    choices: {
      A: "Invoke DPDP §12 — Right to Correction. Demand a written correction of inaccurate data from the bank as the Data Fiduciary. Request the fraud investigation report. Simultaneously raise the CIBIL dispute.",
      B: "Raise the CIBIL dispute as the bank suggests and wait for their process.",
      C: "File a police FIR for identity theft — the criminal route is faster than DPDP complaints.",
      D: "Accept the situation — CIBIL disputes take too long and won't help your credit score quickly.",
    },
    explanation:
      "DPDP §12: the principal has a right to correction and erasure of inaccurate data. The Fiduciary cannot offload this duty to a third party (the credit bureau).",
    dpoHint:
      "§12 places the correction duty on the Fiduciary. They cannot deflect to CIBIL.",
  }),
  sc({
    id: "L3-06", level: 3, scenarioNumber: 6, totalInLevel: 16,
    role: "principal", title: "The Constitutional Foundation",
    domain: "Financial Services", dpdpConcepts: ["Fundamental Rights", "Privacy"],
    simulationFormat: "courtroom", isTimed: false,
    situation:
      "The court is examining whether a fintech company's right to collect 'publicly available social media data' without consent overrides a customer's right to informational privacy. You are an amicus curiae.",
    choices: {
      A: "Argue Puttaswamy 2017 establishes privacy as a fundamental right under Article 21. Informational self-determination means even publicly visible data requires lawful basis under DPDP. There is no privacy waiver in ToS.",
      B: "Argue that publicly available data has no expectation of privacy — users accepted this when posting.",
      C: "Argue a proportionality test — light-touch data like public posts is acceptable but sensitive profiling is not.",
      D: "Argue DPDP only governs 'digital personal data' in a structured database — scraped social media is unstructured and falls outside the Act.",
    },
    explanation:
      "Puttaswamy v. Union of India (2017): privacy is a fundamental right. DPDP gives statutory expression to informational self-determination — public visibility ≠ consent.",
    dpoHint:
      "Puttaswamy + DPDP §3 — public visibility is not lawful basis. Consent is still required.",
  }),
  sc({
    id: "L3-07", level: 3, scenarioNumber: 7, totalInLevel: 16,
    role: "fiduciary", title: "Loan Application Data Sharing",
    domain: "Banking / FinTech", dpdpConcepts: ["Lawful Data Sharing", "Purpose Limitation"],
    simulationFormat: "call_centre", isTimed: false,
    situation:
      "A mortgage customer asks why their salary slips were shared with 3 partner banks they never applied to. Your team says it was 'to find them the best rate.'",
    choices: {
      A: "Acknowledge the violation. The sharing had no lawful basis — loan-processing consent is purpose-limited. Inform the customer of all parties under §11. Retract data from partner banks. Trigger a DPA review.",
      B: "Explain that finding the best rate was in the customer's interest — implied consent applies.",
      C: "Apologise and offer the customer a fee waiver on their mortgage as goodwill.",
      D: "Deny the sharing happened and request proof from the customer.",
    },
    choiceRevenueDelta: { A: -3000, B: 2000, C: -500, D: 7000 },
    explanation:
      "DPDP §6 + §11: consent must be specific. Sharing with unrelated partners is unauthorised, and the principal has the right to know all recipients of their data.",
    dpoHint:
      "§11 grants the right to a list of every party data was shared with. Implied consent is not a thing under DPDP.",
  }),
  sc({
    id: "L3-08", level: 3, scenarioNumber: 8, totalInLevel: 16,
    role: "principal", title: "The Retirement Fund Profiling",
    domain: "Banking", dpdpConcepts: ["Behavioural Profiling", "Consent"],
    simulationFormat: "phone", isTimed: false,
    situation:
      "Your EPF-linked mutual fund sends an email with a 'predicted retirement corpus shortfall' built on salary history, UPI patterns & social signals — without your explicit consent for profiling.",
    choices: {
      A: "Write to the AMC demanding: what data was used, the legal basis for profiling, and the identity of third-party data sources. Withdraw consent. Demand erasure of all inferred / derived data.",
      B: "Ignore it — the analysis is useful and they probably have it in their ToS somewhere.",
      C: "Opt out of marketing communications but allow them to retain the profiling model.",
      D: "Find the analysis useful and explore their recommended products.",
    },
    explanation:
      "DPDP §6 + §11: profiling requires explicit, informed consent. Inferred data is personal data and is subject to the right to erasure.",
    dpoHint:
      "Inferred / derived data is personal data under DPDP — same rights of access and erasure apply.",
  }),
  sc({
    id: "L3-09", level: 3, scenarioNumber: 9, totalInLevel: 16,
    role: "fiduciary", title: "Foreign National — KYC Collection",
    domain: "Banking", dpdpConcepts: ["Purpose Limitation", "Data Minimisation"],
    simulationFormat: "bank_desk", isTimed: false,
    situation:
      "A UK consultant on a 1-year India assignment wants to open a savings account. He has passport, visa, UK address, Indian rental address, and contact details — but no PAN yet.",
    choices: {
      A: "Collect Passport, Visa, both addresses, and contact details per RBI KYC norms. Mark PAN as 'not held' — do not insist. Document the lawful basis under DPDP §4.",
      B: "Collect everything but refuse to open the account until he applies for PAN — 'PAN is always required.'",
      C: "Skip the overseas UK address — 'he's in India now, one address is enough.'",
      D: "Collect all documents plus full-passport scans of every page and social media handles 'for enhanced due diligence.'",
    },
    choiceRevenueDelta: { ...baseRevenue },
    explanation:
      "DPDP §4 + RBI KYC Master Direction: collect only data necessary for the customer category. Excess collection (social media, every passport page) breaches §4.",
    dpoHint:
      "RBI KYC + DPDP §4 — match the document set to the customer category, no more.",
  }),
  sc({
    id: "L3-10", level: 3, scenarioNumber: 10, totalInLevel: 16,
    role: "fiduciary", title: "Foreign National — Storage & Retention",
    domain: "Banking", dpdpConcepts: ["Storage Limitation", "PMLA"],
    simulationFormat: "form_audit", isTimed: false,
    situation:
      "Records alert: Account #FN-887421 (James Whitmore, UK) closed 6 years ago. KYC pack still in 'Permanent Foreign Customers' folder. The PMLA 5-year post-closure window has expired.",
    choices: {
      A: "Erase the KYC pack — the PMLA window has expired and no other legal basis applies. Log the erasure with timestamp and reviewer. Update the retention schedule.",
      B: "Keep everything — regulators might ask, and he might return.",
      C: "Move the file to an overseas archive server to free up local storage.",
      D: "Delete address and visa but retain the passport scan as 'identity proof.'",
    },
    choiceRevenueDelta: { A: -2000, B: 0, C: 3000, D: 4000 },
    explanation:
      "DPDP §8(7): once the retention basis ends, erase. 'Might be useful' is not a lawful basis.",
    dpoHint:
      "No lawful basis = mandatory erasure under §8(7). Document the deletion.",
  }),
  sc({
    id: "L3-11", level: 3, scenarioNumber: 11, totalInLevel: 16,
    role: "fiduciary", title: "SSY for a Foreign-Passport Child",
    domain: "Banking", dpdpConcepts: ["Data Minimisation", "Purpose Limitation"],
    simulationFormat: "bank_desk", isTimed: false,
    situation:
      "Parents on an Indian work visa want to open a Sukanya Samriddhi Yojana account for their daughter — who holds a foreign passport. All documents already collected at the counter. The child is ineligible.",
    choices: {
      A: "Inform the parents the child is ineligible. Stop processing immediately. Delete all collected documents and confirm deletion in writing. Do not reuse the data for any other product without fresh consent.",
      B: "Decline SSY but keep the documents on file 'in case a suitable scheme becomes available later.'",
      C: "Use the documents already collected to pitch and onboard the parents into a mutual fund SIP without fresh consent.",
      D: "Documents look fine — open the SSY account and worry about eligibility later.",
    },
    choiceRevenueDelta: { A: -2000, B: 0, C: 6000, D: 8000 },
    explanation:
      "DPDP §7 + §8(7): when the original purpose collapses, retention and reuse without fresh consent is unlawful.",
    dpoHint:
      "Purpose dies → data dies. No reuse without a new §6 consent.",
  }),
  sc({
    id: "L3-12", level: 3, scenarioNumber: 12, totalInLevel: 16,
    role: "principal", title: "Right to Access — UK Expat Employee",
    domain: "IT / Employment", dpdpConcepts: ["Right to Access §11", "Territorial Applicability §3"],
    simulationFormat: "courtroom", isTimed: false,
    situation:
      "You are James, a British national employed at an Indian IT firm in Bengaluru. You sent a DPDP §11 access request. HR says your UK-governed contract means GDPR applies, not DPDP — and declines to respond.",
    choices: {
      A: "Reply citing DPDP §11(1)(a) and (b) and §3 — processing happens in India so DPDP applies regardless of contract law. Demand the data summary AND the identity of the US payroll processor in writing.",
      B: "Accept HR's position and file a Subject Access Request under UK GDPR with the firm's UK parent.",
      C: "Agree to receive only the categories of data shared, dropping the demand for third-party identities to avoid friction.",
      D: "Hire a lawyer and send a formal legal notice before the firm is obliged to respond.",
    },
    explanation:
      "DPDP §3: the Act applies to processing within India, irrespective of the principal's nationality or governing-law clauses.",
    dpoHint:
      "DPDP §3 is territorial — processing in India = DPDP applies, period.",
  }),
  sc({
    id: "L3-13", level: 3, scenarioNumber: 13, totalInLevel: 16,
    role: "principal", title: "Data Portability — Returning to Canada",
    domain: "Insurance", dpdpConcepts: ["Right to Access", "Cross-Border Transfer §16"],
    simulationFormat: "bank_desk", isTimed: false,
    situation:
      "You are Priya, a Canadian national ending a 2-year health policy in India. You ask the insurer to port your claims history directly to your new Canadian insurer. The agent agrees. Canada is NOT on the MeitY-notified list.",
    choices: {
      A: "Refuse the direct cross-border push. Ask the insurer to provide your data to YOU in a structured, machine-readable format under §11. You will share it with the Canadian insurer yourself.",
      B: "Confirm the direct transfer to the Canadian insurer in writing, since you have given consent.",
      C: "Ask the insurer to transmit only non-sensitive fields directly to Canada and email the rest to you.",
      D: "Tell the insurer to seek RBI approval before transferring your data abroad.",
    },
    explanation:
      "DPDP §16: cross-border transfers are restricted to countries notified by the Central Government. Receiving the data yourself avoids the restriction entirely.",
    dpoHint:
      "Use §11 to receive your own data — bypasses §16 cross-border restrictions.",
  }),
  sc({
    id: "L3-14", level: 3, scenarioNumber: 14, totalInLevel: 16,
    role: "principal", title: "Grievance Redressal — Biometric Leak",
    domain: "Sports / Employment", dpdpConcepts: ["Grievance Redressal §13", "Biometric Data"],
    simulationFormat: "courtroom", isTimed: false,
    situation:
      "You are Carlos, a Spanish football coach at an Indian sports academy. The academy shared your biometric attendance data with a third-party analytics firm without consent. You raised a grievance 30 days ago — no substantive response from the DPO.",
    choices: {
      A: "File a complaint with the Data Protection Board of India under §25, citing unauthorised biometric processing and the academy's failure to resolve the grievance within the prescribed period.",
      B: "File a complaint with Spain's data protection authority (AEPD) since you are a Spanish citizen.",
      C: "Skip the regulator and file a civil suit in local court directly for damages.",
      D: "Politely re-submit your grievance and give the DPO another 30 days before doing anything else.",
    },
    explanation:
      "DPDP §13 + §25: principals must first use the Fiduciary's grievance mechanism. After non-response in the prescribed period, escalate to the DPB.",
    dpoHint:
      "§13 → §25 ladder: Fiduciary grievance first, then DPB.",
  }),
  sc({
    id: "L3-15", level: 3, scenarioNumber: 15, totalInLevel: 16,
    role: "fiduciary", title: "The Consent Audit Trail",
    domain: "Banking", dpdpConcepts: ["Consent", "Enforcement"],
    simulationFormat: "form_audit", isTimed: false,
    situation:
      "A DPDP compliance audit requests proof of consent for 500 customers who received marketing SMSes last quarter. Your CRM shows consent was 'assumed' via bundled product ToS from 2019.",
    choices: {
      A: "Acknowledge the gap. Provide an audit trail showing what consent was collected and when. Halt further marketing to the 500 customers. Implement granular, timestamped consent capture going forward.",
      B: "Present the 2019 ToS as valid consent — it was publicly available and customers accepted it.",
      C: "Only present consent records for customers who explicitly opted in via the newer 2023 forms.",
      D: "Delay the audit response and quietly obtain fresh consent from as many customers as possible before responding.",
    },
    choiceRevenueDelta: { A: -3000, B: 1000, C: 0, D: 8000 },
    explanation:
      "DPDP §6 + §10: bundled ToS is not valid consent. Significant Data Fiduciaries must maintain a verifiable, granular consent audit trail.",
    dpoHint:
      "Bundled ToS = not consent under DPDP §6. Acknowledge and remediate.",
  }),
  sc({
    id: "L3-16", level: 3, scenarioNumber: 16, totalInLevel: 16,
    role: "principal", title: "The Difficult Withdrawal",
    domain: "Banking", dpdpConcepts: ["Consent Withdrawal", "Right to Erasure"],
    simulationFormat: "chat", isTimed: false,
    situation:
      "You try to withdraw consent for marketing communications from your bank's mobile app. The app makes it a 7-step process involving a branch visit, signed letter, and 30-day processing time.",
    choices: {
      A: "Formally challenge the withdrawal process in writing. Under DPDP, consent withdrawal must be as easy as giving consent. Escalate to the bank's Nodal Officer and, if unresolved, to the DPB.",
      B: "Complete the 7-step process — it's inconvenient but not illegal.",
      C: "Simply delete the app and stop using the bank's digital services.",
      D: "Accept that large banks have complex systems — privacy isn't worth the hassle.",
    },
    explanation:
      "DPDP §6(4): the procedure to withdraw consent must be as easy as the procedure to give consent. Friction-by-design is itself a violation.",
    dpoHint:
      "DPDP §6(4) — withdrawal must be as easy as giving consent. Escalate the friction.",
  }),
];

export const getScenariosForRole = (role: Role): Scenario[] =>
  SCENARIOS.filter((s) => s.role === role);

export const getScenariosForRoleAndLevel = (role: Role, level: 1 | 2 | 3): Scenario[] =>
  SCENARIOS.filter((s) => s.role === role && s.level === level);

export const getScenarioQueueForRole = (role: Role): Scenario[] => {
  // Ordered by level then scenarioNumber
  return [...SCENARIOS]
    .filter((s) => s.role === role)
    .sort((a, b) => a.level - b.level || a.scenarioNumber - b.scenarioNumber);
};
