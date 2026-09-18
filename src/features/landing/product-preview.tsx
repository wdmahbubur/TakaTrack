import { Icon, Logo } from "@/components/icons";
import { chartColors } from "@/components/charts";
import { demoCategories, demoSnapshot } from "@/lib/domain/demo";
import { money } from "@/lib/domain/money";
export function ProductPreview() {
  const demo = demoSnapshot();
  let offset = 0;
  const circumference = 2 * Math.PI * 84;
  return (
    <figure className="phone-stage" aria-label="TakaTrack নমুনা ড্যাশবোর্ড; এখানে দেখানো হিসাব ডেমো ডেটা">
      <div className="preview-plant" aria-hidden="true">
        <span className="plant-stem" />
        {[1, 2, 3, 4, 5].map((n) => (
          <i className="plant-leaf" key={n} />
        ))}
        <div className="plant-pot" />
      </div>
      <div className="preview-phone">
        <div className="preview-phone-screen">
          <div className="phone-notch" />
          <div className="phone-brand-row">
            <Icon name="menu" size={14} />
            <Logo />
            <Icon name="bell" size={15} />
          </div>
          <p className="phone-greeting">
            শুভ সকাল,
            <br />
            Rahim! 👋
          </p>
          <p className="phone-date">নমুনা হিসাব · এপ্রিল ২০২৫</p>
          <div className="phone-totals">
            {[
              { label: "মোট আয়", value: demo.income, icon: "income" },
              { label: "মোট খরচ", value: demo.expense, icon: "expense" },
              { label: "বাকি আছে", value: demo.remaining, icon: "wallet" },
            ].map((item) => (
              <div key={item.label}>
                <Icon name={item.icon} />
                <span>{item.label}</span>
                <strong>{money(item.value)}</strong>
              </div>
            ))}
          </div>
          <p className="phone-month">এই মাসের খরচ</p>
          <div className="phone-chart">
            <div className="donut-wrap">
              <svg
                viewBox="0 0 220 220"
                role="img"
                aria-label={`নমুনা মোট খরচ ${money(demo.expense)}`}
              >
                <title>নমুনা খরচের বিভাজন</title>
                {demo.categories.map((c) => {
                  const category = demoCategories.find((cat) => cat.id === c.category_id),
                    length = (c.amount_paisa / demo.expense) * circumference,
                    start = offset;
                  offset += length;
                  return (
                    <circle
                      key={c.category_id}
                      cx={110}
                      cy={110}
                      r={84}
                      fill="none"
                      stroke={chartColors[category?.color ?? "slate"]}
                      strokeWidth={27}
                      strokeDasharray={`${length} ${circumference - length}`}
                      strokeDashoffset={-start}
                      transform="rotate(-90 110 110)"
                    />
                  );
                })}
              </svg>
              <div className="donut-center">
                <strong>{money(demo.expense)}</strong>
                <span>মোট খরচ</span>
              </div>
            </div>
            <div className="phone-legend">
              {demoCategories
                .filter((c) => c.type === "expense")
                .map((c) => (
                  <div key={c.id}>
                    <span>
                      <i style={{ background: chartColors[c.color] }} />
                      {c.name_bn}
                    </span>
                    <span>
                      {Math.round(
                        ((demo.categories.find((v) => v.category_id === c.id)?.amount_paisa ?? 0) /
                          demo.expense) *
                          100,
                      )}
                      %
                    </span>
                  </div>
                ))}
            </div>
          </div>
          <div className="phone-nav" aria-hidden="true">
            {[
              ["Home", "home"],
              ["Transactions", "receipt"],
              ["Budgets", "shield"],
              ["Reports", "chart"],
            ].map(([label, icon]) => (
              <span key={label}>
                <Icon name={icon} />
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="floating-growth" aria-hidden="true">
        <Icon name="chart" />
        ছোট সিদ্ধান্ত
        <br />
        বড় পরিবর্তন
      </div>
      <div className="hero-handnote" aria-hidden="true">
        Better
        <br />
        Money
        <br />
        Brighter
        <br />
        Tomorrow
      </div>
      <figcaption className="demo-caption">ডেমো প্রিভিউ — আপনার ব্যক্তিগত হিসাব নয়</figcaption>
    </figure>
  );
}
