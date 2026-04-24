/**
 * Central re-export barrel for all game data.
 *
 * Components should import from "@/data" (this file) rather than from
 * individual data modules directly. This keeps import paths stable even
 * if internal file names change.
 *
 * Example:
 *   import { LEVEL1_PRINCIPLE_CARDS, type Level1PrincipleCard } from "@/data";
 *   import { LEVEL2_BANKING_INSURANCE_CARDS, type Level2Card } from "@/data";
 */

// ── Level 1: DPDP Principles (all 23 rules) ──────────────────────────────────
export {
  LEVEL1_PRINCIPLE_CARDS,
  getLevel1CardById,
  type Level1Choice,
  type Level1PrincipleCard,
} from "./level1Principles";

// ── Level 2: Banking & Insurance Sector (all 23 rules applied to sector) ─────
export {
  LEVEL2_BANKING_INSURANCE_CARDS,
  getLevel2CardById,
  type Level2Choice,
  type Level2Card,
} from "./level2BankingInsurance";

// ── Scenarios (solo/single-player mode) ──────────────────────────────────────
export * from "./scenarios";
