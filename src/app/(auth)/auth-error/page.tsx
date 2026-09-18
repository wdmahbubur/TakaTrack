import { ActionLink, EmptyState } from "@/components/ui";
export default function Page() {
  return (
    <section className="auth-card auth-error">
      <EmptyState
        title="লিংকটি কাজ করছে না"
        description="লিংকটির মেয়াদ শেষ হয়েছে, আগে ব্যবহার হয়েছে, অথবা অন্য ব্রাউজারে খোলা হয়েছে। নতুন লিংক নিন।"
      >
        <ActionLink href="/forgot-password">রিসেট লিংক নিন</ActionLink>
        <ActionLink href="/verify-email" variant="secondary">
          ইমেইল যাচাই করুন
        </ActionLink>
      </EmptyState>
    </section>
  );
}
