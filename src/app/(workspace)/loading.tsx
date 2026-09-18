export default function Loading() {
  return (
    <div role="status" aria-label="হিসাব লোড হচ্ছে">
      <div className="skeleton skeleton-title" />
      <div className="summary-grid">
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton" style={{ height: 125 }} />
        ))}
      </div>
      <div className="skeleton" style={{ height: 320 }} />
      <span className="sr-only">লোড হচ্ছে…</span>
    </div>
  );
}
