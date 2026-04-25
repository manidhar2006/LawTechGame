/**
 * Level-2: Banking & Insurance Sector — DPDP Compliance Cards
 *
 * Cards are organised by the 23 DPDP Rules (same principle structure as Level-1),
 * but every scenario is contextualised to Banking or Insurance sector operations.
 *
 * Sectors:
 *   Banking   — B-prefixed IDs
 *   Insurance — I-prefixed IDs
 *   Cross     — X-prefixed IDs (bancassurance, SDF, cross-sector obligations)
 *
 * Each card maps to one of the 23 DPDP Rules via the `section` field.
 */

export type Level2Choice = "A" | "B" | "C" | "D";

export interface Level2Card {
  id: string;
  title: string;
  section: string;   // "Rule 1" … "Rule 23" — mirrors Level-1 structure
  sector: string;    // "Banking" | "Insurance" | "Cross-Sector"
  summary: string;
  question: string;
  choices: Record<Level2Choice, string>;
  correctChoice: Level2Choice;
  explanation: string;
}

export function getLevel2CardById(id: string | null | undefined): Level2Card | undefined {
  if (!id) return undefined;
  return LEVEL2_BANKING_INSURANCE_CARDS.find((c) => c.id === id);
}

export const LEVEL2_BANKING_INSURANCE_CARDS: Level2Card[] = [

  // ═══════════════════════════════════════════════════════════
  // RULE 1 — Short Title & Commencement
  // ═══════════════════════════════════════════════════════════

  {
    id: "B101",
    title: "Bank Compliance Deadline — Rule 3 & 6 Enforcement",
    section: "Rule 1",
    sector: "Banking",
    summary: "Rule 1(4) places the substantive data protection obligations (Rules 3, 6, 7) under the 18-month commencement window — May 2027.",
    question: "A bank's compliance team argues that DPDP Rule 6 security safeguards are not yet mandatory because they were published in November 2025. Their internal deadline is set for May 2027. Are they right?",
    choices: {
      A: "No, Rule 6 became effective immediately upon Gazette publication",
      B: "Yes, Rule 1(4) places Rule 6 in the 18-month commencement category, enforceable from May 2027",
      C: "Yes, but only for public sector banks",
      D: "No, RBI rules override the DPDP commencement schedule",
    },
    correctChoice: "B",
    explanation: "Rule 1(4) groups substantive obligations including Rule 6 (Security Safeguards) and Rule 7 (Breach Notification) under the 18-month commencement window. The bank's May 2027 deadline is correct.",
  },
  {
    id: "I101",
    title: "Insurer Consent Manager Deadline",
    section: "Rule 1",
    sector: "Insurance",
    summary: "Rule 4 (Consent Managers) comes into force one year after publication per Rule 1(3), not immediately.",
    question: "An insurer wants to integrate an external Consent Manager to manage policyholder consents for health data. The Consent Manager was registered 6 months after the DPDP Rules were published. Can it legally operate?",
    choices: {
      A: "Yes, because it is already registered",
      B: "No, Rule 4 does not come into force until one year after publication per Rule 1(3)",
      C: "Yes, but only for existing policyholders",
      D: "No, IRDAI approval is required first",
    },
    correctChoice: "B",
    explanation: "Rule 1(3) specifically defers Rule 4 (Consent Managers) by one year from gazette publication. A Consent Manager registered before that anniversary cannot legally operate until the rule is in force.",
  },

  // ═══════════════════════════════════════════════════════════
  // RULE 2 — Definitions
  // ═══════════════════════════════════════════════════════════

  {
    id: "B201",
    title: "Banking App — 'User Account' Definition",
    section: "Rule 2",
    sector: "Banking",
    summary: "Rule 2(1)(c) defines 'user account' to include online accounts, email IDs, mobile numbers, profiles, pages, handles, and other identifiers.",
    question: "A bank's legal team debates whether a customer's mobile UPI ID (registered for BHIM) qualifies as a 'user account' for DPDP rights purposes. Which answer is correct?",
    choices: {
      A: "No, UPI IDs are payment instruments, not user accounts",
      B: "Yes, Rule 2(1)(c) includes mobile numbers and online account identifiers, covering UPI IDs",
      C: "Only if the customer has also registered an internet banking account",
      D: "Only IRDAI-regulated accounts qualify",
    },
    correctChoice: "B",
    explanation: "Rule 2(1)(c) defines 'user account' broadly to include mobile numbers and all online identifiers. A UPI ID linked to a mobile number qualifies, enabling Data Principals to exercise rights over it.",
  },
  {
    id: "I201",
    title: "Insurance — Verifiable Consent for Minor Policyholder",
    section: "Rule 2",
    sector: "Insurance",
    summary: "Rule 2(1)(d) defines 'verifiable consent' as consent obtained by the mechanisms specified in Rule 10 (children) or Rule 11 (persons with disabilities).",
    question: "A parent purchases a life insurance policy naming their 12-year-old as nominee and beneficiary. The insurer collects the child's biometric data. Under Rule 2(1)(d), what type of consent is required?",
    choices: {
      A: "Standard digital consent from the child directly",
      B: "Verifiable consent as specified in Rule 10, requiring the parent's or guardian's consent",
      C: "Verbal consent from the parent over a recorded call",
      D: "No consent is needed for nominees",
    },
    correctChoice: "B",
    explanation: "Rule 2(1)(d) defines 'verifiable consent' by cross-reference to Rule 10 (children) and Rule 11 (persons with disabilities). For a 12-year-old, Rule 10 mechanisms must be used — i.e., verifiable parental/guardian consent.",
  },
  {
    id: "X201",
    title: "Bancassurance — Undefined Terms Fall-back",
    section: "Rule 2",
    sector: "Cross-Sector",
    summary: "Rule 2(2) directs that terms used in the Rules but not defined therein shall carry the meaning assigned in the DPDP Act 2023.",
    question: "A bancassurance platform uses the term 'Data Processor' in its contracts with cloud vendors. The Rules don't re-define it. Where must the platform look for the authoritative definition?",
    choices: {
      A: "The IT Act 2000",
      B: "Industry-standard GDPR definitions",
      C: "The Digital Personal Data Protection Act 2023 — per Rule 2(2)",
      D: "The RBI's Master Directions on IT",
    },
    correctChoice: "C",
    explanation: "Rule 2(2) mandates that terms undefined in the Rules carry meanings from the DPDP Act 2023. 'Data Processor' is defined in Section 2(k) of the Act as the entity that processes data on behalf of the Fiduciary.",
  },

  // ═══════════════════════════════════════════════════════════
  // RULE 3 — Notice
  // ═══════════════════════════════════════════════════════════

  {
    id: "B301",
    title: "Bank KYC Notice — Standalone Requirement",
    section: "Rule 3",
    sector: "Banking",
    summary: "Rule 3(a) requires notices to be presented independently of other information — standalone and not buried in T&Cs.",
    question: "A bank embeds its data collection notice inside a 47-page account opening booklet under Section 12, Sub-clause (c). Is this compliant with Rule 3?",
    choices: {
      A: "Yes, if the section is clearly labeled 'Data Notice'",
      B: "No, Rule 3(a) requires the notice to be presented independently of any other information provided by the fiduciary",
      C: "Yes, as long as the customer initials the page",
      D: "Yes, RBI account opening forms override DPDP notice requirements",
    },
    correctChoice: "B",
    explanation: "Rule 3(a) requires the notice to be 'independent of any other information provided by the Data Fiduciary.' Embedding it in a 47-page booklet violates this standalone requirement — it is an illusory consent mechanism.",
  },
  {
    id: "B302",
    title: "Bank Loan App — Itemized Data Description",
    section: "Rule 3",
    sector: "Banking",
    summary: "Rule 3(b) requires an itemized description of personal data and the specific purpose of processing each category.",
    question: "A digital lending app's privacy notice states: 'We collect personal data to process your loan.' Under Rule 3(b), is this notice sufficient?",
    choices: {
      A: "Yes, the purpose of loan processing is clearly stated",
      B: "No, the notice must itemize each specific category of data (name, income, credit score, etc.) and state the specific purpose of each",
      C: "Yes, if the app has fewer than 5,000 users",
      D: "Yes, as long as it is available in English",
    },
    correctChoice: "B",
    explanation: "Rule 3(b) mandates an 'itemized description' — a granular list of each data category and its specific purpose. A generic 'personal data for loan processing' statement fails the granularity test.",
  },
  {
    id: "B303",
    title: "Banking App — Opt-Out Parity Requirement",
    section: "Rule 3",
    sector: "Banking",
    summary: "Rule 3(c)(i) mandates that withdrawing consent must be as easy as giving it.",
    question: "A bank's mobile app offers a one-tap 'Accept All' button for marketing consent at onboarding, but requires branch visit for withdrawal. Which rule does this violate?",
    choices: {
      A: "Rule 6 — Security safeguards",
      B: "Rule 3(c)(i) — Withdrawal of consent must be comparable in ease to giving consent",
      C: "Rule 8 — Data erasure",
      D: "Rule 14 — Right to correction",
    },
    correctChoice: "B",
    explanation: "Rule 3(c)(i) specifically mandates that the mechanism to withdraw consent must be comparable in ease to giving consent. A one-tap opt-in paired with a branch-visit opt-out is a direct violation.",
  },
  {
    id: "I301",
    title: "Health Insurance — Medical History Notice Language",
    section: "Rule 3",
    sector: "Insurance",
    summary: "Rule 3(b) requires notices in clear and plain language, available in English or any Eighth Schedule language.",
    question: "An insurer's health data consent form is written entirely in technical actuarial and legal terminology that policyholders cannot reasonably understand. What does Rule 3 require?",
    choices: {
      A: "The form is valid as long as a lawyer has approved it",
      B: "The notice must use clear and plain language so that a reasonable person can understand the nature and purpose of data collection",
      C: "Only a certified translation is required",
      D: "Technical language is acceptable for health data as it requires precision",
    },
    correctChoice: "B",
    explanation: "Rule 3(b) explicitly requires 'clear and plain language' in the notice. Actuarial or legal jargon that the average policyholder cannot understand violates this requirement, rendering the resulting consent invalid.",
  },
  {
    id: "I302",
    title: "Insurance Renewal — Retrospective Notice Obligation",
    section: "Rule 3",
    sector: "Insurance",
    summary: "For data collected before the DPDP Act's commencement, Section 5(2) requires notice to be given as soon as practicable.",
    question: "An insurer has policyholder data collected over 15 years before the DPDP Act commenced. Upon commencement, must the insurer notify these existing policyholders?",
    choices: {
      A: "No, pre-existing data is grandfathered and exempt forever",
      B: "Yes, Section 5(2) requires the insurer to provide a notice to existing data principals as soon as practicable upon commencement",
      C: "Only for policies exceeding ₹1 Crore sum assured",
      D: "Only if the insurer is an SDF",
    },
    correctChoice: "B",
    explanation: "Section 5(2) of the DPDP Act, operative through Rule 3, requires fiduciaries with pre-existing data to provide a retrospective notice to Data Principals upon commencement. There is no exemption based on policy age.",
  },
  {
    id: "X301",
    title: "Bancassurance — Rights Exercise Link in Notice",
    section: "Rule 3",
    sector: "Cross-Sector",
    summary: "Rule 3(c)(ii) requires the notice to include a communication link through which the Data Principal can exercise their rights under the Act.",
    question: "A bank distributing insurance products provides a consent notice for shared customer data but omits any link or method for customers to exercise their DPDP rights. Which rule is violated?",
    choices: {
      A: "Rule 6 — Security",
      B: "Rule 3(c)(ii) — The notice must include a communication link for exercising rights under the Act",
      C: "Rule 9 — Grievances",
      D: "Rule 15 — Cross-border transfers",
    },
    correctChoice: "B",
    explanation: "Rule 3(c)(ii) mandates that every consent notice include a communication link (URL/contact) through which Data Principals can exercise their rights under the DPDP Act, including access, correction, and erasure.",
  },

  // ═══════════════════════════════════════════════════════════
  // RULE 4 — Consent Managers
  // ═══════════════════════════════════════════════════════════

  {
    id: "B401",
    title: "Banking — Consent Manager Registration Eligibility",
    section: "Rule 4",
    sector: "Banking",
    summary: "Consent Managers must be companies incorporated in India with a minimum net worth of ₹2 Crore, registered with the Data Protection Board.",
    question: "A Singapore-based fintech wants to manage UPI and savings account consents for Indian banking customers as a Consent Manager. Can it apply directly?",
    choices: {
      A: "Yes, any APAC company may register",
      B: "No, Part A Item 1 of the First Schedule requires the applicant to be a company incorporated in India",
      C: "Yes, if it has an Indian branch office",
      D: "Yes, with RBI's prior approval only",
    },
    correctChoice: "B",
    explanation: "Item 1 of Part A of the First Schedule (Rule 4) requires the applicant to be incorporated in India. A Singapore company cannot directly register; it must first set up and incorporate an Indian subsidiary.",
  },
  {
    id: "B402",
    title: "Banking — Consent Manager Net Worth Floor",
    section: "Rule 4",
    sector: "Banking",
    summary: "Part A, Item 4 of the First Schedule sets the minimum net worth for Consent Manager registration at ₹2 Crore.",
    question: "A fintech startup with a net worth of ₹85 Lakh applies to the Data Protection Board to become a Consent Manager for a bank's customers. What will the Board decide?",
    choices: {
      A: "Approve — startups have special waivers",
      B: "Reject — the applicant must meet the ₹2 Crore minimum net worth under Part A, Item 4 of the First Schedule",
      C: "Approve on probation for one year",
      D: "Defer to RBI for a banking sector exception",
    },
    correctChoice: "B",
    explanation: "Part A, Item 4 of the First Schedule mandates a minimum audited net worth of two crore rupees. An ₹85 Lakh net worth falls well below this threshold, making the application ineligible.",
  },
  {
    id: "I401",
    title: "Insurance — Consent Manager Record Retention",
    section: "Rule 4",
    sector: "Insurance",
    summary: "Part B, Item 4(c) requires Consent Managers to maintain records of consent and withdrawal for at least 7 years.",
    question: "A Consent Manager deletes a policyholder's consent transaction history 3 years after the policy matures, citing storage costs. How does this violate Rule 4?",
    choices: {
      A: "It doesn't — 3 years is standard industry retention",
      B: "It violates Part B, Item 4(c) which requires consent records to be maintained for at least 7 years",
      C: "It violates Rule 8 — data erasure requirements",
      D: "It is acceptable if the policyholder consented to the deletion",
    },
    correctChoice: "B",
    explanation: "Part B, Item 4(c) of the First Schedule mandates that Consent Managers retain records of consent and withdrawal for a minimum of seven years. Deleting after 3 years is a non-compliance regardless of storage cost pressures.",
  },
  {
    id: "I402",
    title: "Insurance — Consent Manager Conflict of Interest",
    section: "Rule 4",
    sector: "Insurance",
    summary: "Part B, Items 9 and 10 of the First Schedule prohibit Consent Managers from having conflict of interest with Data Fiduciaries.",
    question: "An insurance aggregator operates as both a Consent Manager for policyholders AND simultaneously holds equity in three insurance companies whose products it sells. Is this a DPDP violation?",
    choices: {
      A: "No, integrated business models are common in insurance",
      B: "Yes, Part B Items 9 and 10 of the First Schedule prohibit Consent Managers from having financial or commercial relationships that create conflicts of interest with Data Fiduciaries",
      C: "No, as long as it is disclosed to customers",
      D: "Only if the equity stake exceeds 51%",
    },
    correctChoice: "B",
    explanation: "Items 9 and 10 of Part B of the First Schedule specifically prohibit Consent Managers from having conflicts of interest with Data Fiduciaries, including equity relationships with insurers whose data they manage on behalf of policyholders.",
  },
  {
    id: "X401",
    title: "Bancassurance — Consent Manager Sub-contracting Ban",
    section: "Rule 4",
    sector: "Cross-Sector",
    summary: "Part B, Item 6 of the First Schedule prohibits Consent Managers from sub-contracting or assigning their performance obligations.",
    question: "A Consent Manager registered for banking customers wants to outsource its core consent-tracking dashboard to a third-party SaaS vendor in Bengaluru. Is this permissible?",
    choices: {
      A: "Yes, outsourcing technology operations is standard",
      B: "No, Part B Item 6 of the First Schedule prohibits sub-contracting or assignment of a Consent Manager's core obligations",
      C: "Yes, if the vendor is also registered with the Board",
      D: "Yes, with RBI's permission",
    },
    correctChoice: "B",
    explanation: "Part B, Item 6 explicitly prohibits Consent Managers from sub-contracting or assigning their performance obligations to any other entity. The CM must perform its fiduciary functions directly, not through vendors.",
  },
  {
    id: "X402",
    title: "Cross-Sector — Consent Manager Machine-Readable Records",
    section: "Rule 4",
    sector: "Cross-Sector",
    summary: "Part B, Item 4(b) requires Consent Managers to provide records in machine-readable form to Data Principals upon request.",
    question: "A customer requests their complete consent history from a Consent Manager serving both their bank and insurance provider. In what format must this be provided?",
    choices: {
      A: "PDF printout by mail within 30 days",
      B: "Machine-readable form (e.g., JSON/CSV) as required by Part B, Item 4(b) of the First Schedule",
      C: "Verbal summary over a phone call",
      D: "In whatever format is most convenient for the CM",
    },
    correctChoice: "B",
    explanation: "Part B, Item 4(b) of the First Schedule mandates that Consent Managers provide consent records in machine-readable form to the Data Principal upon request, enabling portability and independent verification.",
  },

  // ═══════════════════════════════════════════════════════════
  // RULE 5 — State Processing Standards (Second Schedule)
  // ═══════════════════════════════════════════════════════════

  {
    id: "B501",
    title: "Public Sector Bank — Second Schedule Standards",
    section: "Rule 5",
    sector: "Banking",
    summary: "Rule 5 mandates Second Schedule standards (data minimization, accuracy, retention limits, intimation) for state entities processing personal data for subsidies and services.",
    question: "A public sector bank processes customer data to disburse government Jan Dhan scheme benefits using Consolidated Fund resources. Which schedule of the DPDP Rules must it follow?",
    choices: {
      A: "First Schedule — Consent Manager norms",
      B: "Second Schedule — Standards for state processing of personal data per Rule 5(1)",
      C: "Third Schedule — Breach notification timelines",
      D: "Seventh Schedule — Government information calls",
    },
    correctChoice: "B",
    explanation: "Rule 5(1) mandates Second Schedule standards specifically for processing of personal data for delivery of subsidies, benefits, or services using public funds from the Consolidated Fund. Public sector bank disbursement of Jan Dhan benefits falls squarely within this.",
  },
  {
    id: "I501",
    title: "Government Health Insurance — Data Accuracy Obligation",
    section: "Rule 5",
    sector: "Insurance",
    summary: "Item (d) of the Second Schedule requires 'reasonable efforts' to ensure personal data is complete and accurate.",
    question: "A state government insurer running a PM Ayushman Bharat scheme has stale beneficiary health records causing claim rejections. Under Rule 5, what obligation applies?",
    choices: {
      A: "No obligation — the state is exempt from accuracy norms",
      B: "The insurer must make reasonable efforts to keep data complete, up-to-date, and accurate per Item (d) of the Second Schedule",
      C: "Only if the error exceeds 10% of records",
      D: "Accuracy is a best practice, not mandatory under Rule 5",
    },
    correctChoice: "B",
    explanation: "Item (d) of the Second Schedule under Rule 5 imposes a mandatory 'reasonable efforts' obligation to ensure data completeness and accuracy. This applies to government health insurance schemes using public funds.",
  },
  {
    id: "B502",
    title: "Bank Subsidy Processing — Accountability Designation",
    section: "Rule 5",
    sector: "Banking",
    summary: "Item (h) of the Second Schedule makes the 'person determining the purpose and means of processing' individually accountable for effective observance of Second Schedule standards.",
    question: "A district collector's office uses a public sector bank's branch network to process MGNREGA wage data. Under Rule 5's Second Schedule, who is accountable for data protection standards?",
    choices: {
      A: "The bank branch manager",
      B: "The person who determined the purpose and means of processing — the district collector's office",
      C: "The Data Protection Board officer in the district",
      D: "Equally shared between the bank and the collector's office",
    },
    correctChoice: "B",
    explanation: "Item (h) of the Second Schedule places individual accountability on the 'person who determines the purpose and means of processing.' In this case, the district collector's office determining MGNREGA disbursement is the accountable party.",
  },

  // ═══════════════════════════════════════════════════════════
  // RULE 6 — Security Safeguards
  // ═══════════════════════════════════════════════════════════

  {
    id: "B601",
    title: "Bank Core Banking — Encryption Mandate",
    section: "Rule 6",
    sector: "Banking",
    summary: "Rule 6(1)(a) requires encryption, obfuscation, or masking of personal data as a mandatory security safeguard.",
    question: "A co-operative bank stores customer account numbers and IFSC codes in plain text in a shared Excel sheet on a common server drive. What is the maximum DPDP penalty for this failure?",
    choices: {
      A: "₹50 Crore",
      B: "₹150 Crore",
      C: "₹200 Crore",
      D: "₹250 Crore",
    },
    correctChoice: "D",
    explanation: "Rule 6(1)(a) mandates encryption, obfuscation, or masking as mandatory safeguards. The Schedule to the DPDP Act (Item 1) sets the maximum penalty for failing to implement reasonable security safeguards at ₹250 Crore.",
  },
  {
    id: "B602",
    title: "Bank — Access Log Retention for Forensic Audit",
    section: "Rule 6",
    sector: "Banking",
    summary: "Rule 6(1)(e) mandates that access logs and traffic data be retained for at least one year to support breach investigations.",
    question: "Following an insider trading case, a bank's forensic team needs system access logs from 14 months ago. The bank's IT team erased them after 90 days. Which specific DPDP requirement was violated?",
    choices: {
      A: "Rule 7 — Breach notification",
      B: "Rule 6(1)(e) — Access logs must be retained for at least one year",
      C: "Rule 8 — Data erasure",
      D: "Rule 14 — Right to correction",
    },
    correctChoice: "B",
    explanation: "Rule 6(1)(e) explicitly sets a mandatory one-year minimum retention for access logs and traffic data. Erasing after 90 days violates this floor, potentially frustrating investigations.",
  },
  {
    id: "B603",
    title: "Bank Cloud Vendor — Fiduciary Liability for Processor",
    section: "Rule 6",
    sector: "Banking",
    summary: "Rule 6(1)(f) and Section 8(1) make the Data Fiduciary responsible for security safeguards implemented by its Data Processors.",
    question: "A private bank's AWS cloud vendor is hacked, exposing 3 lakh customer records. The bank argues it is the vendor's fault. Is the bank relieved of DPDP liability?",
    choices: {
      A: "Yes, the cloud vendor is solely liable as the Data Processor",
      B: "No, Rule 6(1)(f) and Section 8(1) make the Data Fiduciary bank responsible for ensuring its processors implement adequate security safeguards",
      C: "Liability is shared 50-50 per industry custom",
      D: "Yes, if the vendor's SLA includes an indemnity clause",
    },
    correctChoice: "B",
    explanation: "Rule 6(1)(f) and Section 8(1) of the Act place the burden on the Data Fiduciary to ensure processors maintain equivalent safeguards. The bank remains primaryresponsible party to the Board regardless of vendor contracts.",
  },
  {
    id: "I601",
    title: "Insurance — Visibility and Monitoring Controls",
    section: "Rule 6",
    sector: "Insurance",
    summary: "Rule 6(1)(c) requires 'visibility' — logs, monitoring, and review mechanisms to detect and prevent unauthorized data access.",
    question: "An insurer's health claims processing system has no access logs or monitoring — any employee can view any policyholder's medical history without any trail. Which Rule 6 obligation is violated?",
    choices: {
      A: "Rule 6(1)(a) — Encryption requirement only",
      B: "Rule 6(1)(c) — Visibility through logs and monitoring to detect unauthorized access",
      C: "Rule 6(1)(d) — Data backup obligation",
      D: "Rule 6(1)(f) — Processor security check",
    },
    correctChoice: "B",
    explanation: "Rule 6(1)(c) requires 'visibility and transparency' through access logs, monitoring, and auditing to detect and prevent unauthorized access. An absence of any access trail for sensitive medical data is a clear violation.",
  },
  {
    id: "I602",
    title: "Insurance — Business Continuity and Backup",
    section: "Rule 6",
    sector: "Insurance",
    summary: "Rule 6(1)(d) requires measures for continued processing such as data backups to prevent data loss from integrity failures.",
    question: "A general insurer's policy management system is hit by ransomware, and 5 years of policyholder data is encrypted by hackers. The insurer had no offsite backups. Which Rule 6 element was violated?",
    choices: {
      A: "Rule 6(1)(a) — Encryption of outgoing data",
      B: "Rule 6(1)(d) — Measures for continued processing, including data backups for business continuity",
      C: "Rule 6(1)(e) — Log retention",
      D: "Rule 7 — Breach notification only",
    },
    correctChoice: "B",
    explanation: "Rule 6(1)(d) mandates 'measures for continued processing' including data backups as a core security safeguard. Absence of backups enabling complete data loss from ransomware is a direct violation of this requirement.",
  },

  // ═══════════════════════════════════════════════════════════
  // RULE 7 — Breach Notification
  // ═══════════════════════════════════════════════════════════

  {
    id: "B701",
    title: "Bank Breach — Board Notification Sequence",
    section: "Rule 7",
    sector: "Banking",
    summary: "Rule 7(2) requires an initial breach intimation to the Board 'without delay,' followed by a detailed report within 72 hours.",
    question: "A bank discovers on Monday morning that 5 lakh customer records were compromised in a cyberattack over the weekend. What is the correct sequence of actions under Rule 7?",
    choices: {
      A: "Notify RBI first, then Data Protection Board within 30 days",
      B: "Notify the Data Protection Board with an initial intimation without delay, followed by a detailed report within 72 hours; simultaneously notify affected customers",
      C: "Complete internal investigation first, then notify the Board",
      D: "File a police FIR and let law enforcement notify the Board",
    },
    correctChoice: "B",
    explanation: "Rule 7(2) mandates an initial intimation to the Board 'without delay' upon discovering a breach, and a detailed report within 72 hours. Rule 7(1) simultaneously requires notifying affected Data Principals. The sequencing matters: Board first, then details within 72 hours.",
  },
  {
    id: "B702",
    title: "Bank ATM Skimming — Customer Breach Notification Content",
    section: "Rule 7",
    sector: "Banking",
    summary: "Rule 7(1) requires breach notifications to customers to include the breach description, consequences, mitigation steps, and specific safety measures.",
    question: "500 customers' debit card data was skimmed at ATMs. The bank sends a text: 'A security incident occurred. Please contact your branch.' Is this Rule 7 compliant?",
    choices: {
      A: "Yes, the bank has fulfilled the notification requirement",
      B: "No, the notification must include a description of the breach, its likely consequences, measures being taken, and specific safety steps the customer should take (e.g., block card, change PIN)",
      C: "Yes, brevity is recommended to avoid panic",
      D: "Yes, as long as the notification was sent within 24 hours",
    },
    correctChoice: "B",
    explanation: "Rule 7(1) requires the customer notification to contain specific elements: description of the breach, its consequences, mitigation measures taken by the fiduciary, and specific safety steps the Principal can take. A vague 'contact your branch' message fails all these requirements.",
  },
  {
    id: "I701",
    title: "Health Insurer Breach — Medical Records Exposure",
    section: "Rule 7",
    sector: "Insurance",
    summary: "Rule 7 and Section 8(6) require breach notification to both the Board and affected Data Principals for all personal data breaches.",
    question: "A health insurer discovers a misconfigured database exposed 80,000 policyholders' medical histories publicly for 5 days. The CISO says it is an 'internal error' and opts not to notify the Board. Is this correct?",
    choices: {
      A: "Yes, internal errors are excluded from breach notification requirements",
      B: "No, any personal data breach — regardless of cause — triggers Rule 7 notification obligations to both the Board and affected policyholders",
      C: "Only if the breach was caused by an external attack",
      D: "Only if more than 1 lakh records are affected",
    },
    correctChoice: "B",
    explanation: "Rule 7 and Section 8(6) impose notification obligations for all personal data breaches without distinction between external attacks and internal misconfigurations. A misconfigured database exposing medical data is a breach requiring full notification.",
  },
  {
    id: "I702",
    title: "Insurance — Breach Hiding as Aggravating Factor",
    section: "Rule 7",
    sector: "Insurance",
    summary: "Concealing a breach or delaying notification can be treated as an aggravating factor by the Board when assessing penalties.",
    question: "A life insurer discovers a breach in January but delays notifying the Board until April, fearing reputational damage. When the Board investigates, how does this delay affect penalty determination?",
    choices: {
      A: "The delay has no effect on the penalty quantum",
      B: "The delay can be treated as an aggravating factor by the Board, potentially increasing the penalty beyond the base amount for the breach",
      C: "The penalty is capped if the breach is self-reported",
      D: "Only the IRDAI can penalize for delayed notification",
    },
    correctChoice: "B",
    explanation: "Section 33(3) of the DPDP Act lists aggravating factors in penalty computation, including deliberate concealment or delayed reporting. The Board can use the 3-month delay to impose a higher penalty than the base breach notification violation.",
  },

  // ═══════════════════════════════════════════════════════════
  // RULE 8 — Data Erasure
  // ═══════════════════════════════════════════════════════════

  {
    id: "B801",
    title: "Bank — Account Closure and Erasure vs. RBI Retention",
    section: "Rule 8",
    sector: "Banking",
    summary: "Rule 8 allows retention beyond the general DPDP erasure timeline if required by applicable law — such as RBI's KYC record retention mandates.",
    question: "A customer closes their NRI bank account and demands immediate deletion of all data. RBI mandates 10-year KYC retention. What should the bank do?",
    choices: {
      A: "Delete all data immediately to comply with DPDP",
      B: "Retain KYC records for the RBI-mandated 10-year period — statutory retention overrides the DPDP general erasure timeline under Rule 8",
      C: "Retain forever since it is an NRI account",
      D: "Seek a court order before deciding",
    },
    correctChoice: "B",
    explanation: "Rule 8 permits retention beyond the general purpose-served erasure timeline when 'necessary for compliance with any law for the time being in force.' RBI's KYC retention mandate is such a law and prevails.",
  },
  {
    id: "B802",
    title: "Bank — 48-Hour Erasure Warning for Inactive Accounts",
    section: "Rule 8",
    sector: "Banking",
    summary: "Rule 8(2) requires fiduciaries to give Data Principals at least 48 hours' notice before erasing data due to prolonged inactivity.",
    question: "A bank's automated system deletes data of savings account holders who haven't transacted in 3 years, with no prior warning. What Rule 8 obligation was missed?",
    choices: {
      A: "None — the bank can delete inactive data at any time",
      B: "Rule 8(2) requires the bank to notify account holders at least 48 hours before erasing their data due to inactivity",
      C: "The bank must wait 7 years before deleting inactive accounts",
      D: "The bank must obtain a fresh consent before deletion",
    },
    correctChoice: "B",
    explanation: "Rule 8(2) mandates a minimum 48-hour prior notification to the Data Principal before their data is erased due to inactivity. This gives them an opportunity to log in and reactivate, resetting the retention clock.",
  },
  {
    id: "I801",
    title: "Insurance — Lapsed Policy Data Retention vs. IRDAI Norms",
    section: "Rule 8",
    sector: "Insurance",
    summary: "IRDAI regulations requiring retention of insurance policy records for specific periods can override the DPDP general erasure timeline under Rule 8.",
    question: "An insurer wants to apply the DPDP's general erasure rule and delete data of lapsed policyholders 3 years after lapse, but IRDAI mandates 10-year retention. Which rule prevails?",
    choices: {
      A: "DPDP always prevails — delete after 3 years",
      B: "IRDAI mandates prevail — Rule 8 explicitly allows retention when required by applicable law",
      C: "The shorter period (3 years) prevails to minimize data hoarding",
      D: "The insurer can choose either approach",
    },
    correctChoice: "B",
    explanation: "Rule 8's proviso allows data retention beyond the general erasure timeline when required by applicable law. IRDAI's policyholder record retention norms are 'applicable law' under this proviso, and they override DPDP's general 3-year erasure expectation.",
  },

  // ═══════════════════════════════════════════════════════════
  // RULE 9 — Grievance Redressal
  // ═══════════════════════════════════════════════════════════

  {
    id: "B901",
    title: "Bank — Grievance Officer Contact Publication",
    section: "Rule 9",
    sector: "Banking",
    summary: "Rule 9 requires fiduciaries to prominently publish contact details for data grievances on their website and app, and in every formal response to rights exercise.",
    question: "Under Rule 9, where must a bank publish the contact details of its data grievance officer?",
    choices: {
      A: "Only in the Annual Report",
      B: "Prominently on its website or app, and in every formal response to a Data Principal exercising DPDP rights",
      C: "Only on the RBI's website",
      D: "Only at the branch notice board",
    },
    correctChoice: "B",
    explanation: "Rule 9 mandates prominent publication on the fiduciary's website or app AND inclusion in every formal response to a communication from a Data Principal exercising their rights. This dual requirement ensures accessibility.",
  },
  {
    id: "I901",
    title: "Insurance — Grievance Resolution within 90 Days",
    section: "Rule 9",
    sector: "Insurance",
    summary: "Rule 14(3) (read with Rule 9) requires grievances to be resolved within 90 days — longer delays give the Board jurisdiction.",
    question: "A policyholder raises a data correction grievance with their insurer in January. The insurer has still not resolved it by April (90+ days). What recourse does the policyholder have?",
    choices: {
      A: "File a complaint with IRDAI only",
      B: "File a complaint with the Data Protection Board — Rule 14(3) requires grievances to be resolved within 90 days, after which Board jurisdiction attaches",
      C: "Wait 6 months for the insurer's internal process",
      D: "Approach a consumer forum only",
    },
    correctChoice: "B",
    explanation: "Rule 14(3) requires fiduciaries to implement a grievance redressal mechanism that resolves complaints within 90 days. After this period lapses without resolution, the Data Principal may complain directly to the Data Protection Board.",
  },

  // ═══════════════════════════════════════════════════════════
  // RULE 10 — Children's Data
  // ═══════════════════════════════════════════════════════════

  {
    id: "B1001",
    title: "Bank — Minor Savings Account Onboarding",
    section: "Rule 10",
    sector: "Banking",
    summary: "Rule 10(1) and Section 9(1) require verifiable parental/guardian consent before processing any personal data of a child (under 18).",
    question: "A bank digitally onboards a 16-year-old for a student savings account, obtaining only the student's own KYC consent. Is this DPDP-compliant?",
    choices: {
      A: "Yes, the student is old enough to consent at 16",
      B: "No, Rule 10(1) requires verifiable parental or guardian consent for any data processing of a child under 18, regardless of the child's willingness",
      C: "Yes, if the student has a valid Aadhaar card",
      D: "Only parental consent for minors under 13",
    },
    correctChoice: "B",
    explanation: "Rule 10(1) and Section 9(1) define 'child' as anyone under 18. The bank must obtain verifiable parental or legal guardian consent BEFORE processing any personal data of the 16-year-old, irrespective of the student's own willingness to consent.",
  },
  {
    id: "I1001",
    title: "Insurance — Child Policy Nominee Data Processing",
    section: "Rule 10",
    sector: "Insurance",
    summary: "Rule 10(1) requires verifiable parental consent for processing data of any person under 18, including when they are nominees or beneficiaries of insurance policies.",
    question: "A life insurer collects biometric and health data of a 14-year-old named as a beneficiary in a parent's policy for claim processing purposes. Whose consent is mandatory?",
    choices: {
      A: "The 14-year-old's own written consent",
      B: "The parent's or legal guardian's verifiable consent per Rule 10(1) since the beneficiary is under 18",
      C: "No consent needed for claim processing",
      D: "IRDAI's permission only",
    },
    correctChoice: "B",
    explanation: "Rule 10(1) mandates verifiable parental or guardian consent for processing any personal data of a child (under 18). A 14-year-old beneficiary's biometric data requires parental consent, even though the processing is for legitimate claim purposes.",
  },
  {
    id: "B1002",
    title: "Bank — No Tracking of Children's Data",
    section: "Rule 10",
    sector: "Banking",
    summary: "Section 9(3) prohibits tracking, behavioral monitoring, or targeted advertising directed at children.",
    question: "A bank's mobile app for minor accounts tracks the child's spending patterns to send targeted product recommendations. Does this violate the DPDP Act?",
    choices: {
      A: "No, spending data analytics is standard banking practice",
      B: "Yes, Section 9(3) prohibits tracking, behavioral monitoring, and targeted advertising directed at children",
      C: "No, if the parent consented to the app's terms",
      D: "Only if the minor is under 13",
    },
    correctChoice: "B",
    explanation: "Section 9(3) of the DPDP Act—reinforced by Rule 10—specifically prohibits tracking, behavioral monitoring, or targeted advertising directed at children. A bank app targeting minors with product recommendations violates this regardless of parental consent to general app usage.",
  },

  // ═══════════════════════════════════════════════════════════
  // RULE 11 — Persons with Disabilities
  // ═══════════════════════════════════════════════════════════

  {
    id: "I1101",
    title: "Insurance — Disability Claim and Guardian Consent",
    section: "Rule 11",
    sector: "Insurance",
    summary: "Rule 11(1) requires verifiable consent from a lawfully appointed guardian for persons with disability who cannot take legally binding decisions.",
    question: "An insurer processes a disability claim and collects medical/personal data for a policyholder declared mentally incapacitated by a court. Whose consent must be obtained?",
    choices: {
      A: "The incapacitated policyholder's own historical consent from when they signed the policy",
      B: "The lawfully appointed guardian (court-designated, or appointed under Disabilities Act 2016 / National Trust Act 1999) per Rule 11(1)",
      C: "Any competent adult family member",
      D: "No consent is needed for insurance claims",
    },
    correctChoice: "B",
    explanation: "Rule 11(1) requires verifiable consent from a lawful guardian appointed by a court, designated authority under the Rights of Persons with Disabilities Act 2016, or a local level committee under the National Trust Act 1999. The original policy-signing consent of an incapacitated person cannot substitute this.",
  },
  {
    id: "B1101",
    title: "Bank — Accessible Services for Differently-Abled Customers",
    section: "Rule 11",
    sector: "Banking",
    summary: "Rule 11 ensures that persons with disabilities who cannot take legally binding decisions are protected through guardian consent mechanisms.",
    question: "A visually impaired customer who has been legally declared unable to manage their own affairs wants to operate their bank account. Under Rule 11, what does the bank require?",
    choices: {
      A: "Only a doctor's certificate",
      B: "A lawfully designated guardian to give verifiable consent for data processing on behalf of the customer",
      C: "The customer must close the account",
      D: "A power of attorney only",
    },
    correctChoice: "B",
    explanation: "Rule 11(1) establishes that for persons 'unable to take legally binding decisions' due to disability, a lawfully designated guardian must provide verifiable consent for any data processing. The bank must engage with the appointed guardian, not just a PoA holder.",
  },

  // ═══════════════════════════════════════════════════════════
  // RULE 12 — Additional Obligations for Data Fiduciaries
  // ═══════════════════════════════════════════════════════════

  {
    id: "B1201",
    title: "Bank — Privacy by Design Obligation",
    section: "Rule 12",
    sector: "Banking",
    summary: "Rule 12 and Section 8 impose additional obligations on Data Fiduciaries to embed privacy by design, implement technical and organizational measures, and ensure data accuracy.",
    question: "A bank is redesigning its mobile app. Under DPDP's privacy-by-design principles (Rule 12/Section 8), when should privacy controls be integrated?",
    choices: {
      A: "After launch, based on user complaints",
      B: "From the design stage — privacy must be embedded by design and by default, not added as an afterthought",
      C: "Only for SDFs — small banks are exempt",
      D: "Privacy controls are purely technical, not design concerns",
    },
    correctChoice: "B",
    explanation: "Rule 12 and Section 8 require Data Fiduciaries to implement technical and organizational measures with privacy embedded from the design stage. Privacy by design means baking controls into architecture from inception, not retrofitting after launch.",
  },
  {
    id: "I1201",
    title: "Insurance — Accuracy of Claims Data",
    section: "Rule 12",
    sector: "Insurance",
    summary: "Section 8(6) and Rule 12 require fiduciaries to ensure personal data used for important decisions is accurate, complete, and up-to-date.",
    question: "An insurer denies a critical illness claim based on outdated medical records from 5 years ago. Under DPDP, which obligation was likely violated?",
    choices: {
      A: "No DPDP obligation — this is purely an IRDAI matter",
      B: "Section 8(6)/Rule 12 — Fiduciaries must ensure data used to make decisions affecting Data Principals is accurate, complete, and up-to-date",
      C: "Rule 6 — Security safeguards",
      D: "Rule 8 — Data erasure",
    },
    correctChoice: "B",
    explanation: "Section 8(6) imposes a specific accuracy obligation: data used for decision-making affecting individuals must be accurate, complete, and current. Using 5-year-old medical records to deny a claim without verifying current status violates this requirement.",
  },

  // ═══════════════════════════════════════════════════════════
  // RULE 13 — Significant Data Fiduciaries (SDFs)
  // ═══════════════════════════════════════════════════════════

  {
    id: "B1301",
    title: "Bank SDF — Annual DPIA Obligation",
    section: "Rule 13",
    sector: "Banking",
    summary: "Rule 13(1) mandates SDFs to conduct an annual Data Protection Impact Assessment (DPIA) every 12 months.",
    question: "A large private bank is designated as a Significant Data Fiduciary. How frequently must it conduct a Data Protection Impact Assessment?",
    choices: {
      A: "Every 6 months",
      B: "Every 12 months per Rule 13(1)",
      C: "Every 2 years",
      D: "Only upon a new data processing system launch",
    },
    correctChoice: "B",
    explanation: "Rule 13(1) mandates SDFs to undertake a DPIA 'once in every period of twelve months.' This annual cadence ensures systematic and ongoing review of data processing risks and compliance status.",
  },
  {
    id: "B1302",
    title: "Bank SDF — DPIA Auditor Reports to Board",
    section: "Rule 13",
    sector: "Banking",
    summary: "Rule 13(2) requires the DPIA auditor to furnish significant observations directly to the Data Protection Board.",
    question: "An independent auditor conducting an annual DPIA for an SDF bank finds critical AI model bias in loan decisions. Who must directly receive the auditor's significant observations?",
    choices: {
      A: "Only the bank's Board of Directors",
      B: "The Data Protection Board — Rule 13(2) requires significant DPIA observations to be reported to the Board directly",
      C: "The RBI Governor",
      D: "SEBI, since it involves financial products",
    },
    correctChoice: "B",
    explanation: "Rule 13(2) specifies that the person conducting the DPIA and audit must furnish significant observations directly to the Data Protection Board. This ensures the regulator has independent visibility of serious compliance risks identified in SDFs.",
  },
  {
    id: "B1303",
    title: "Bank SDF — AI Credit Model Algorithmic Due Diligence",
    section: "Rule 13",
    sector: "Banking",
    summary: "Rule 13(3) requires SDFs to verify their algorithms do not pose a risk to Data Principals' rights — a key safeguard against discriminatory AI.",
    question: "An SDF bank's AI algorithm systematically rejects loan applications from specific PIN codes populated by minority communities. Under Rule 13(3), what is the bank's obligation?",
    choices: {
      A: "No obligation — AI decisions are automated and not personal data processing",
      B: "Conduct algorithmic due diligence to verify the algorithm does not pose a risk to Data Principals' rights — a mandatory SDF obligation under Rule 13(3)",
      C: "Only the RBI can audit AI credit models",
      D: "Publish the algorithm's source code publicly",
    },
    correctChoice: "B",
    explanation: "Rule 13(3) requires SDFs to verify that their technical systems and algorithms do not 'pose a risk to the rights of Data Principals.' Systematic rejection based on demographics is exactly the risk this provision targets.",
  },
  {
    id: "B1304",
    title: "Bank SDF — DPO Based in India",
    section: "Rule 13",
    sector: "Banking",
    summary: "Section 10(2)(a)(ii) requires SDF Data Protection Officers to be based in India and responsible to the Board of Directors.",
    question: "A foreign bank notified as an SDF in India appoints a London-based Global Data Privacy Officer as its DPDP-mandated DPO. Is this compliant?",
    choices: {
      A: "Yes, a global DPO satisfies the requirement",
      B: "No, Section 10(2)(a)(ii) mandates the DPO to be 'based in India' and responsible to the Board of Directors",
      C: "Yes, if they travel to India quarterly",
      D: "Only if they are of Indian nationality",
    },
    correctChoice: "B",
    explanation: "Section 10(2)(a)(ii) unambiguously requires the DPO of an SDF to be 'based in India.' A London-based officer does not meet this requirement. The bank must appoint a separate India-based DPO for DPDP compliance.",
  },
  {
    id: "I1301",
    title: "Insurance SDF — Annual DPIA for Large Insurer",
    section: "Rule 13",
    sector: "Insurance",
    summary: "Rule 13 SDF obligations apply to insurers with large-scale data processing once notified as an SDF.",
    question: "A health insurance company with data on 6 crore policyholders is notified as an SDF. Under Rule 13(1), when must the first DPIA be completed?",
    choices: {
      A: "Within 3 months of SDF notification",
      B: "Within 12 months of SDF notification, and annually thereafter",
      C: "Immediately upon notification",
      D: "Every 2 years is sufficient for insurers",
    },
    correctChoice: "B",
    explanation: "Rule 13(1) requires SDFs to conduct a DPIA 'once in every period of twelve months.' The first DPIA must be completed within 12 months of notification, with annual repetitions thereafter.",
  },

  // ═══════════════════════════════════════════════════════════
  // RULE 14 — Rights of Data Principal
  // ═══════════════════════════════════════════════════════════

  {
    id: "B1401",
    title: "Bank — Right of Access to Credit History Data",
    section: "Rule 14",
    sector: "Banking",
    summary: "Section 11(1)(a) gives Data Principals the right to obtain a summary of their personal data processed and the identities of all Data Fiduciaries involved.",
    question: "A bank customer requests a complete summary of all personal data the bank holds on them, including data shared with CIBIL and credit aggregators. Under what DPDP right can they make this request?",
    choices: {
      A: "Right to Erasure under Section 12",
      B: "Right of Access under Section 11(1) — the right to a summary of personal data and identities of all fiduciaries with whom data was shared",
      C: "Right to Portability under Section 13",
      D: "Right to Nominate under Section 14",
    },
    correctChoice: "B",
    explanation: "Section 11(1)(a) grants the right to a summary of personal data processed. Section 11(1)(b) includes the right to know identities of all Data Fiduciaries with whom data was shared. A customer can use this to audit CIBIL data sharing.",
  },
  {
    id: "B1402",
    title: "Bank — Right to Correction of CIBIL Default",
    section: "Rule 14",
    sector: "Banking",
    summary: "Rule 14 implements the Data Principal's right to correction and completion of inaccurate or incomplete personal data under Section 12.",
    question: "A customer discovers their bank wrongly reported a loan default to CIBIL that was actually settled. Under the DPDP framework, within what timeframe must the bank resolve this grievance?",
    choices: {
      A: "30 days",
      B: "60 days",
      C: "90 days per Rule 14(3) — the maximum pipeline for grievance resolution",
      D: "180 days",
    },
    correctChoice: "C",
    explanation: "Rule 14(3) requires fiduciaries to implement a grievance redressal mechanism that resolves complaints within 90 days. A wrongly reported CIBIL default is a data accuracy issue under Section 12, and the 90-day limit applies.",
  },
  {
    id: "B1403",
    title: "Bank — Digital Nominee for Data Rights",
    section: "Rule 14",
    sector: "Banking",
    summary: "Section 14 and Rule 14(4) allow Data Principals to nominate persons to exercise their DPDP rights upon death or incapacity.",
    question: "A bank customer wants their son to be able to access and delete their banking data if they become incapacitated. What DPDP mechanism enables this?",
    choices: {
      A: "A standard bank power of attorney",
      B: "The Right to Nominate under Section 14/Rule 14(4) — the customer can nominate one or more persons to exercise DPDP rights upon death or incapacity",
      C: "A will covering digital assets",
      D: "This is not possible under DPDP",
    },
    correctChoice: "B",
    explanation: "Section 14 creates the Right to Nominate — a novel DPDP right allowing customers to pre-designate persons to exercise their data rights upon death or incapacity. This is separate from a PoA and specifically protects digital data inheritance.",
  },
  {
    id: "I1401",
    title: "Insurance — Right to Know Data Sharing Partners",
    section: "Rule 14",
    sector: "Insurance",
    summary: "Section 11(1)(b) gives policyholders the right to know identities of all entities with whom their claim data was shared.",
    question: "A policyholder suspects their medical claim data was shared with third parties. Under DPDP, what specific information can they demand from their insurer?",
    choices: {
      A: "Only the total amount of data stored",
      B: "A summary of personal data processed AND the identities of all Data Fiduciaries (agents, surveyors, reinsurers, doctors) with whom the data was shared — per Section 11(1)(b)",
      C: "Only the list of employees who accessed the data",
      D: "IRDAI handles all insurance data disclosures",
    },
    correctChoice: "B",
    explanation: "Section 11(1)(b) grants the right to know identities of all Data Fiduciaries with whom personal data was shared. The policyholder can demand the complete list of every entity — agents, surveyors, reinsurers, third-party administrators — who received their claim data.",
  },

  // ═══════════════════════════════════════════════════════════
  // RULE 15 — Cross-Border Data Transfers
  // ═══════════════════════════════════════════════════════════

  {
    id: "B1501",
    title: "Bank — Cross-Border Transfer Negative List Approach",
    section: "Rule 15",
    sector: "Banking",
    summary: "Rule 15 adopts a 'negative list' approach — transfers are permitted to all countries except those specifically restricted by the Central Government.",
    question: "A multinational bank transfers customer data to its Singapore data center. The Central Government has not issued any notification restricting Singapore. Is this transfer permissible?",
    choices: {
      A: "No, all cross-border transfers require prior government approval",
      B: "Yes, Rule 15 permits transfers to all countries except those specifically restricted by government notification — Singapore is not restricted",
      C: "Only with explicit RBI approval",
      D: "Only if the Singapore center meets GDPR standards",
    },
    correctChoice: "B",
    explanation: "Rule 15 adopts a permissive 'negative list' approach. Cross-border transfers are allowed to all destinations unless the Central Government has specifically restricted the country or entity by notification under Section 16(1). Absent a Singapore restriction, the transfer is lawful.",
  },
  {
    id: "B1502",
    title: "Bank — Transfer to Restricted Country Despite Customer Consent",
    section: "Rule 15",
    sector: "Banking",
    summary: "Section 16(1) government restrictions on cross-border transfers are binding regardless of individual customer consent.",
    question: "A bank has a customer who consents to their data being transferred to a country that the Central Government has specifically restricted under Section 16(1). Can the bank proceed?",
    choices: {
      A: "Yes, individual consent overrides government restrictions",
      B: "No, Section 16(1) government restrictions are binding on all fiduciaries regardless of individual consents obtained",
      C: "Yes, if the transfer is for the customer's own benefit",
      D: "Only if the RBI issues a special exemption",
    },
    correctChoice: "B",
    explanation: "Section 16(1) government notifications restricting specific countries bind ALL fiduciaries regardless of individual customer consent. Consent cannot contract out of a sovereign data sovereignty restriction — the restriction is absolute.",
  },
  {
    id: "I1501",
    title: "Insurance — Reinsurer Data Transfer Protocol",
    section: "Rule 15",
    sector: "Insurance",
    summary: "Insurers sharing policyholder data with foreign reinsurers must comply with Rule 15's cross-border transfer provisions.",
    question: "An Indian insurer routinely transfers policyholder health data to reinsurers in Switzerland and Germany. Both countries are not on any government restriction list. What is the position under Rule 15?",
    choices: {
      A: "Prohibited — all European transfers need GDPR equivalence",
      B: "Permitted — Rule 15's negative list approach allows transfers to Switzerland and Germany absent any government restriction",
      C: "Required to be approved by IRDAI for each instance",
      D: "Only permitted if the reinsurer signs a Standard Contractual Clause",
    },
    correctChoice: "B",
    explanation: "Rule 15's negative list approach permits transfers to all countries not specifically restricted. Switzerland and Germany, absent government restriction orders, are permitted destinations. Indian law does not require GDPR-equivalent adequacy, only government non-restriction.",
  },

  // ═══════════════════════════════════════════════════════════
  // RULE 16 — Exemptions (Research, Archives, Statistics)
  // ═══════════════════════════════════════════════════════════

  {
    id: "I1601",
    title: "Insurance — Research Exemption vs. Individual Decisions",
    section: "Rule 16",
    sector: "Insurance",
    summary: "Section 17(2)(b) permits use of personal data for research/statistics but prohibits using findings to make individualized decisions about specific Data Principals.",
    question: "An insurer uses anonymized aggregate claims data to publish a national health research report. A claims manager uses the report's findings to personally deny a specific policyholder's claim. What DPDP provision is violated?",
    choices: {
      A: "No violation — data was anonymized before the research",
      B: "Section 17(2)(b) — data processed under the research exemption must not be used to take decisions specific to an individual Data Principal",
      C: "Rule 6 — Security safeguards",
      D: "Rule 3 — Notice requirements",
    },
    correctChoice: "B",
    explanation: "Section 17(2)(b) mandates that data processed under the research/statistics exemption must never be used to 'take any measure or decision with respect to any specific Data Principal.' Using aggregate research to individually deny a claim violates this 'anonymity-of-outcome' principle.",
  },
  {
    id: "B1601",
    title: "Bank — Research Data Without Individualized Decisions",
    section: "Rule 16",
    sector: "Banking",
    summary: "The research exemption under Section 17(2) requires that output cannot be used for individualized decisions.",
    question: "A bank's research division uses aggregated, anonymized customer data to study credit default patterns. The study results are published in a journal. Is this exempted processing under Section 17?",
    choices: {
      A: "No, banking data can never be used for research",
      B: "Yes, Section 17(2)(a) exempts research and statistics processing, provided outputs are not used for individualized decisions about specific customers",
      C: "Only with each customer's specific research consent",
      D: "Only for academic institutions, not banks",
    },
    correctChoice: "B",
    explanation: "Section 17(2)(a) provides an exemption for processing for research, archiving, or statistical purposes in the public interest with appropriate safeguards. A bank's anonymized credit research published in a journal, with no individual outcomes derived, qualifies.",
  },

  // ═══════════════════════════════════════════════════════════
  // RULE 17 — Exempt Fiduciaries (Startups)
  // ═══════════════════════════════════════════════════════════

  {
    id: "B1701",
    title: "Fintech Startup — DPDP Startup Exemption",
    section: "Rule 17",
    sector: "Banking",
    summary: "Rule 17 empowers the Central Government to notify classes of Data Fiduciaries (e.g., startups) with reduced compliance obligations.",
    question: "A DPIIT-recognized fintech startup processes banking data for 8,000 customers. Can it claim any DPDP compliance relaxations?",
    choices: {
      A: "No, all data fiduciaries have identical obligations",
      B: "Yes, Rule 17 allows the Central Government to notify reduced obligations for classes of fiduciaries — DPIIT-recognized startups may benefit if notified",
      C: "Yes, all startups are automatically exempt from the DPDP Act",
      D: "Only if they have fewer than 100 employees",
    },
    correctChoice: "B",
    explanation: "Rule 17 empowers the Central Government to notify reduced or relaxed obligations for specific classes of Data Fiduciaries, including startups. DPIIT-recognized startups are a commonly cited beneficiary class, but they must await formal Central Government notification.",
  },
  {
    id: "B1702",
    title: "Startup Exemption Is Not Automatic",
    section: "Rule 17",
    sector: "Cross-Sector",
    summary: "Rule 17 only allows the Central Government to notify reduced obligations for notified classes of fiduciaries; startups are not automatically exempt.",
    question: "A bank-backed startup tells customers it is automatically exempt from every DPDP obligation because it is a startup. Is that correct?",
    choices: {
      A: "Yes, all startups are fully exempt from the DPDP Rules",
      B: "No, Rule 17 only allows the Central Government to notify reduced obligations for specified classes of Data Fiduciaries",
      C: "Yes, but only if the startup is incorporated in India",
      D: "Only if the startup uses a Consent Manager",
    },
    correctChoice: "B",
    explanation: "Rule 17 is an enabling provision. It lets the Central Government notify reduced obligations for classes of Data Fiduciaries, but it does not create an automatic blanket exemption for startups.",
  },

  // ═══════════════════════════════════════════════════════════
  // RULE 19 — Data Protection Board Proceedings
  // ═══════════════════════════════════════════════════════════

  {
    id: "B1901",
    title: "Bank — Board Inquiry Timeline",
    section: "Rule 19",
    sector: "Banking",
    summary: "Rule 19(9) mandates Board inquiries be completed within 6 months, extendable in 3-month increments with written reasons.",
    question: "The Data Protection Board starts an inquiry against a bank in March 2027 for DPDP violations. Under Rule 19(9), by when must the inquiry ordinarily be completed?",
    choices: {
      A: "By March 2028 (1 year)",
      B: "By September 2027 (6 months), extendable in 3-month increments with written reasons",
      C: "No fixed deadline — the Board proceeds at its discretion",
      D: "By March 2030 (3 years maximum)",
    },
    correctChoice: "B",
    explanation: "Rule 19(9) sets a 6-month completion deadline from the date of receipt of complaint, reference, or direction. Extensions beyond 6 months require recorded written reasons and are capped at 3-month increments.",
  },
  {
    id: "B1902",
    title: "Bank — Board Emergency Interim Order",
    section: "Rule 19",
    sector: "Banking",
    summary: "Rule 19(6) allows the Board Chairperson to take emergency interim action when a meeting cannot be convened, with 7-day ratification.",
    question: "Evidence surfaces that a bank is selling customer data in real time to a scammer network. The Board Chairperson cannot convene a meeting immediately. What emergency power exists under Rule 19(6)?",
    choices: {
      A: "The Chairperson must wait for a full Board meeting",
      B: "The Chairperson can issue an interim emergency order, record reasons, communicate to members within 7 days, and get it ratified at the next Board meeting",
      C: "Only the High Court can issue emergency orders",
      D: "The matter must be referred to the MeitY Secretary",
    },
    correctChoice: "B",
    explanation: "Rule 19(6) empowers the Chairperson to act unilaterally in emergencies when a meeting cannot be convened. The action must be documented, communicated to all members within 7 days, and subsequently ratified — a safeguard against both inaction and unchecked power.",
  },
  {
    id: "I1901",
    title: "Insurance — Board's Power to Inspect",
    section: "Rule 19",
    sector: "Insurance",
    summary: "Section 28(7)(c) grants the Board civil court powers to inspect documents, books of account, registers, and any other documents.",
    question: "The Data Protection Board requires an insurer's claim adjudication records as part of a breach investigation. The insurer refuses, citing attorney-client privilege for settlement communications. Can the Board compel production?",
    choices: {
      A: "No, attorney-client privilege overrides Board powers",
      B: "Yes, Section 28(7)(c) grants the Board civil court powers to inspect any documents, including books of account and registers — it can compel production subject to applicable privilege laws",
      C: "Only IRDAI can inspect insurance claim records",
      D: "The Board can only request, not compel",
    },
    correctChoice: "B",
    explanation: "Section 28(7)(c) grants the Board civil court inspection powers for 'any document.' While legal privilege protections under Indian Evidence Act may still apply to specific communications, the Board's general power to compel document production extends broadly beyond what the insurer can simply refuse.",
  },

  // ═══════════════════════════════════════════════════════════
  // RULE 20 — Board as Digital Office
  // ═══════════════════════════════════════════════════════════

  {
    id: "B2001",
    title: "Bank — Digital Summons Validity",
    section: "Rule 20",
    sector: "Banking",
    summary: "Rule 20 mandates the Board to function as a 'digital office,' using techno-legal measures for hearings, pronouncements, and summons.",
    question: "A bank's legal team argues that a Data Protection Board summons served digitally (via the Board's portal) is invalid and must be served physically in court. Is this argument correct?",
    choices: {
      A: "Yes, summons must be physical under the Code of Civil Procedure",
      B: "No, Rule 20 mandates the Board to function as a digital office using techno-legal measures — digital summons are fully valid",
      C: "Only if the bank's registered office is in a metro city",
      D: "The Board cannot issue summons — only courts can",
    },
    correctChoice: "B",
    explanation: "Rule 20 mandates the Board to function as a 'digital office' and adopt 'techno-legal measures' for all proceedings including hearings, summons, and pronouncements. Digital summons via the Board's portal are legally valid and the bank's CPC argument fails.",
  },
  {
    id: "I2001",
    title: "Insurance — Board's Power to Order Without Physical Presence",
    section: "Rule 20",
    sector: "Insurance",
    summary: "Rule 20's digital office mandate ensures that hearings and pronouncements can occur without physical presence of insurer or customer.",
    question: "An insurer requests a physical hearing before the Data Protection Board in its investigation. The Board schedules an online video conference instead. Can the insurer insist on physical proceedings?",
    choices: {
      A: "Yes, the insurer has a right to a physical hearing under natural justice principles",
      B: "No, Rule 20 mandates the Board to conduct proceedings including hearings via techno-legal measures without requiring physical presence — online hearings are compliant",
      C: "Yes, for penalties above ₹100 Crore",
      D: "Only if both parties agree to online proceedings",
    },
    correctChoice: "B",
    explanation: "Rule 20 mandates the Board to function as a digital office and conduct proceedings without requiring physical presence through techno-legal measures. The insurer cannot insist on physical hearings — remote video proceedings fully satisfy natural justice requirements under this rule.",
  },

  // ═══════════════════════════════════════════════════════════
  // RULE 22 — Appeal to Appellate Tribunal (TDSAT)
  // ═══════════════════════════════════════════════════════════

  {
    id: "B2201",
    title: "Bank — TDSAT as Appellate Body",
    section: "Rule 22",
    sector: "Banking",
    summary: "Rule 22 designates TDSAT (Telecom Disputes Settlement and Appellate Tribunal) as the appellate forum for Board orders under the DPDP Act.",
    question: "A bank receives a ₹200 Crore Data Protection Board penalty for Rule 6 violations and wants to appeal. Which tribunal hears this appeal?",
    choices: {
      A: "The High Court of the relevant state",
      B: "Telecom Disputes Settlement and Appellate Tribunal (TDSAT) — per Rule 22 and Section 29",
      C: "National Company Law Appellate Tribunal (NCLAT)",
      D: "The Supreme Court directly",
    },
    correctChoice: "B",
    explanation: "Rule 22 and Section 29 of the DPDP Act designate TDSAT as the Appellate Tribunal for all appeals against Data Protection Board orders. This is a specific legislative choice to leverage TDSAT's existing expertise in technology-sector regulation.",
  },
  {
    id: "B2202",
    title: "Bank — TDSAT Appeal Filing Requirements",
    section: "Rule 22",
    sector: "Banking",
    summary: "Rule 22(1) mandates appeals to TDSAT be filed in digital form; Rule 22(2) sets the fee at ₹10,000 payable via UPI or RBI-authorized systems.",
    question: "A bank's lawyer wants to file a TDSAT appeal against a Board order. What are the form and fee requirements under Rule 22?",
    choices: {
      A: "Physical filing; ₹50,000 demand draft",
      B: "Digital filing (per Rule 22(1)); ₹10,000 fee payable via UPI or RBI-authorized payment system (per Rule 22(2))",
      C: "Email filing; no fee required",
      D: "Physical filing; ₹1,000 court tax stamp",
    },
    correctChoice: "B",
    explanation: "Rule 22(1) mandates digital form filing. Rule 22(2) sets the appeal fee at ₹10,000 (pegged to the standard TRAI Act fee) payable specifically via UPI or other RBI-authorized payment systems — reflecting the DPDP's 'Digital India' philosophy.",
  },
  {
    id: "I2201",
    title: "Insurance — TDSAT as Digital Office",
    section: "Rule 22",
    sector: "Insurance",
    summary: "Rule 22(3)(b) mandates TDSAT to also function as a digital office with techno-legal measures for DPDP appeals.",
    question: "An insurer's lawyer argues that TDSAT must conduct an in-person oral hearing for their ₹75 Crore penalty appeal under DPDP. Is this correct?",
    choices: {
      A: "Yes, oral hearings are guaranteed under natural justice",
      B: "No, Rule 22(3)(b) mandates TDSAT to function as a digital office under techno-legal measures for DPDP appeals — physical hearings are not mandated",
      C: "Yes, for penalties above ₹50 Crore",
      D: "Only the Board's proceedings are digital — TDSAT is traditional",
    },
    correctChoice: "B",
    explanation: "Rule 22(3)(b) explicitly extends the digital office mandate to TDSAT when hearing DPDP appeals. TDSAT is guided by natural justice principles (Rule 22(3)(a)) but not bound by the physical hearing requirements of the Code of Civil Procedure.",
  },
  {
    id: "X2201",
    title: "Cross-Sector — Final Appeal from TDSAT",
    section: "Rule 22",
    sector: "Cross-Sector",
    summary: "Section 29(9) provides that appeals from TDSAT orders under the DPDP Act lie directly to the Supreme Court of India.",
    question: "After TDSAT dismisses a bancassurance conglomerate's appeal of a DPDP Board order, what is the next appellate option?",
    choices: {
      A: "High Court of Delhi (TDSAT's seat)",
      B: "Supreme Court of India per Section 29(9)",
      C: "A Division Bench of TDSAT",
      D: "MeitY's grievance redressal mechanism",
    },
    correctChoice: "B",
    explanation: "Section 29(9) of the DPDP Act provides that appeals from TDSAT orders under the Act lie directly to the Supreme Court of India (not the High Court). This is consistent with the TRAI Act framework that TDSAT already operates under.",
  },

  // ═══════════════════════════════════════════════════════════
  // RULE 23 — Government Information Calls
  // ═══════════════════════════════════════════════════════════

  {
    id: "B2301",
    title: "Bank — Government Data Demand via Rule 23",
    section: "Rule 23",
    sector: "Banking",
    summary: "Rule 23(1) empowers the Central Government to demand data from fiduciaries through authorized persons listed in the Seventh Schedule.",
    question: "A MeitY-designated officer demands transaction metadata from a bank under Rule 23 to assess if it should be notified as an SDF. Must the bank comply?",
    choices: {
      A: "No, customer financial data is protected by banking secrecy laws absolutely",
      B: "Yes, Rule 23(1) empowers authorized persons in the Seventh Schedule to demand information for specific regulatory purposes including SDF assessment",
      C: "Only with a court order",
      D: "Only if the RBI also issues a parallel direction",
    },
    correctChoice: "B",
    explanation: "Rule 23(1) and Seventh Schedule Item 3 specifically authorize a designated MeitY officer to call for information from fiduciaries to assess whether they should be notified as SDFs. The bank must comply with this legitimate regulatory demand.",
  },
  {
    id: "B2302",
    title: "Bank — Rule 23 'Gag Order' on Disclosure",
    section: "Rule 23",
    sector: "Banking",
    summary: "Rule 23(2) allows the government to prohibit a fiduciary from disclosing the government's information request to the affected customer when disclosure could harm national sovereignty or security.",
    question: "A MeitY officer demands a bank's customer transaction data and directs the bank not to inform the customer. The bank's compliance team wants to notify the customer. What does Rule 23(2) require?",
    choices: {
      A: "The bank must notify the customer regardless",
      B: "The bank must not disclose the demand to the customer without previous written permission from the government if national security could be harmed — Rule 23(2) 'gag order' applies",
      C: "The bank can choose to notify at its discretion",
      D: "The bank must notify the customer but can delay by 30 days",
    },
    correctChoice: "B",
    explanation: "Rule 23(2) contains an explicit 'gag order' provision: if the government determines that disclosing the information request would prejudicially affect national sovereignty or security, the bank is strictly prohibited from informing the customer without previous written permission from the government.",
  },
  {
    id: "I2301",
    title: "Insurance — Intermediary Definition Under Rule 23",
    section: "Rule 23",
    sector: "Insurance",
    summary: "Rule 23(3) specifies that 'intermediary' in Rule 23 carries the same meaning as in the Information Technology Act 2000.",
    question: "An insurance aggregator platform is served a Rule 23 information demand. The platform argues it is not a 'Data Fiduciary' but merely a passive marketplace. Under which law is 'intermediary' defined for Rule 23 purposes?",
    choices: {
      A: "The DPDP Act 2023's own definition",
      B: "The Information Technology Act 2000 — Rule 23(3) cross-references the IT Act's definition of intermediary",
      C: "The Companies Act 2013",
      D: "The Insurance Regulatory Development Authority Act",
    },
    correctChoice: "B",
    explanation: "Rule 23(3) explicitly states that the term 'intermediary' in Rule 23 has the same meaning as in the Information Technology Act 2000. The IT Act's definition encompasses platforms that store/transmit third-party data — insurance aggregators likely qualify.",
  },

];
