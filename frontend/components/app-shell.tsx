import {
  Activity,
  Bot,
  Brain,
  ClipboardList,
  Clock3,
  DollarSign,
  Inbox,
  LayoutDashboard,
  Search,
  Users,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

const navItems = [
  { href: "/", label: "운영 맵", count: "10", icon: LayoutDashboard },
  { href: "/request-intake", label: "요청 콘솔", count: "", icon: Inbox },
  { href: "/approvals", label: "승인함", count: "", icon: ClipboardList },
  { href: "/agents", label: "에이전트", count: "10", icon: Users },
  { href: "/", label: "활동 로그", count: "", icon: Activity },
  { href: "/", label: "스케줄", count: "", icon: Clock3 },
  { href: "/", label: "비용", count: "", icon: DollarSign },
  { href: "/", label: "메모리", count: "", icon: Brain },
];

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-[#05080B] text-[#E8EEF2]">
      <div className="flex min-h-screen w-full">
        <aside className="hidden h-screen w-[304px] shrink-0 flex-col border-r border-white/10 bg-[#17191D] lg:flex">
          <div className="border-b border-white/10 p-5">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-[12px] bg-[#2A1014] text-[#FF5261] shadow-[0_0_24px_rgba(255,82,97,0.25)]">
                <Bot size={23} aria-hidden="true" />
              </span>
              <div>
                <p className="text-lg font-bold tracking-[-0.02em] text-white">CRATA Office</p>
                <p className="mt-0.5 text-sm text-[#8F98A3]">Command Centre</p>
              </div>
            </div>

            <div className="mt-5 flex h-12 items-center gap-3 rounded-[10px] border border-white/10 bg-white/[0.06] px-4 text-[#7D8792]">
              <Search size={17} aria-hidden="true" />
              <span className="text-sm">검색...</span>
              <span className="ml-auto rounded-[6px] bg-white/10 px-2 py-1 text-[11px] font-semibold">⌘K</span>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto px-4 py-5">
            <p className="px-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#666F7A]">Workspace</p>
            <div className="mt-3 space-y-1">
              {navItems.map((item, index) => {
                const Icon = item.icon;
                const selected = index === 0;

                return (
                  <Link
                    key={`${item.href}-${item.label}`}
                    href={item.href}
                    className={
                      selected
                        ? "flex items-center gap-3 rounded-[10px] bg-[#351D23] px-4 py-3 text-sm font-semibold text-[#FF5F6D]"
                        : "flex items-center gap-3 rounded-[10px] px-4 py-3 text-sm font-semibold text-[#A2ABB5] transition hover:bg-white/[0.06] hover:text-white"
                    }
                  >
                    <Icon size={18} aria-hidden="true" />
                    <span>{item.label}</span>
                    {item.count ? (
                      <span aria-hidden="true" className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-[#AAB2BC]">
                        {item.count}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </nav>

          <div className="border-t border-white/10 p-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#666F7A]">Runtime</p>
            <div className="mt-4 space-y-4">
              <UsageBar label="로컬 모델" value="Healthy" percent={82} tone="#36D47F" />
              <UsageBar label="승인 큐" value="Active" percent={46} tone="#F2B84B" />
            </div>
            <div className="mt-5 flex items-center gap-3 rounded-[12px] bg-black/20 p-3">
              <span className="flex size-9 items-center justify-center rounded-[10px] bg-[#3A1C23] text-xs font-black text-[#FF5F6D]">
                CH
              </span>
              <div>
                <p className="text-sm font-semibold text-white">청하님</p>
                <p className="text-xs text-[#7D8792]">Owner</p>
              </div>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1 overflow-hidden p-4">{children}</main>
      </div>
    </div>
  );
}

function UsageBar({
  label,
  value,
  percent,
  tone,
}: {
  label: string;
  value: string;
  percent: number;
  tone: string;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="font-semibold text-[#B7C0C9]">{label}</span>
        <span className="font-bold" style={{ color: tone }}>
          {value}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full" style={{ width: `${percent}%`, backgroundColor: tone }} />
      </div>
    </div>
  );
}
