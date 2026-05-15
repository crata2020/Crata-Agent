"use client";

import { useMemo, useState } from "react";

export type MemoryEntryKind = "official" | "source" | "guide";

export type MemoryEntry = {
  title: string;
  path: string;
  description: string;
  kind: MemoryEntryKind;
};

const sectionLabels: Record<MemoryEntryKind, string> = {
  official: "공식 지식",
  source: "원본 자료",
  guide: "에이전트 가이드",
};

const filters: Array<{ label: string; value: "all" | MemoryEntryKind }> = [
  { label: "전체", value: "all" },
  { label: "공식 지식", value: "official" },
  { label: "에이전트 가이드", value: "guide" },
  { label: "원본 자료", value: "source" },
];

export function MemoryBrowser({ entries }: { entries: MemoryEntry[] }) {
  const [query, setQuery] = useState("");
  const [activeKind, setActiveKind] = useState<"all" | MemoryEntryKind>("all");

  const visibleEntries = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return entries.filter((entry) => {
      const matchesKind = activeKind === "all" || entry.kind === activeKind;
      const haystack = `${entry.title} ${entry.description} ${entry.path}`.toLowerCase();
      const matchesQuery = normalizedQuery.length === 0 || haystack.includes(normalizedQuery);
      return matchesKind && matchesQuery;
    });
  }, [activeKind, entries, query]);

  const entriesByKind = {
    official: visibleEntries.filter((entry) => entry.kind === "official"),
    guide: visibleEntries.filter((entry) => entry.kind === "guide"),
    source: visibleEntries.filter((entry) => entry.kind === "source"),
  };

  return (
    <section className="space-y-4">
      <div className="rounded-[14px] border border-white/10 bg-[#111820]/95 p-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <label className="block">
            <span className="text-xs font-semibold text-[#AEB9C4]">지식 검색</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="검사명, 에이전트, 파일 경로로 검색"
              className="mt-2 h-11 w-full rounded-[10px] border border-white/10 bg-black/24 px-3 text-sm text-white outline-none transition placeholder:text-[#687481] focus:border-[#38BDF8]"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => {
              const isActive = activeKind === filter.value;
              return (
                <button
                  key={filter.value}
                  type="button"
                  aria-label={filter.label}
                  onClick={() => setActiveKind(filter.value)}
                  className={`h-10 rounded-button border px-3 text-sm font-semibold transition ${
                    isActive
                      ? "border-[#FF5261]/50 bg-[#431C24] text-[#FF9AA4]"
                      : "border-white/10 bg-white/[0.06] text-[#C7D2DC] hover:bg-white/10"
                  }`}
                >
                  {filter.label}
                  <span aria-hidden="true" className="ml-2 text-xs opacity-70">
                    {filter.value === "all"
                      ? entries.length
                      : entries.filter((entry) => entry.kind === filter.value).length}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {visibleEntries.length > 0 ? (
        (["official", "guide", "source"] as const).map((kind) => (
          <KnowledgeSection key={kind} kind={kind} entries={entriesByKind[kind]} />
        ))
      ) : (
        <div className="rounded-[14px] border border-white/10 bg-[#111820] p-6 text-sm leading-6 text-[#C7D2DC]">
          검색 조건에 맞는 지식 파일이 없습니다.
        </div>
      )}
    </section>
  );
}

function KnowledgeSection({ kind, entries }: { kind: MemoryEntryKind; entries: MemoryEntry[] }) {
  if (entries.length === 0) {
    return null;
  }

  return (
    <section className="rounded-[14px] border border-white/10 bg-[#111820]/92 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-white">{sectionLabels[kind]}</h2>
        <span className="rounded-full bg-white/[0.07] px-2 py-1 text-xs font-semibold text-[#AEB9C4]">
          {entries.length}개
        </span>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {entries.map((entry) => (
          <article key={entry.path} className="rounded-[12px] border border-white/10 bg-black/20 p-4">
            <p className="text-sm font-semibold text-white">{entry.title}</p>
            <p className="mt-2 text-sm leading-6 text-[#C7D2DC]">{entry.description}</p>
            <code className="mt-3 block rounded-[8px] bg-white/[0.06] px-3 py-2 text-xs text-[#9FB0BF]">
              {entry.path}
            </code>
          </article>
        ))}
      </div>
    </section>
  );
}
