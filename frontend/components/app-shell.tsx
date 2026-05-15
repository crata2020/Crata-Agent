"use client";

import {
  Activity,
  Bot,
  Brain,
  ClipboardList,
  Clock3,
  DollarSign,
  Inbox,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";

const navItems = [
  { href: "/", label: "운영 맵", count: "10", icon: LayoutDashboard },
  { href: "/request-intake", label: "요청 콘솔", count: "", icon: Inbox },
  { href: "/approvals", label: "승인함", count: "", icon: ClipboardList },
  { href: "/agents", label: "에이전트", count: "10", icon: Users },
  { href: "/activity", label: "활동 로그", count: "", icon: Activity },
  { href: "/schedule", label: "스케줄", count: "", icon: Clock3 },
  { href: "/", label: "비용", count: "", icon: DollarSign },
  { href: "/memory", label: "메모리", count: "", icon: Brain },
];

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname() ?? "/";
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);

  useEffect(() => {
    const stored = window.localStorage.getItem("crata-sidebar-visible");
    if (stored !== null) {
      setIsSidebarVisible(stored === "true");
    }
  }, []);

  function toggleSidebar() {
    setIsSidebarVisible((current) => {
      const next = !current;
      window.localStorage.setItem("crata-sidebar-visible", String(next));
      return next;
    });
  }

  return (
    <div className="min-h-screen bg-[#05080B] text-[#E8EEF2]">
      <div className="flex min-h-screen w-full">
        {isSidebarVisible ? (
        <aside className="hidden h-screen w-[304px] shrink-0 flex-col border-r border-white/10 bg-[#17191D] lg:flex">
          <div className="border-b border-white/10 p-5">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-[12px] bg-[#2A1014] text-[#FF5261] shadow-[0_0_24px_rgba(255,82,97,0.25)]">
                <Bot size={23} aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-lg font-bold tracking-[-0.02em] text-white">CRATA Office</p>
                <p className="mt-0.5 text-sm text-[#8F98A3]">Command Centre</p>
              </div>
              <button
                type="button"
                onClick={toggleSidebar}
                aria-label="왼쪽 바 숨기기"
                title="왼쪽 바 숨기기"
                className="flex size-9 shrink-0 items-center justify-center rounded-[10px] border border-white/10 bg-white/[0.06] text-[#AEB9C4] transition hover:bg-white/10 hover:text-white"
              >
                <PanelLeftClose size={17} aria-hidden="true" />
              </button>
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
                const selected = index === 0 ? pathname === "/" : item.href !== "/" && pathname.startsWith(item.href);

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
        ) : (
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label="왼쪽 바 열기"
            title="왼쪽 바 열기"
            className="fixed left-4 top-4 z-50 hidden size-11 items-center justify-center rounded-[12px] border border-white/10 bg-[#12171D]/92 text-[#DDE6EE] shadow-[0_18px_50px_rgba(0,0,0,0.34)] backdrop-blur transition hover:border-[#38BDF8]/45 hover:bg-[#18212A] lg:flex"
          >
            <PanelLeftOpen size={19} aria-hidden="true" />
          </button>
        )}

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
