import { ApprovalCard } from "@/components/approval-card";
import { AppShell } from "@/components/app-shell";
import { listApprovals } from "@/lib/api";

export default async function ApprovalsPage() {
  try {
    const approvals = await listApprovals();

    return (
      <AppShell>
        <section className="min-h-[calc(100vh-2rem)] rounded-[18px] border border-white/10 bg-[#05080B] p-5 text-white shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
          <header className="border-b border-white/10 pb-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-[#8EA0AE]">Approval Inbox</p>
            <h1 className="mt-2 text-2xl font-semibold text-white">승인함</h1>
            <p className="mt-2 text-sm leading-6 text-[#B7C2CC]">
              공식 반영 전 검토가 필요한 작업 결과를 확인합니다.
            </p>
          </header>

          {approvals.length === 0 ? (
            <section className="mt-5 rounded-[14px] border border-white/10 bg-[#111820] p-6 text-sm text-[#AEB9C4]">
              승인대기 항목이 없습니다.
            </section>
          ) : (
            <section className="mt-5 space-y-3" aria-label="승인 항목">
              {approvals.map((approval) => (
                <ApprovalCard key={approval.id} approval={approval} />
              ))}
            </section>
          )}
        </section>
      </AppShell>
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "승인 목록을 불러오지 못했습니다.";

    return (
      <AppShell>
        <section className="min-h-[calc(100vh-2rem)] rounded-[18px] border border-white/10 bg-[#05080B] p-5 text-white shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
          <header className="border-b border-white/10 pb-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-[#8EA0AE]">Approval Inbox</p>
            <h1 className="mt-2 text-2xl font-semibold text-white">승인함</h1>
            <p className="mt-2 text-sm leading-6 text-[#B7C2CC]">
              공식 반영 전 검토가 필요한 작업 결과를 확인합니다.
            </p>
          </header>

          <section role="alert" className="mt-5 rounded-[14px] border border-[#FF6B7A]/30 bg-[#2A1217] p-4 text-sm text-[#FF6B7A]">
            백엔드 API에 연결할 수 없습니다. 서버가 실행 중인지 확인하세요.
            <span className="mt-2 block text-xs text-[#AEB9C4]">{message}</span>
          </section>
        </section>
      </AppShell>
    );
  }
}
