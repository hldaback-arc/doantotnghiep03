import assert from "node:assert/strict";
import test from "node:test";

import { computePurchaseSummary } from "../src/server/services/shopping.service.ts";

test("module 4 calculates a purchase summary from cart lines without float drift", () => {
  const summary = computePurchaseSummary([
    { productId: "p-1", storeId: "s-1", quantity: "2", unit: "kg", unitPriceSnapshot: "12000.50" },
    { productId: "p-2", storeId: "s-2", quantity: "3", unit: "pack", unitPriceSnapshot: "3500.00" },
  ]);

  assert.equal(summary.lineCount, 2);
  assert.equal(summary.totalCents, 3450100);
  assert.equal(summary.totalValue, "34501.00");
});
