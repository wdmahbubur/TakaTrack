import { ActionLink, EmptyState } from "@/components/ui";
export default function NotFound() {
  return (
    <main className="not-found">
      <EmptyState title="পাতাটি পাওয়া যায়নি" description="ঠিকানাটি যাচাই করুন অথবা হোমে ফিরে যান।">
        <ActionLink href="/">হোমে ফিরুন</ActionLink>
      </EmptyState>
    </main>
  );
}
