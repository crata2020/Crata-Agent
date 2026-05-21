const INTERNAL_HEADING_KEYWORDS = [
  "작업 후보",
  "작업 유형",
  "작업 정리",
  "작업 목표 요약",
  "다음 확인 질문",
  "검수 메모",
  "참조한 컨텍스트",
  "참조 파일",
  "CRATA 지식 컨텍스트",
  "사용자 작업",
];

const OFFICIAL_APPROVAL_TASK_TYPES = new Set([
  "report_phrase_revision",
  "counseling_case_learning",
  "relationship_pattern_analysis",
]);

type MarkdownSection = {
  heading: string | null;
  lines: string[];
};

export function getAssistantAnswerContent(content: string, fallback = "") {
  const normalized = content.replace(/\r\n/g, "\n").trim();
  if (!normalized) {
    return fallback.trim();
  }

  const visibleSections = splitMarkdownSections(normalized).filter((section) => {
    if (!section.heading) {
      return section.lines.some((line) => line.trim());
    }

    return !isInternalHeading(section.heading);
  });

  const visibleContent = visibleSections
    .map((section) => section.lines.join("\n").trim())
    .filter(Boolean)
    .join("\n\n")
    .trim();

  return visibleContent || fallback.trim();
}

export function shouldShowApprovalControls(taskType: string) {
  return OFFICIAL_APPROVAL_TASK_TYPES.has(taskType);
}

function splitMarkdownSections(content: string): MarkdownSection[] {
  const sections: MarkdownSection[] = [];
  let current: MarkdownSection = { heading: null, lines: [] };

  for (const line of content.split("\n")) {
    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      if (current.lines.length > 0) {
        sections.push(current);
      }
      current = { heading: heading[2].trim(), lines: [line] };
      continue;
    }

    current.lines.push(line);
  }

  if (current.lines.length > 0) {
    sections.push(current);
  }

  return sections;
}

function isInternalHeading(heading: string) {
  const normalizedHeading = heading.replace(/\*/g, "").trim();
  return INTERNAL_HEADING_KEYWORDS.some((keyword) => normalizedHeading.includes(keyword));
}
