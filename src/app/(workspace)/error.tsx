"use client";
import { Button, EmptyState } from "@/components/ui";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <section className="panel">
      <EmptyState
        title="হিসাব লোড করা যায়নি"
        description="ইন্টারনেট সংযোগ ও Supabase সেটআপ যাচাই করে আবার চেষ্টা করুন।"
      >
        <Button onClick={reset} icon="refresh">
          আবার চেষ্টা করুন
        </Button>
      </EmptyState>
    </section>
  );
}
