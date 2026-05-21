

const costRows = [
  {
    label: "외부 LLM API",
    status: "추적 준비",
    estimate: "미사용",
    note: "에이전트가 사용하는 주요 대형언어모델(LLM) API 토큰 비용을 기록하고 추적합니다.",
  },
  {
    label: "클라우드 인프라 (DB)",
    status: "클라우드",
    estimate: "추적 준비",
    note: "Postgres, Vector DB 등 클라우드에서 운용되는 인프라 비용을 기록합니다.",
  },
  {
    label: "알림/자동화",
    status: "연결 전",
    estimate: "0원",
    note: "텔레그램, 외부 SaaS 연동 등 통신 및 워크플로우 자동화 서비스 비용입니다.",
  },
];

export default function CostsPage() {
  return (
    <>
      <section className="min-h-[calc(100vh-2rem)] rounded-[18px] border border-white/10 bg-[#05080B] p-5 text-white shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
        <header className="border-b border-white/10 pb-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-[#8EA0AE]">비용 통제</p>
          <h1 className="mt-2 text-2xl font-semibold text-white">비용</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#B7C2CC]">
            실제 에이전트 실행 과정에서 발생하는 API 과금을 기록하고 관리하는 공간입니다. 실행 로그와 연결해 정확한 비용을 추적합니다.
          </p>
        </header>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <CostStat label="이번 MVP 예상" value="0원" />
          <CostStat label="외부 API 사용" value="없음" />
          <CostStat label="추적 방식" value="준비" />
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="rounded-[14px] border border-white/10 bg-[#111820]/95">
            {costRows.map((row, index) => (
              <article
                key={row.label}
                className={`grid gap-3 p-4 md:grid-cols-[180px_120px_120px_minmax(0,1fr)] md:items-center ${
                  index > 0 ? "border-t border-white/10" : ""
                }`}
              >
                <h2 className="text-sm font-semibold text-white">{row.label}</h2>
                <span className="w-fit rounded-full bg-[#38BDF8]/12 px-2.5 py-1 text-xs font-semibold text-[#67D4FF]">
                  {row.status}
                </span>
                <strong className="text-lg font-semibold text-[#F2B84B]">{row.estimate}</strong>
                <p className="text-sm leading-6 text-[#C7D2DC]">{row.note}</p>
              </article>
            ))}
          </div>

          <aside className="rounded-[14px] border border-[#38BDF8]/25 bg-[#0B2535]/38 p-4">
            <h2 className="text-base font-semibold text-white">운영 기준</h2>
            <div className="mt-3 space-y-3 text-sm leading-6 text-[#DDE6EE]">
              <p>각 에이전트 작업별 토큰 소비량을 추적합니다.</p>
              <p>LLM API 모델 종류에 따라 비용을 차등 계산하여 표시합니다.</p>
              <p>나중에 실행 로그(Activity)의 상세 과금 내역을 이 화면에 연결합니다.</p>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}

function CostStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[12px] border border-white/10 bg-[#111820] p-4">
      <p className="text-xs font-semibold text-[#AEB9C4]">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}
