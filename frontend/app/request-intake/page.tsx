import RequestIntakeWorkspace from "./request-intake-workspace";

type RequestIntakePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function RequestIntakePage({ searchParams }: RequestIntakePageProps = {}) {
  const resolvedSearchParams = searchParams ? await searchParams : {};

  return (
    <RequestIntakeWorkspace
      linkedCandidateId={firstParam(resolvedSearchParams.candidateId) ?? null}
    />
  );
}
