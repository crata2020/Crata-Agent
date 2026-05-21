import { ApprovalInbox } from "@/components/approval-inbox";

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
      <>
        <section className="flex h-full flex-col overflow-hidden text-white">
          <header className="flex shrink-0 flex-col gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h1 className="text-xl font-semibold tracking-[-0.02em] text-white">승인함</h1>
                <p className="mt-1 text-xs font-medium text-[#77777F]">
                  {approvals.length}개 항목 · 공식 반영 전 검토 큐
                </p>
              </div>
              <div className="rounded-button bg-[var(--color-danger-soft)] px-3 py-2 text-xs font-medium text-[var(--color-danger)]">
                승인 전 공식 지식 반영 금지
              </div>
          </header>

            {highlightedApprovalId ? (
              <section className="mx-4 mt-3 rounded-[8px] border border-[#F2B84B]/35 bg-[#241C0F]/80 px-3 py-2 text-sm text-[#DDE6EE]">
                <p className="font-semibold text-[#FFD37A]">
                  {highlightedApproval ? "대시보드에서 선택한 승인 항목을 표시합니다." : "선택한 승인 항목을 찾지 못했습니다."}
                </p>
                <p className="mt-0.5 text-xs leading-5 text-[#AEB9C4]">
                  {highlightedApproval
                    ? `${highlightedApproval.title} 항목이 아래 목록에서 강조됩니다.`
                    : "승인 항목이 이미 처리되었거나 다른 작업공간에서 변경되었을 수 있습니다."}
                </p>
              </section>
            ) : null}

            <ApprovalInbox approvals={approvals} highlightedApprovalId={highlightedApprovalId} />
        </section>
      </>
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "승인 목록을 불러오지 못했습니다.";

    return (
      <>
        <section className="h-full p-4 text-white">
          <header className="border-b border-white/10 pb-3">
            <h1 className="text-xl font-semibold text-white">승인함</h1>
            <p className="mt-1 text-sm leading-5 text-[#B7C2CC]">
              공식 반영 전 검토가 필요한 작업 결과를 확인합니다.
            </p>
          </header>

          <section role="alert" className="mt-5 rounded-[14px] border border-[#FF6B7A]/30 bg-[#2A1217] p-4 text-sm text-[#FF6B7A]">
            백엔드 API에 연결할 수 없습니다. 서버가 실행 중인지 확인하세요.
            <span className="mt-2 block text-xs text-[#AEB9C4]">{message}</span>
          </section>
        </section>
      </>
    );
  }
}
