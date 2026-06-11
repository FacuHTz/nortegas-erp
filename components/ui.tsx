import Link from "next/link";
import { type ReactNode } from "react";

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ children, className = "", title, actions }: { children: ReactNode; className?: string; title?: string; actions?: ReactNode }) {
  return (
    <div className={`rounded-xl border border-line bg-white shadow-sm ${className}`}>
      {(title || actions) && (
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          {title && <h2 className="text-sm font-semibold text-ink">{title}</h2>}
          {actions}
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
}

export function Stat({ label, value, hint, tone = "ink" }: { label: string; value: string; hint?: string; tone?: "ink" | "brand" | "green" | "red" }) {
  const tones: Record<string, string> = { ink: "text-ink", brand: "text-brand", green: "text-ok", red: "text-danger" };
  return (
    <div className="relative overflow-hidden rounded-xl border border-line bg-white p-4 shadow-sm">
      <span className="absolute inset-y-0 left-0 w-1 bg-brand/80" aria-hidden />
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className={`font-display mt-1 text-2xl font-bold tabular-nums ${tones[tone]}`}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}

const badgeTones: Record<string, string> = {
  gray: "bg-gray-100 text-gray-700 ring-gray-200",
  blue: "bg-blue-50 text-blue-700 ring-blue-200",
  amber: "bg-amber-50 text-amber-800 ring-amber-200",
  green: "bg-green-50 text-green-700 ring-green-200",
  red: "bg-red-50 text-red-700 ring-red-200",
  brand: "bg-orange-50 text-brand ring-orange-200",
};

export function Badge({ children, tone = "gray" }: { children: ReactNode; tone?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${badgeTones[tone] ?? badgeTones.gray}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" aria-hidden />
      {children}
    </span>
  );
}

type BtnProps = {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  href?: string;
  type?: "button" | "submit";
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
};

const btnBase =
  "inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-50 disabled:pointer-events-none";
const btnVariants: Record<string, string> = {
  primary: "bg-brand text-white hover:bg-brand-dark shadow-sm",
  secondary: "bg-white text-ink ring-1 ring-inset ring-line hover:bg-gray-50",
  ghost: "text-ink hover:bg-gray-100",
  danger: "bg-danger text-white hover:bg-red-800",
};

export function Button({ children, variant = "primary", href, className = "", ...rest }: BtnProps) {
  const cls = `${btnBase} ${btnVariants[variant]} ${className}`;
  if (href) return <Link href={href} className={cls}>{children}</Link>;
  return <button className={cls} {...rest}>{children}</button>;
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  const { label, className = "", ...rest } = props;
  const el = (
    <input
      className={`w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-muted/70 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 ${className}`}
      {...rest}
    />
  );
  return label ? <label className="block text-sm"><span className="mb-1 block font-medium text-ink">{label}</span>{el}</label> : el;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string; children: ReactNode }) {
  const { label, className = "", children, ...rest } = props;
  const el = (
    <select
      className={`w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 ${className}`}
      {...rest}
    >
      {children}
    </select>
  );
  return label ? <label className="block text-sm"><span className="mb-1 block font-medium text-ink">{label}</span>{el}</label> : el;
}

export function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line bg-gray-50/70 text-left">
            {head.map((h) => (
              <th key={h} className="whitespace-nowrap px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line/70">{children}</tbody>
      </table>
    </div>
  );
}

export function Td({ children, className = "", right = false }: { children: ReactNode; className?: string; right?: boolean }) {
  return <td className={`px-4 py-2.5 align-middle ${right ? "text-right tabular-nums" : ""} ${className}`}>{children}</td>;
}

export function Empty({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line bg-white px-6 py-12 text-center">
      <p className="font-medium text-ink">{title}</p>
      {hint && <p className="mt-1 max-w-sm text-sm text-muted">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
