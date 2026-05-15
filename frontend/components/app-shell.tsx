import { Bot, ClipboardList, Inbox, LayoutDashboard, Users } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

const navItems = [
  { href: "/", label: "운영 대시보드", icon: LayoutDashboard },
  { href: "/request-intake", label: "요청 콘솔", icon: Inbox },
  { href: "/approvals", label: "승인함", icon: ClipboardList },
  { href: "/agents", label: "에이전트", icon: Users },
];

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-background text-[#1F2723]">
      <div className="mx-auto flex min-h-screen w-full max-w-[1480px] flex-col lg:flex-row">
        <aside className="border-b border-border bg-surface px-4 py-4 lg:w-64 lg:border-b-0 lg:border-r lg:px-5 lg:py-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-primary">
            <span className="flex size-8 items-center justify-center rounded-button bg-surfaceAlt">
              <Bot size={18} aria-hidden="true" />
            </span>
            CRATA Office
          </div>

          <nav className="mt-4 flex gap-1 overflow-x-auto lg:mt-8 lg:flex-col lg:overflow-visible">
            {navItems.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex shrink-0 items-center gap-2 rounded-button px-3 py-2 text-sm font-medium text-[#5F6B64] transition hover:bg-surfaceAlt hover:text-[#1F2723]"
                >
                  <Icon size={16} aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">{children}</main>
      </div>
    </div>
  );
}
