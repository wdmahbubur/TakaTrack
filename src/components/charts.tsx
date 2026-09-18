import type { Category, CategoryTotal } from "@/lib/domain/types";
import { money, percentage } from "@/lib/domain/money";
export const chartColors: Record<string, string> = {
  amber: "#eab34b",
  green: "#5db98e",
  blue: "#6ba3df",
  rose: "#df9298",
  purple: "#ae94d6",
  slate: "#a6b8c4",
};
export function CategoryBarChart({
  categories,
  values,
}: {
  categories: Category[];
  values: CategoryTotal[];
}) {
  const cats = categories.filter((c) => c.type === "expense");
  const amounts = cats.map((c) => values.find((v) => v.category_id === c.id)?.amount_paisa ?? 0);
  const largest = Math.max(10000, ...amounts);
  const magnitude = 10 ** Math.floor(Math.log10(largest / 100));
  const ceiling = Math.ceil(largest / 100 / magnitude / 2) * magnitude * 2 * 100 || 10000;
  const width = 530,
    height = 290,
    left = 42,
    top = 16,
    bottom = 46,
    innerH = height - top - bottom,
    step = (width - left - 8) / Math.max(1, cats.length);
  return (
    <svg
      className="bar-chart"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="বিভাগ অনুযায়ী খরচের বার চার্ট"
    >
      <title>বিভাগ অনুযায়ী মোট খরচ</title>
      <desc>{cats.map((c, i) => `${c.name_bn}: ${money(amounts[i])}`).join("; ")}</desc>
      {[0, 1, 2, 3, 4].map((i) => {
        const y = top + (innerH * i) / 4,
          value = (ceiling * (4 - i)) / 4 / 100;
        return (
          <g key={i}>
            <line x1={left} x2={width} y1={y} y2={y} stroke="#e8efeb" strokeDasharray="3 5" />
            <text x={left - 14} y={y + 4} textAnchor="end" className="chart-axis">
              {value >= 1000 ? `${Number((value / 1000).toFixed(1))}k` : value}
            </text>
          </g>
        );
      })}
      {cats.map((c, i) => {
        const barH = (amounts[i] / ceiling) * innerH,
          x = left + step * i + step / 2;
        return (
          <g key={c.id}>
            <rect
              x={x - 19}
              width={38}
              y={top + innerH - barH}
              height={barH}
              rx={5}
              fill={chartColors[c.color] ?? chartColors.slate}
            >
              <title>
                {c.name_bn}: {money(amounts[i])}
              </title>
            </rect>
            <text x={x} y={height - 20} textAnchor="middle" className="chart-axis">
              {c.name_bn}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
export function DonutChart({
  categories,
  values,
  total,
}: {
  categories: Category[];
  values: CategoryTotal[];
  total: number;
}) {
  const cats = categories.filter((c) => c.type === "expense");
  let offset = 0;
  const circumference = 2 * Math.PI * 84;
  return (
    <div className="donut-layout">
      <div className="donut-wrap">
        <svg viewBox="0 0 220 220" role="img" aria-label={`খরচের বিভাজন; মোট ${money(total)}`}>
          <title>খরচের বিভাজন</title>
          <circle cx={110} cy={110} r={84} fill="none" stroke="#edf3ef" strokeWidth={23} />
          {cats.map((c) => {
            const amount = values.find((v) => v.category_id === c.id)?.amount_paisa ?? 0,
              length = total ? (amount / total) * circumference : 0,
              start = offset;
            offset += length;
            return (
              <circle
                key={c.id}
                cx={110}
                cy={110}
                r={84}
                fill="none"
                stroke={chartColors[c.color]}
                strokeWidth={23}
                strokeDasharray={`${length} ${circumference - length}`}
                strokeDashoffset={-start}
                transform="rotate(-90 110 110)"
              >
                <title>
                  {c.name_bn}: {money(amount)}
                </title>
              </circle>
            );
          })}
        </svg>
        <div className="donut-center">
          <span>মোট খরচ</span>
          <strong>{money(total)}</strong>
        </div>
      </div>
      <dl className="chart-legend">
        {cats.map((c) => {
          const amount = values.find((v) => v.category_id === c.id)?.amount_paisa ?? 0;
          return (
            <div key={c.id}>
              <dt>
                <i style={{ background: chartColors[c.color] }} />
                {c.name_bn}
              </dt>
              <dd>{Math.round(percentage(amount, total) ?? 0)}%</dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}
export function BudgetRing({ percent }: { percent: number | null }) {
  const bounded = Math.min(100, Math.max(0, percent ?? 0)),
    circle = 2 * Math.PI * 91;
  return (
    <div className={`budget-ring ${percent !== null && percent > 100 ? "over" : ""}`}>
      <svg
        viewBox="0 0 220 220"
        role="img"
        aria-label={`বাজেট ব্যবহার ${percent === null ? "প্রযোজ্য নয়" : `${Math.round(percent)} শতাংশ`}`}
      >
        <title>মোট বাজেট ব্যবহার</title>
        <circle cx={110} cy={110} r={91} fill="none" stroke="#eaf3ec" strokeWidth={14} />
        <circle
          cx={110}
          cy={110}
          r={91}
          fill="none"
          stroke="currentColor"
          strokeWidth={14}
          strokeDasharray={`${(bounded / 100) * circle} ${circle}`}
          transform="rotate(-90 110 110)"
        />
      </svg>
      <div className="donut-center">
        <strong>
          {percent === null ? "—" : Math.round(percent)}
          {percent !== null && <small>%</small>}
        </strong>
        <span>বাজেট ব্যবহার হয়েছে</span>
      </div>
    </div>
  );
}
