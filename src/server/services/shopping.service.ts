import type { CartLineItem, Purchase } from "../../lib/types.ts";

export function computePurchaseSummary(lines: CartLineItem[]) {
  const lineCount = lines.length;
  const totalCents = lines.reduce((sum, line) => {
    const quantity = Number(line.quantity);
    const price = Number(line.unitPriceSnapshot);
    return sum + Math.round((quantity * price) * 100);
  }, 0);

  const totalValue = (totalCents / 100).toFixed(2);

  return {
    lineCount,
    totalCents,
    totalValue,
  };
}

export async function createPurchaseFromCart(input: {
  userId: string;
  cartId: string;
  idempotencyKey: string;
  lines: CartLineItem[];
}): Promise<Purchase> {
  const summary = computePurchaseSummary(input.lines);

  return {
    id: crypto.randomUUID(),
    userId: input.userId,
    cartId: input.cartId,
    idempotencyKey: input.idempotencyKey,
    status: "PENDING",
    actualTotal: summary.totalValue,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    items: input.lines.map((line, index) => ({
      id: crypto.randomUUID(),
      purchaseId: "",
      productId: line.productId,
      storeId: line.storeId,
      quantity: line.quantity,
      unit: line.unit,
      snapshotPrice: line.unitPriceSnapshot,
      actualPrice: line.unitPriceSnapshot,
      createdAt: new Date(Date.now() + index).toISOString(),
    })),
  };
}
