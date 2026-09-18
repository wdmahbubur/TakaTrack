import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Icon } from "./icons";
export function Button({
  children,
  variant = "primary",
  icon,
  className = "",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "soft" | "danger" | "ghost";
  icon?: string;
}) {
  return (
    <button type={type} className={`button button-${variant} ${className}`} {...props}>
      {icon && <Icon name={icon} />} {children}
    </button>
  );
}
export function ActionLink({
  href,
  children,
  icon,
  variant = "primary",
  className = "",
}: {
  href: string;
  children: ReactNode;
  icon?: string;
  variant?: "primary" | "secondary" | "soft" | "ghost";
  className?: string;
}) {
  return (
    <Link href={href} className={`button button-${variant} ${className}`}>
      {icon && <Icon name={icon} />} {children}
    </Link>
  );
}
export function PageHeading({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      <div className="heading-actions">{children}</div>
    </div>
  );
}
export function Footnote({ children }: { children: ReactNode }) {
  return (
    <p className="footnote">
      <Icon name="info" size={14} />
      <span>{children}</span>
    </p>
  );
}
export function Message({
  children,
  tone = "error",
}: {
  children: ReactNode;
  tone?: "error" | "success" | "info";
}) {
  return (
    <div className={`message message-${tone}`} role={tone === "error" ? "alert" : "status"}>
      {children}
    </div>
  );
}
export function EmptyState({
  title = "এখনো কোনো লেনদেন নেই",
  description = "প্রথম আয় বা খরচ যোগ করে আপনার হিসাব শুরু করুন।",
  children,
}: {
  title?: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="category-icon green">
        <Icon name="wallet" size={28} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {children}
    </div>
  );
}
export function CategoryIcon({ icon, color }: { icon: string; color: string }) {
  return (
    <span className={`category-icon ${color}`}>
      <Icon name={icon} />
    </span>
  );
}
