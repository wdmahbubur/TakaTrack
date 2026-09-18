import type { CSSProperties } from "react";
const paths: Record<string, string[]> = {
  home: ["M3 10 12 3l9 7v11h-6v-7H9v7H3z"],
  receipt: ["M5 3h14v19l-3-2-4 2-4-2-3 2V3", "M8 7h8M8 11h8M8 15h5"],
  shield: ["m12 3 8 4v6c0 5-8 9-8 9s-8-4-8-9V7z", "m8 12 3 3 5-6"],
  chart: ["M4 21h17M7 17V9M12 17V3M17 17V7"],
  user: ["M20 21v-3a8 8 0 0 0-16 0v3", "M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0"],
  logout: ["M9 3H4v18h5M8 12h14m-5-5 5 5-5 5"],
  bell: ["M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"],
  down: ["m8 10 4 4 4-4"],
  left: ["m14 6-6 6 6 6"],
  right: ["m10 6 6 6-6 6"],
  arrow: ["M3 12h18m-6-6 6 6-6 6"],
  back: ["M21 12H3m6-6-6 6 6 6"],
  plus: ["M12 4v16M4 12h16"],
  close: ["m6 6 12 12M6 18 18 6"],
  menu: ["M4 6h16M4 12h16M4 18h16"],
  calendar: ["M7 2v5M17 2v5M3 10h18", "M5 5h14a2 2 0 0 1 2 2v13H3V7a2 2 0 0 1 2-2"],
  search: ["M21 21l-5-5", "M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0"],
  edit: ["m15 4 5 5M4 16l12-12c3-3 6 0 3 3L7 20l-4 1z"],
  trash: ["M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7"],
  utensils: ["M4 3v7c0 3 6 3 6 0V3M7 3v18M18 3c-3 4-4 9 0 9h2V3zM20 12v9"],
  cart: ["M2 3h3l3 13h11l3-10H6M9 20h.01M18 20h.01"],
  bus: ["M7 18v3M17 18v3M5 9h14M5 3h14v15H5zM8 14h.01M16 14h.01"],
  gamepad: ["M7 6h10c4 0 6 14 2 14l-4-4H9l-4 4C1 20 3 6 7 6zM7 9v5M4.5 11.5h5M16 10h.01M18 13h.01"],
  more: ["M4 12h.01M12 12h.01M20 12h.01"],
  income: ["M4 14v7h16v-7M12 17V3m-5 5 5-5 5 5"],
  expense: ["M4 14v7h16v-7M12 3v14m-5-5 5 5 5-5"],
  wallet: ["M20 8V4H4v16h16v-4M4 8h18v8h-7V8M18 12h.01"],
  sparkles: ["m12 3 2.8 6.2L21 12l-6.2 2.8L12 21l-2.8-6.2L3 12l6.2-2.8zM21 2v4M19 4h4"],
  info: ["M12 11v6M12 7h.01", "M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0"],
  check: ["m4 12 5 5L20 6"],
  refresh: ["M21 3v6h-6M3 21v-6h6M3 10a9 9 0 0 1 15-7l3 6M21 14a9 9 0 0 1-15 7l-3-6"],
  lock: ["M7 10V6a5 5 0 0 1 10 0v4M4 10h16v12H4zM12 14v4"],
  mail: ["M3 5h18v14H3zM3 6l9 7 9-7"],
  eye: ["M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12z", "M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0"],
  mic: ["M9 3a3 3 0 0 1 6 0v9a3 3 0 0 1-6 0zM5 10v2a7 7 0 0 0 14 0v-2M12 19v4M8 23h8"],
  stop: ["M5 5h14v14H5z"],
  flag: ["M5 22V3h14l-3 5 3 5H5"],
  target: ["M22 12a10 10 0 1 1-10-10M17 12a5 5 0 1 1-5-5M12 12 22 2M17 2h5v5"],
  bolt: ["m14 2-10 12h7l-1 8L21 9h-8z"],
  heart: ["M20 4c-4-4-8 1-8 1S8 0 4 4c-6 6 8 17 8 17S26 10 20 4z"],
  devices: ["M14 3H2v16h9M6 22h5M15 10h7v13h-7z"],
  play: ["m9 5 11 7-11 7z"],
  briefcase: ["M8 6V3h8v3M3 6h18v15H3zM3 11l9 3 9-3"],
};
export function Icon({
  name,
  size = 20,
  className = "",
  style,
}: {
  name: string;
  size?: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      style={style}
    >
      {(paths[name] ?? paths.more).map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="logo">
      <svg
        width="33"
        height="36"
        viewBox="0 0 40 42"
        fill="none"
        aria-hidden="true"
        style={{ color: "var(--green)" }}
      >
        <path
          fill="currentColor"
          d="M20 2c4-3 8 0 9 4 6 0 9 5 7 10 5 4 4 10-1 13 1 6-4 9-9 8-4 5-10 3-12 0-6 1-10-4-9-9-5-3-5-9 0-12C3 10 8 6 13 7c0-4 3-6 7-5Z"
        />
        <path
          d="m13 11 13 8 3-5M26 19l-2-8M27 29l-13-8-3 5M14 21l2 8M12 13l-3 3v5M28 27l3-3v-5"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {!compact && <span>TakaTrack</span>}
    </span>
  );
}
