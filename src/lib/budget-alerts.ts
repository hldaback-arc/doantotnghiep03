import { toCents } from "./money.ts";

/* Default spending thresholds when a user has not customized alert settings. */
export const defaultBudgetAlertThresholds = ["80.00", "90.00", "100.00"];

/* Returns crossed percentages using integer arithmetic rather than float ratios. */
export function getCrossedBudgetThresholds(
  spent: string,
  limit: string,
  thresholds: string[],
): string[] {
  const spentCents = toCents(spent);
  const limitCents = toCents(limit);
  if (limitCents <= BigInt("0")) return [];

  return thresholds.filter((threshold) =>
    spentCents * BigInt("10000") >= limitCents * toCents(threshold),
  );
}