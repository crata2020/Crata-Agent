import { AppShell } from "@/components/app-shell";

const costRows = [
  {
    label: "로컬 모델",
    status: "현재 MVP 기준",
    estimate: "0원",
    note: "LM Studio 또는 Ollama를 쓰는 전제입니다. 품질 한계가 보이면 외부 API를 선택적으로 붙입니다.",
  },
  {
    label: "외부 LLM API",
    status: "추적 준비",
    estimate: "미사용",
    note: "고품질 기획서, 긴 상담 전사록, 대량 문서 분석 단계에서만 선택적으로 쓰는 비용 항목입니다.",
  },
  {
    label: "Docker DB",
    status: "로컬 실행",
    estimate: "0원",
    note: "Postgres, Neo4j, Vector DB를 로컬 Docker로 운용하는 전제입니다. 클라우드 전환 시 별도 추적합니다.",
  },
  {
    label: "알림/자동화",
    status: "연결 전",
    estimate: "0원",
    note: "텔레그램, n8n, cron 루틴은 로컬 중심으로 시작하고 외부 SaaS 사용량은 나중에 기록합니다.",
  },
];

export default function CostsPage() {
  return (
    <AppShell>
      <section className="min-h-[calc(100vh-2rem)] rounded-[18px] border border-white/10 bg-[#05080B] p-5 text-white shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
        <header className="border-b border-white/10 pb-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-[#8EA0AE]">Cost Control</p>
          <h1 className="mt-2 text-2xl font-semibold text-white">비용</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#B7C2CC]">
            CRATA Office는 로컬 우선으로 시작합니다. 실제 과금이 생기는 항목은 나중에 실행 로그와 연결해 추적합니다.
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
              <p>반복 작업은 로컬 모델로 먼저 처리합니다.</p>
              <p>품질이 중요한 대외 문서만 외부 LLM API 후보로 분리합니다.</p>
              <p>나중에 실행 로그별 토큰, 모델, 비용을 이 화면에 연결합니다.</p>
            </div>
          </aside>
        </div>
      </section>
    </AppShell>
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
