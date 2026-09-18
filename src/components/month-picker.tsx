"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { monthLabel, validMonth } from "@/lib/domain/dates";
import { Icon } from "./icons";
import { Dialog } from "./dialog";
import { Button } from "./ui";
export function MonthPicker({ month }: { month: string }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(month);
  const path = usePathname();
  const params = useSearchParams();
  const router = useRouter();
  function change(e: React.FormEvent) {
    e.preventDefault();
    if (!validMonth(value)) return;
    const next = new URLSearchParams(params.toString());
    next.set("month", value);
    next.delete("page");
    next.delete("from");
    next.delete("to");
    router.push(`${path}?${next}`);
    setOpen(false);
  }
  return (
    <>
      <button
        type="button"
        className="button button-secondary month-picker"
        onClick={() => {
          setValue(month);
          setOpen(true);
        }}
      >
        <Icon name="calendar" />
        {monthLabel(month)}
        <Icon name="down" size={16} />
      </button>
      {open && (
        <Dialog title="মাস নির্বাচন করুন" onClose={() => setOpen(false)}>
          <form onSubmit={change} className="form-stack">
            <label>
              মাস
              <input
                type="month"
                min="1900-01"
                max="2100-12"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                required
              />
            </label>
            <Button type="submit" disabled={!validMonth(value)}>
              হিসাব দেখুন
            </Button>
          </form>
        </Dialog>
      )}
    </>
  );
}
