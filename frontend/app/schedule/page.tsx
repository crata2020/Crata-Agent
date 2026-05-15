import { AppShell } from "@/components/app-shell";

const routines = [
  {
    time: "09:00",
    title: "데일리 승인 점검",
    owners: ["운영비서", "품질검수관"],
    cadence: "매일",
    mode: "수동 실행",
    description: "승인함에 쌓인 공식 지식 반영 후보, 결과지 문구 후보, 상담 사례 후보를 먼저 검토합니다.",
  },
  {
    time: "11:00",
    title: "지식 반영 후보 검토",
    owners: ["개념수호자", "사례학습가"],
    cadence: "월/수/금",
    mode: "수동 실행",
    description: "상담 전사록과 회의록에서 나온 반복 패턴이 공식 MASTER에 들어갈 내용인지 분리합니다.",
  },
  {
    time: "14:00",
    title: "기획 후보 정리",
    owners: ["사업설계자", "개념수호자"],
    cadence: "필요 시",
    mode: "수동 실행",
    description: "기관, 문제, 목적, 성과, 예산, 일정, 검사 활용 방식이 충분히 파악됐는지 확인합니다.",
  },
  {
    time: "17:30",
    title: "콘텐츠 브리핑",
    owners: ["콘텐츠전략가", "운영비서"],
    cadence: "화/목",
    mode: "수동 실행",
    description: "블로그, 유튜브, 홈페이지 문구 후보를 정리하고 금지 표현과 전환 목표를 점검합니다.",
  },
];

export default function SchedulePage() {
  return (
    <AppShell>
      <section className="min-h-[calc(100vh-2rem)] rounded-[18px] border border-white/10 bg-[#05080B] p-5 text-white shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
        <header className="border-b border-white/10 pb-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-[#8EA0AE]">Office Routine</p>
          <h1 className="mt-2 text-2xl font-semibold text-white">스케줄</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#B7C2CC]">
            자동화가 붙기 전까지는 반복 운영 루틴을 로컬 계획판으로 관리합니다. 각 루틴은 나중에 n8n, cron,
            텔레그램 보고로 연결할 수 있습니다.
          </p>
        </header>

        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-3">
            {routines.map((routine) => (
              <article key={routine.title} className="rounded-[14px] border border-white/10 bg-[#111820]/95 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-[#38BDF8]/12 px-2.5 py-1 text-xs font-semibold text-[#67D4FF]">
                        {routine.time}
                      </span>
                      <span className="rounded-full bg-white/[0.07] px-2.5 py-1 text-xs font-semibold text-[#AEB9C4]">
                        {routine.cadence}
                      </span>
                      <span className="rounded-full bg-[#F2B84B]/12 px-2.5 py-1 text-xs font-semibold text-[#F2B84B]">
                        {routine.mode}
                      </span>
                    </div>
                    <h2 className="mt-3 text-lg font-semibold text-white">{routine.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-[#C7D2DC]">{routine.description}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 md:max-w-[260px] md:justify-end">
                    {routine.owners.map((owner) => (
                      <span key={owner} className="rounded-full border border-white/10 px-2.5 py-1 text-xs font-semibold text-[#DDE6EE]">
                        {owner}
                      </span>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>

          <aside className="rounded-[14px] border border-[#38BDF8]/25 bg-[#0B2535]/38 p-4">
            <h2 className="text-base font-semibold text-white">다음 연결 기준</h2>
            <div className="mt-3 space-y-3 text-sm leading-6 text-[#DDE6EE]">
              <p>루틴이 안정되면 운영비서가 텔레그램 브리핑으로 요약합니다.</p>
              <p>반복 실행이 필요한 루틴만 n8n 또는 cron에 연결합니다.</p>
              <p>공식 지식 반영은 항상 승인함을 거친 뒤 MASTER에 반영합니다.</p>
            </div>
          </aside>
        </div>
      </section>
    </AppShell>
  );
}
