export type TransactionType = "income" | "expense";
export type InputMethod = "manual" | "ai_text" | "ai_voice";
export type Category = {
  id: string;
  name_bn: string;
  name_en: string;
  type: TransactionType;
  icon: string;
  color: string;
  sort_order: number;
};
export type Transaction = {
  id: string;
  user_id: string;
  type: TransactionType;
  title: string;
  amount_paisa: number;
  category_id: string;
  occurred_on: string;
  note: string | null;
  input_method: InputMethod;
  client_request_id: string;
  created_at: string;
  updated_at: string;
};
export type Budget = {
  id: string;
  user_id: string;
  category_id: string;
  month: string;
  category_type: "expense";
  limit_paisa: number;
  created_at: string;
  updated_at: string;
};
export type Profile = { id: string; display_name: string; created_at: string; updated_at: string };
export type CategoryTotal = { category_id: string; amount_paisa: number };
export type Snapshot = {
  income: number;
  expense: number;
  remaining: number;
  count: number;
  categories: CategoryTotal[];
  budgets: Budget[];
  revision: string;
};
export type TransactionInput = {
  type: TransactionType;
  title: string;
  amount: string;
  category_id: string;
  occurred_on: string;
  note: string;
  input_method: InputMethod;
  client_request_id: string;
};
export type Draft = {
  key: string;
  title: string;
  amount: string;
  category_id: string;
  occurred_on: string;
  selected: boolean;
  date_defaulted: boolean;
  issue: string | null;
  input_method: InputMethod;
};
export type SummarySection = { id: string; heading: string; body: string };
export type SummaryResult = { version: string; sections: SummarySection[]; closing: string };
