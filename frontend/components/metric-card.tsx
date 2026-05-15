import type { ReactNode } from "react";

interface MetricCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  tone?: "default" | "primary" | "approval" | "analysis";
}

const toneClasses: Record<NonNullable<MetricCardProps["tone"]>, string> = {
  default: "text-[#5F6B64]",
  primary: "text-primary",
  approval: "text-approval",
  analysis: "text-analysis",
};

export function MetricCard({ label, value, icon, tone = "default" }: MetricCardProps) {
  return (
    <section className="rounded-card border border-border bg-surface p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium text-[#5F6B64]">{label}</p>
        {icon ? <span className={toneClasses[tone]}>{icon}</span> : null}
      </div>
      <p className="mt-3 text-2xl font-semibold text-[#1F2723]">{value}</p>
    </section>
  );
}
