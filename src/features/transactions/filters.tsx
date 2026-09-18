"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Category } from "@/lib/domain/types";
import { Icon } from "@/components/icons";
import { MonthPicker } from "@/components/month-picker";
import { Button, Message } from "@/components/ui";
export function TransactionFilters({
  categories,
  month,
}: {
  categories: Category[];
  month: string;
}) {
  const params = useSearchParams(),
    router = useRouter();
  const [advanced, setAdvanced] = useState(
      Boolean(params.get("from") || params.get("to") || params.get("sort")),
    ),
    [error, setError] = useState("");
  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const next = new URLSearchParams(params.toString());
    next.delete("page");
    for (const [key, value] of fd.entries()) {
      if (String(value)) next.set(key, String(value));
      else next.delete(key);
    }
    const from = next.get("from"),
      to = next.get("to");
    if (from && to && from > to) {
      setError("শেষ তারিখ শুরুর তারিখের আগে হতে পারে না।");
      return;
    }
    setError("");
    router.push(`/transactions?${next}`);
  }
  function filter(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    router.push(`/transactions?${next}`);
  }
  return (
    <form className="transaction-filters" onSubmit={submit}>
      <div className="filter-main">
        <label className="search-field">
          <span className="sr-only">বিবরণ দিয়ে খুঁজুন</span>
          <Icon name="search" size={18} />
          <input
            name="q"
            placeholder="বিবরণ দিয়ে খুঁজুন"
            defaultValue={params.get("q") ?? ""}
            maxLength={120}
          />
          <button type="submit" className="search-submit" aria-label="খুঁজুন">
            <Icon name="arrow" size={17} />
          </button>
        </label>
        <select
          aria-label="লেনদেনের ধরন"
          name="type"
          value={params.get("type") ?? ""}
          onChange={(e) => filter("type", e.target.value)}
        >
          <option value="">সব ধরন</option>
          <option value="expense">খরচ</option>
          <option value="income">আয়</option>
        </select>
        <select
          aria-label="বিভাগ"
          name="category"
          value={params.get("category") ?? ""}
          onChange={(e) => filter("category", e.target.value)}
        >
          <option value="">সব বিভাগ</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name_bn}
            </option>
          ))}
        </select>
        <MonthPicker month={month} />
      </div>
      <div className="filter-options">
        <button
          type="button"
          className="text-button muted"
          aria-expanded={advanced}
          onClick={() => setAdvanced(!advanced)}
        >
          তারিখ ও ক্রম {advanced ? "−" : "+"}
        </button>
        {params.get("q") && (
          <button type="button" className="text-button" onClick={() => filter("q", "")}>
            খোঁজ মুছুন
          </button>
        )}
      </div>
      {advanced && (
        <div className="advanced-filters">
          <label>
            শুরুর তারিখ
            <input
              type="date"
              name="from"
              defaultValue={params.get("from") ?? ""}
              min="1900-01-01"
              max="2100-12-31"
            />
          </label>
          <label>
            শেষ তারিখ
            <input
              type="date"
              name="to"
              defaultValue={params.get("to") ?? ""}
              min="1900-01-01"
              max="2100-12-31"
            />
          </label>
          <label>
            সাজান
            <select name="sort" defaultValue={params.get("sort") ?? "date-desc"}>
              <option value="date-desc">নতুন তারিখ আগে</option>
              <option value="date-asc">পুরোনো তারিখ আগে</option>
              <option value="amount-desc">বড় পরিমাণ আগে</option>
              <option value="amount-asc">ছোট পরিমাণ আগে</option>
            </select>
          </label>
          <Button type="submit" variant="secondary">
            প্রয়োগ করুন
          </Button>
        </div>
      )}
      {error && <Message>{error}</Message>}
    </form>
  );
}
export function Pagination({
  page,
  pages,
  count,
  pageSize,
}: {
  page: number;
  pages: number;
  count: number;
  pageSize: number;
}) {
  const params = useSearchParams(),
    router = useRouter();
  function go(p: number) {
    const next = new URLSearchParams(params.toString());
    next.set("page", String(p));
    router.push(`/transactions?${next}`);
  }
  const numbers = [
    ...new Set([1, page - 1, page, page + 1, pages].filter((p) => p >= 1 && p <= pages)),
  ].sort((a, b) => a - b);
  return (
    <div className="pagination">
      <p>
        {count}টি লেনদেনের মধ্যে {count ? (page - 1) * pageSize + 1 : 0}–
        {Math.min(page * pageSize, count)}টি দেখানো হচ্ছে
      </p>
      <nav aria-label="লেনদেনের পাতা">
        <button
          type="button"
          aria-label="আগের পাতা"
          disabled={page <= 1}
          onClick={() => go(page - 1)}
        >
          <Icon name="left" size={15} />
        </button>
        {numbers.map((n, i) => (
          <span key={n}>
            {i > 0 && numbers[i - 1] !== n - 1 && <span className="page-ellipsis">…</span>}
            <button
              type="button"
              className={page === n ? "selected" : ""}
              aria-label={`পাতা ${n}`}
              aria-current={page === n ? "page" : undefined}
              onClick={() => go(n)}
            >
              {n}
            </button>
          </span>
        ))}
        <button
          type="button"
          aria-label="পরের পাতা"
          disabled={page >= pages}
          onClick={() => go(page + 1)}
        >
          <Icon name="right" size={15} />
        </button>
      </nav>
    </div>
  );
}
