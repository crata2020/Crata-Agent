"use client";

import {
  Activity,
  Bot,
  Brain,
  CalendarDays,
  DollarSign,
  GitFork,
  Inbox,
  LayoutDashboard,
  ListChecks,
  Network,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  ServerCog,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

type NavItem = {
  href: string;
  label: string;
  icon: typeof Inbox;
  hint: string;
  badge?: number;
};

const navGroups: Array<{ label: string; items: NavItem[] }> = [
  {
    label: "운영",
    items: [
      { href: "/", label: "대시보드", icon: LayoutDashboard, hint: "운영 현황" },
      { href: "/request-intake", label: "새 요청", icon: Inbox, hint: "회의록·지시사항 입력" },
      { href: "/approvals", label: "인박스", icon: ShieldCheck, hint: "승인과 반려" },
    ],
  },
  {
    label: "작업",
    items: [
      { href: "/map", label: "태스크", icon: ListChecks, hint: "요청별 진행 보드" },
      { href: "/activity", label: "활동 로그", icon: Activity, hint: "실행 단계 기록" },
      { href: "/schedule", label: "캘린더", icon: CalendarDays, hint: "예약과 반복 작업" },
      { href: "/costs", label: "비용", icon: DollarSign, hint: "모델 사용량" },
    ],
  },
  {
    label: "에이전트",
    items: [
      { href: "/office", label: "에이전트 오피스", icon: Sparkles, hint: "부서형 시각화" },
      { href: "/org-chart", label: "조직도", icon: GitFork, hint: "역할과 지휘 체계" },
      { href: "/agents", label: "에이전트", icon: Users, hint: "직원별 현재 업무" },
    ],
  },
  {
    label: "지식",
    items: [{ href: "/memory", label: "지식·검사", icon: Brain, hint: "공식 지식과 사례" }],
  },
];

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname() ?? "/";
  const [collapsed, setCollapsed] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const stored = window.localStorage.getItem("crata-sidebar-collapsed");
    if (stored !== null) {
      setCollapsed(stored === "true");
    }
  }, []);

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return navGroups;
    return navGroups
      .map((group) => ({
        ...group,
        items: group.items.filter(
          (item) =>
            item.label.toLowerCase().includes(q) ||
            item.hint.toLowerCase().includes(q),
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [query]);

  function toggleSidebar() {
    setCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem("crata-sidebar-collapsed", String(next));
      return next;
    });
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[var(--color-bg)]">
      {!collapsed ? (
        <aside className="hidden h-full w-[260px] shrink-0 flex-col border-r border-white/[0.08] bg-[#0D0E10] lg:flex">
          <div className="border-b border-white/[0.08] px-4 pb-3 pt-4">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2.5" aria-label="CRATA OS 홈">
                <span className="flex size-8 items-center justify-center rounded-lg border border-emerald-400/30 bg-emerald-400/[0.10] text-emerald-200">
                  <Network size={16} aria-hidden="true" />
                </span>
                <span>
                  <span className="block text-sm font-bold text-white">CRATA OS</span>
                  <span className="block text-[10px] font-medium text-[var(--color-text-muted)]">
                    Agent Office
                  </span>
                </span>
              </Link>
              <button
                type="button"
                onClick={toggleSidebar}
                aria-label="사이드바 접기"
                className="flex size-7 items-center justify-center rounded-md text-[var(--color-text-muted)] hover:bg-white/[0.06] hover:text-white"
              >
                <PanelLeftClose size={15} aria-hidden="true" />
              </button>
            </div>

            <label className="mt-3 block">
              <span className="sr-only">메뉴 검색</span>
              <span className="flex h-8 items-center gap-2 rounded-md border border-white/[0.08] bg-black/30 px-2.5 text-[var(--color-text-muted)] focus-within:border-emerald-300/50">
                <Search size={13} aria-hidden="true" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="검색..."
                  className="min-w-0 flex-1 bg-transparent text-xs text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-muted)]"
                />
              </span>
            </label>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-3">
            <div className="space-y-4">
              {filteredGroups.map((group) => (
                <section key={group.label}>
                  <p className="mb-1.5 px-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
                    {group.label}
                  </p>
                  <div className="space-y-0.5">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const isSelected =
                        item.href === "/"
                          ? pathname === "/"
                          : pathname === item.href || pathname.startsWith(`${item.href}/`);

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          aria-label={item.label}
                          className={
                            isSelected
                              ? "flex items-center gap-2.5 rounded-md border border-emerald-400/20 bg-emerald-400/[0.10] px-2.5 py-2 text-emerald-200"
                              : "flex items-center gap-2.5 rounded-md border border-transparent px-2.5 py-2 text-[var(--color-text-secondary)] hover:bg-white/[0.04] hover:text-white"
                          }
                        >
                          <Icon size={15} aria-hidden="true" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13px] font-medium">{item.label}</span>
                          </span>
                          {item.badge ? (
                            <span className="rounded-full bg-[var(--color-danger-soft)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--color-danger)]">
                              {item.badge}
                            </span>
                          ) : null}
                        </Link>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          </nav>

          <div className="border-t border-white/[0.08] p-3">
            <div className="rounded-lg border border-white/[0.08] bg-black/25 p-3">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-white">
                  <ServerCog size={13} className="text-sky-300" aria-hidden="true" />
                  로컬 실행
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/[0.10] px-2 py-0.5 text-[10px] font-bold text-emerald-200">
                  <span className="size-1.5 rounded-full bg-emerald-300 crata-pulse" />
                  준비
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-[var(--color-text-muted)]">
                <span className="inline-flex items-center gap-1">
                  <Bot size={11} className="text-amber-300" aria-hidden="true" />
                  자동화 보호
                </span>
                <span>청하님</span>
              </div>
            </div>
          </div>
        </aside>
      ) : (
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label="사이드바 열기"
          className="fixed left-3 top-3 z-50 hidden size-9 items-center justify-center rounded-lg border border-white/[0.08] bg-[#0D0E10]/95 text-[var(--color-text-secondary)] shadow-lg backdrop-blur hover:text-white lg:flex"
        >
          <PanelLeftOpen size={16} aria-hidden="true" />
        </button>
      )}

      <main className="min-w-0 flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
