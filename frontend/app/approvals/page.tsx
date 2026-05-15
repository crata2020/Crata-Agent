import { ApprovalCard } from "@/components/approval-card";
import { AppShell } from "@/components/app-shell";
import { listApprovals } from "@/lib/api";

export default async function ApprovalsPage() {
  try {
    const approvals = await listApprovals();

    return (
      <AppShell>
        <div className="space-y-5">
          <header className="border-b border-border pb-5">
            <h1 className="text-2xl font-semibold text-[#1F2723]">Approval Inbox</h1>
            <p className="mt-2 text-sm leading-6 text-[#5F6B64]">
              공식 반영 전 검토가 필요한 작업 결과를 확인합니다.
            </p>
          </header>

          {approvals.length === 0 ? (
            <section className="rounded-card border border-border bg-surface p-6 text-sm text-[#5F6B64]">
              승인대기 항목이 없습니다.
            </section>
          ) : (
            <section className="space-y-3" aria-label="승인 항목">
              {approvals.map((approval) => (
                <ApprovalCard key={approval.id} approval={approval} />
              ))}
            </section>
          )}
        </div>
      </AppShell>
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "승인 목록을 불러오지 못했습니다.";

    return (
      <AppShell>
        <div className="space-y-5">
          <header className="border-b border-border pb-5">
            <h1 className="text-2xl font-semibold text-[#1F2723]">Approval Inbox</h1>
            <p className="mt-2 text-sm leading-6 text-[#5F6B64]">
              공식 반영 전 검토가 필요한 작업 결과를 확인합니다.
            </p>
          </header>

          <section role="alert" className="rounded-card border border-danger/30 bg-red-50 p-4 text-sm text-danger">
            백엔드 API에 연결할 수 없습니다. 서버가 실행 중인지 확인하세요.
            <span className="mt-2 block text-xs text-[#5F6B64]">{message}</span>
          </section>
        </div>
      </AppShell>
    );
  }
}
