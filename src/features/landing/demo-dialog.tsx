"use client";
import { useState } from "react";
import { Dialog } from "@/components/dialog";
import { ActionLink, Button, CategoryIcon, Footnote } from "@/components/ui";
import { demoCategories, demoTransactions } from "@/lib/domain/demo";
import { money, sumPaisa } from "@/lib/domain/money";
export function DemoButton() {
  const [open, setOpen] = useState(false),
    rows = demoTransactions().slice(0, 3);
  return (
    <>
      <Button variant="secondary" icon="play" onClick={() => setOpen(true)}>
        Watch Demo
      </Button>
      {open && (
        <Dialog title="তিনটি ধাপে খরচ যোগ করুন" onClose={() => setOpen(false)}>
          <p className="muted">এটি আগে থেকে তৈরি নমুনা, আপনার প্রকৃত হিসাব বা একটি চলমান AI অনুরোধ নয়।</p>
          <div className="landing-demo">
            <h3>১. সাধারণ ভাষায় লিখুন</h3>
            <p>আজ বাজারে ৫০০ টাকা, রিকশায় ৬০ টাকা আর দুপুরের খাবারে ১৫০ টাকা খরচ হয়েছে।</p>
            <h3>২. খসড়া যাচাই করুন</h3>
            {rows.map((row) => {
              const category = demoCategories.find((c) => c.id === row.category_id);
              return (
                <div className="demo-row" key={row.id}>
                  <CategoryIcon
                    icon={category?.icon ?? "more"}
                    color={category?.color ?? "slate"}
                  />
                  <span>{row.title}</span>
                  <strong>{money(row.amount_paisa)}</strong>
                </div>
              );
            })}
            <p className="demo-total">মোট {money(sumPaisa(rows.map((r) => r.amount_paisa)))}</p>
            <h3>৩. যাচাই করে সেভ করুন</h3>
            <p>অ্যাকাউন্টে লগ ইন করে এন্ট্রিগুলো নিজে নিশ্চিত করার পরেই আপনার হিসাব সেভ হবে।</p>
          </div>
          <ActionLink href="/register">অ্যাকাউন্ট তৈরি করুন</ActionLink>
          <Footnote>এই ডেমো কোনো তথ্য সেভ করে না।</Footnote>
        </Dialog>
      )}
    </>
  );
}
