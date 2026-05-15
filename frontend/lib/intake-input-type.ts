export const inputTypeLabels = {
  auto: "자동 감지",
  meeting_notes: "회의록",
  transcript: "상담 전사록",
  memo: "메모",
} as const;

export type ResolvedInputType = Exclude<keyof typeof inputTypeLabels, "auto">;
export type InputTypeMode = keyof typeof inputTypeLabels;

const transcriptSignals = [
  "상담자",
  "내담자",
  "상담",
  "전사록",
  "축어록",
  "발화",
  "상담 기록",
  "상담내용",
];

const meetingSignals = [
  "회의록",
  "회의",
  "안건",
  "결정사항",
  "논의",
  "참석자",
  "액션아이템",
  "action item",
];

function keywordScore(text: string, keywords: string[]) {
  const normalizedText = text.toLocaleLowerCase();
  return keywords.filter((keyword) => normalizedText.includes(keyword.toLocaleLowerCase())).length;
}

export function detectInputType(title: string, rawContent: string): ResolvedInputType {
  const text = `${title}\n${rawContent}`;
  const transcriptScore = keywordScore(text, transcriptSignals);
  const meetingScore = keywordScore(text, meetingSignals);

  if (
    transcriptScore >= 2 ||
    text.includes("전사록") ||
    (text.includes("상담자") && text.includes("내담자"))
  ) {
    return "transcript";
  }

  if (meetingScore >= 1) {
    return "meeting_notes";
  }

  return "memo";
}

export function resolveInputType(mode: InputTypeMode, title: string, rawContent: string): ResolvedInputType {
  if (mode === "auto") {
    return detectInputType(title, rawContent);
  }

  return mode;
}
