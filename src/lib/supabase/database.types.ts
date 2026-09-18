// Small handwritten schema types. Regenerate after migrations with:
// npx supabase gen types typescript --local > src/lib/supabase/database.types.ts
import type { Budget, Category, Profile, Transaction } from "../domain/types.ts";
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
type Table<Row, Insert, Update> = { Row: Row; Insert: Insert; Update: Update; Relationships: [] };
export type Database = {
  public: {
    Tables: {
      profiles: Table<Profile, { id: string; display_name?: string }, { display_name?: string }>;
      categories: Table<Category, never, never>;
      transactions: Table<
        Transaction,
        Omit<Transaction, "id" | "created_at" | "updated_at"> &
          Partial<Pick<Transaction, "id" | "created_at" | "updated_at">>,
        Partial<Omit<Transaction, "id" | "created_at">>
      >;
      budgets: Table<
        Budget,
        Omit<Budget, "id" | "created_at" | "updated_at" | "category_type"> &
          Partial<Pick<Budget, "id" | "created_at" | "updated_at" | "category_type">>,
        Partial<Pick<Budget, "category_id" | "limit_paisa" | "month">>
      >;
      transaction_requests: Table<
        {
          user_id: string;
          request_id: string;
          payload_hash: string;
          transaction_ids: string[];
          created_at: string;
        },
        never,
        never
      >;
    };
    Views: { [_ in never]: never };
    Functions: {
      month_snapshot: { Args: { p_month: string; p_through?: string }; Returns: Json };
      save_transactions: { Args: { p_request_id: string; p_items: Json }; Returns: string[] };
      consume_ai_quota: { Args: { p_kind: string }; Returns: boolean };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
