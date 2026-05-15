import { ApprovalInbox } from "@/components/approval-inbox";
import { AppShell } from "@/components/app-shell";
import { listApprovals } from "@/lib/api";

type ApprovalsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ApprovalsPage({ searchParams }: ApprovalsPageProps = {}) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const highlightedApprovalId = firstParam(resolvedSearchParams.approvalId);

  try {
    const approvals = await listApprovals();
    const highlightedApproval = highlightedApprovalId
      ? approvals.find((approval) => approval.id === highlightedApprovalId)
      : null;

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

          {highlightedApprovalId ? (
            <section className="mt-5 rounded-[14px] border border-[#F2B84B]/35 bg-[#241C0F]/80 p-4 text-sm text-[#DDE6EE]">
              <p className="font-semibold text-[#FFD37A]">
                {highlightedApproval ? "대시보드에서 선택한 승인 항목을 표시합니다." : "선택한 승인 항목을 찾지 못했습니다."}
              </p>
              <p className="mt-1 text-xs leading-5 text-[#AEB9C4]">
                {highlightedApproval
                  ? `${highlightedApproval.title} 항목이 아래 목록에서 강조됩니다.`
                  : "승인 항목이 이미 처리되었거나 다른 작업공간에서 변경되었을 수 있습니다."}
              </p>
            </section>
          ) : null}

          <ApprovalInbox approvals={approvals} highlightedApprovalId={highlightedApprovalId} />
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
