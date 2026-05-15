import { readFile, readdir } from "fs/promises";
import path from "path";

import { AppShell } from "@/components/app-shell";

type KnowledgeEntry = {
  title: string;
  path: string;
  description: string;
  kind: "official" | "source" | "guide";
};

const repoRoot = path.resolve(process.cwd(), "..");
const knowledgeRoot = path.join(repoRoot, "knowledge");

const sectionLabels: Record<KnowledgeEntry["kind"], string> = {
  official: "공식 지식",
  source: "원본 자료",
  guide: "에이전트 가이드",
};

export default async function MemoryPage() {
  const entries = await loadKnowledgeEntries();
  const entriesByKind = {
    official: entries.filter((entry) => entry.kind === "official"),
    source: entries.filter((entry) => entry.kind === "source"),
    guide: entries.filter((entry) => entry.kind === "guide"),
  };

  return (
    <AppShell>
      <section className="min-h-[calc(100vh-2rem)] rounded-[18px] border border-white/10 bg-[#05080B] p-5 text-white shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
        <header className="border-b border-white/10 pb-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-[#8EA0AE]">Memory</p>
          <h1 className="mt-2 text-2xl font-semibold text-white">메모리</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#B7C2CC]">
            로컬 `knowledge/` 폴더에 들어온 공식 검사 지식, 원본 보존 자료, 에이전트 작업 가이드를 확인합니다.
          </p>
        </header>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <MemoryStat label="공식 지식" value={entriesByKind.official.length} />
          <MemoryStat label="원본 자료" value={entriesByKind.source.length} />
          <MemoryStat label="에이전트 가이드" value={entriesByKind.guide.length} />
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-5">
            {(["official", "guide", "source"] as const).map((kind) => (
              <section key={kind} className="rounded-[14px] border border-white/10 bg-[#111820]/92 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h2 className="text-base font-semibold text-white">{sectionLabels[kind]}</h2>
                  <span className="rounded-full bg-white/[0.07] px-2 py-1 text-xs font-semibold text-[#AEB9C4]">
                    {entriesByKind[kind].length}개
                  </span>
                </div>
                <div className="grid gap-3 lg:grid-cols-2">
                  {entriesByKind[kind].map((entry) => (
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
            ))}
          </div>

          <aside className="rounded-[14px] border border-[#38BDF8]/25 bg-[#0B2535]/38 p-4">
            <h2 className="text-base font-semibold text-white">운영 원칙</h2>
            <div className="mt-3 space-y-3 text-sm leading-6 text-[#DDE6EE]">
              <p>공식 MASTER는 승인된 기준 지식으로 보고, 상담 사례 관찰과 섞지 않습니다.</p>
              <p>원본 자료는 추후 재추출과 검증을 위해 보존합니다.</p>
              <p>에이전트 작업 가이드는 실행 프롬프트 컨텍스트와 화면 설명의 기준으로 사용합니다.</p>
            </div>
          </aside>
        </div>
      </section>
    </AppShell>
  );
}

async function loadKnowledgeEntries(): Promise<KnowledgeEntry[]> {
  const markdownFiles = await listMarkdownFiles(knowledgeRoot);
  const entries = await Promise.all(
    markdownFiles.map(async (filePath) => {
      const content = await readFile(filePath, "utf-8");
      const relativePath = path.relative(repoRoot, filePath).replaceAll("\\", "/");
      return {
        title: readableTitle(content, relativePath),
        path: relativePath,
        description: firstMeaningfulParagraph(content),
        kind: classifyPath(relativePath),
      };
    }),
  );

  return entries.sort((a, b) => `${a.kind}:${a.path}`.localeCompare(`${b.kind}:${b.path}`, "ko"));
}

async function listMarkdownFiles(root: string): Promise<string[]> {
  const children = await readdir(root, { withFileTypes: true });
  const files = await Promise.all(
    children.map((child) => {
      const childPath = path.join(root, child.name);
      return child.isDirectory() ? listMarkdownFiles(childPath) : child.name.endsWith(".md") ? [childPath] : [];
    }),
  );

  return files.flat();
}

function classifyPath(relativePath: string): KnowledgeEntry["kind"] {
  if (relativePath.includes("/_sources/")) {
    return "source";
  }
  if (relativePath.includes("/agent-guides/")) {
    return "guide";
  }
  return "official";
}

function readableTitle(content: string, relativePath: string) {
  const heading = content.match(/^#\s+(.+)$/m)?.[1]?.trim();
  if (heading) {
    return heading;
  }

  return relativePath.split("/").at(-1)?.replace(/\.md$/, "") ?? relativePath;
}

function firstMeaningfulParagraph(content: string) {
  const withoutFrontmatter = content.replace(/^---[\s\S]*?---/, "");
  const paragraph = withoutFrontmatter
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .find((part) => part && !part.startsWith("#") && !part.startsWith("```"));

  if (!paragraph) {
    return "요약 문단이 아직 없습니다.";
  }

  return paragraph.replace(/\s+/g, " ").slice(0, 180);
}

function MemoryStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[12px] border border-white/10 bg-[#111820] p-4">
      <p className="text-xs font-semibold text-[#AEB9C4]">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}
