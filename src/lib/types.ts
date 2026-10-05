/* Shared domain contracts returned by services and consumed by API/UI layers. */
export type MoneyAmount = string;
export type TransactionType = "income" | "expense";

/* Budget summaries keep money string-based and expose category limits separately. */
export interface Budget {
  id: string;
  userId: string;
  month: string;
  category?: string;
  total: MoneyAmount;
  remaining: MoneyAmount;
  categoryLimits?: BudgetCategoryLimit[];
  createdAt: string;
  updatedAt: string;
}

export interface BudgetCategoryLimit {
  categoryId: string;
  category: string;
  limit: MoneyAmount;
  spent: MoneyAmount;
  remaining: MoneyAmount;
}

export interface BudgetAlert {
  id: string;
  budgetId: string;
  categoryId: string | null;
  category: string;
  thresholdPercent: string;
  triggeredAt: string;
  acknowledgedAt: string | null;
}

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  category: string;
  categoryId?: string;
  amount: MoneyAmount;
  description: string;
  date: string;
  createdAt: string;
}

export interface BudgetSummary {
  userId: string;
  month: string;
  totalBudget: MoneyAmount;
  totalIncome: MoneyAmount;
  totalExpense: MoneyAmount;
  availableBalance: MoneyAmount;
  remaining: MoneyAmount;
  transactions: Transaction[];
}

/* Meal-planning entities and their recipe/pantry relationships. */
export interface Ingredient {
  id: string;
  userId: string;
  name: string;
  unit: string;
  category: string;
  createdAt: string;
}

export interface DishIngredientInput {
  ingredientId: string;
  quantity: MoneyAmount;
  unit: string;
}

export interface Dish {
  id: string;
  userId: string;
  name: string;
  description?: string;
  ingredients: DishIngredientInput[];
  createdAt: string;
}

export interface PantryItem {
  id: string;
  userId: string;
  ingredientId: string;
  quantity: MoneyAmount;
  unit: string;
  expiryDate?: string;
  createdAt: string;
}

/* Persisted meal plans and cart summaries shared across modules 02-05. */
export interface MealPlanItem {
  id?: string;
  dishId?: string;
  dayNumber: number;
  mealType: "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK";
  servings: MoneyAmount;
  dishNameSnapshot: string;
  createdAt?: string;
}

export interface MealPlan {
  id: string;
  userId: string;
  planDate: string;
  peopleCount: number;
  dayCount: number;
  goal?: string | null;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  items: MealPlanItem[];
  createdAt: string;
  updatedAt: string;
}

export interface CartSessionSummary {
  id: string;
  userId: string;
  mealPlanId?: string;
  budgetSnapshot: MoneyAmount;
  strategy: string;
  status: string;
  createdAt: string;
}

/* Catalog and purchase snapshots used by product and shopping services. */
export interface Store {
  id: string;
  name: string;
  storeType?: string | null;
  brandName?: string | null;
  address: string;
  latitude: MoneyAmount;
  longitude: MoneyAmount;
  phone?: string | null;
  website?: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  name: string;
  category?: string | null;
  brand?: string | null;
  size?: MoneyAmount | null;
  sizeUnit?: string | null;
  unit?: string | null;
  imageUrl?: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CartLineItem {
  productId: string;
  storeId: string;
  quantity: MoneyAmount;
  unit: string;
  unitPriceSnapshot: MoneyAmount;
}

export interface PurchaseItem {
  id: string;
  purchaseId: string;
  productId: string;
  storeId: string;
  quantity: MoneyAmount;
  unit: string;
  snapshotPrice: MoneyAmount;
  actualPrice: MoneyAmount;
  createdAt: string;
}

export interface Purchase {
  id: string;
  userId: string;
  cartId: string;
  idempotencyKey: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED";
  actualTotal: MoneyAmount;
  confirmedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  items: PurchaseItem[];
}
