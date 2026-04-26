interface PrincipleMeta {
  number: number;
  title: string;
  explanation: string;
}

const PRINCIPLES: PrincipleMeta[] = [
  {
    number: 1,
    title: "Lawful Processing",
    explanation:
      "Personal data processing is lawful only with valid consent or for certain legitimate uses under Section 7.",
  },
  {
    number: 2,
    title: "Notice & Transparency",
    explanation:
      "Notice must be standalone, clear, and specific about data, purpose, rights, and withdrawal mechanisms.",
  },
  {
    number: 3,
    title: "Consent",
    explanation:
      "Consent must be free, specific, informed, unambiguous, and withdrawable with ease comparable to giving consent.",
  },
  {
    number: 4,
    title: "Purpose Limitation",
    explanation:
      "Use personal data only for the purpose stated in notice and consent, unless a lawful exception applies.",
  },
  {
    number: 5,
    title: "Data Minimization",
    explanation:
      "Collect and process only the minimum personal data necessary for the specified lawful purpose.",
  },
  {
    number: 6,
    title: "Data Accuracy",
    explanation:
      "Data fiduciaries must make reasonable efforts to keep personal data accurate, complete, and up to date.",
  },
  {
    number: 7,
    title: "Storage Limitation",
    explanation:
      "Erase personal data when the purpose is complete unless retention is required by law.",
  },
  {
    number: 8,
    title: "Security & Integrity",
    explanation:
      "Implement reasonable safeguards to protect personal data and respond quickly to personal data breaches.",
  },
  {
    number: 9,
    title: "Accountability",
    explanation:
      "Data fiduciaries remain responsible for compliance, governance, grievance handling, and demonstrable controls.",
  },
];

function getSectionNumber(section: string): number | null {
  const match = section.match(/Rule\s+(\d+)/i);
  if (!match) return null;

  const value = Number.parseInt(match[1] ?? "", 10);
  return Number.isNaN(value) ? null : value;
}

export function getPrincipleMetaFromSection(section: string): PrincipleMeta | null {
  const number = getSectionNumber(section);
  if (!number) return null;

  return PRINCIPLES.find((principle) => principle.number === number) ?? null;
}

export function getSectionTag(section: string): string {
  const principle = getPrincipleMetaFromSection(section);
  return principle ? `Principle ${principle.number}` : section;
}

export function getSectionDisplayName(section: string): string {
  const principle = getPrincipleMetaFromSection(section);
  return principle ? `Principle ${principle.number} - ${principle.title}` : section;
}

export function getSectionExplanation(section: string): string | null {
  return getPrincipleMetaFromSection(section)?.explanation ?? null;
}
