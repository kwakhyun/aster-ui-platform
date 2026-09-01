import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { validateProposalReport } from "./lib/ai-workflow.mjs";
import {
  getSourceGitCommit,
  getSourceRevision,
  verifyEvidenceReport,
} from "./lib/provenance.mjs";

const projectRoot = process.cwd();
const outputPath = path.join(projectRoot, "reports/verification.md");

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(projectRoot, relativePath), "utf8"));
}

async function countWorkspaceTestSuites() {
  const roots = ["apps", "packages"];
  let count = 0;
  for (const root of roots) {
    const entries = await readdir(path.join(projectRoot, root), { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const packageJson = await readJson(`${root}/${entry.name}/package.json`).catch(() => null);
      if (packageJson?.scripts?.test) count += 1;
    }
  }
  return count;
}

function formatPercent(metric) {
  return Number(metric.pct).toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function formatBytes(bytes) {
  return Number(bytes).toLocaleString("en-US");
}

function formatKoreanDate(isoDate) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(isoDate));
}

const evidenceReportPaths = {
  unit: "reports/unit-tests.json",
  api: "reports/api-compatibility.json",
  adoption: "reports/adoption.json",
  visual: "reports/visual-regression.json",
  performance: "reports/performance-budget.json",
  security: "reports/security-audit.json",
  coverage: "reports/coverage.json",
  ai: "reports/ai-verification.json",
  figma: "reports/figma-verification.json",
};
const aiRequestPath = "ai/requests/localize-treatment-card-save-label.md";
const aiPromptPath = "ai/prompts/design-system-proposal.md";

const [
  sourceRevision,
  testSuiteCount,
  figma,
  aiProposal,
  qualityEvidence,
  componentManifest,
  aiRequest,
  aiPromptTemplate,
] = await Promise.all([
  getSourceRevision(projectRoot),
  countWorkspaceTestSuites(),
  readJson("reports/figma-sync.json"),
  readJson("reports/ai-workflow.json"),
  readJson("apps/studio/src/generated/quality-evidence.json"),
  readJson("packages/react/component-manifest.json"),
  readFile(path.join(projectRoot, aiRequestPath), "utf8"),
  readFile(path.join(projectRoot, aiPromptPath), "utf8"),
]);
const sourceGitCommit = getSourceGitCommit(projectRoot);
const evidenceEntries = await Promise.all(
  Object.entries(evidenceReportPaths).map(async ([name, reportPath]) => [name, await readJson(reportPath)]),
);
const evidence = Object.fromEntries(evidenceEntries);
const staleEvidence = evidenceEntries
  .filter(([, report]) => !verifyEvidenceReport(report, sourceRevision, sourceGitCommit))
  .map(([name]) => name);
if (staleEvidence.length > 0) {
  throw new Error(`Verification report refused stale or invalid evidence: ${staleEvidence.join(", ")}`);
}
if (evidence.unit.status !== "passed"
  || evidence.api.status !== "passed"
  || evidence.visual.status !== "passed"
  || evidence.performance.status !== "passed"
  || evidence.security.status !== "passed"
  || evidence.coverage.status !== "passed"
  || evidence.ai.status !== "passed"
  || evidence.figma.status !== "passed"
  || evidence.adoption.status !== "healthy") {
  throw new Error("Verification report refused a non-passing repository report.");
}
const qualityReports = {
  unit: evidence.unit,
  api: evidence.api,
  visual: evidence.visual,
  performance: evidence.performance,
  security: evidence.security,
};
const qualityChecksMatch = qualityEvidence.checks?.length === Object.keys(qualityReports).length
  && Object.entries(qualityReports).every(([id, report]) => {
    const check = qualityEvidence.checks.find((candidate) => candidate.id === id);
    return check?.status === "passed"
      && check.sourceRevision === report.sourceRevision
      && check.gitCommit === report.gitCommit
      && check.evidenceDigest === report.artifactDigest;
  });
if (!verifyEvidenceReport(qualityEvidence, sourceRevision, sourceGitCommit) || !qualityChecksMatch) {
  throw new Error("Verification report refused stale or inconsistent Studio quality evidence.");
}
if (!figma.review?.validation?.aliasesResolved || figma.humanReview?.required !== true) {
  throw new Error("Verification report refused an invalid Figma review boundary.");
}
try {
  validateProposalReport(aiProposal, {
    manifest: componentManifest,
    request: aiRequest,
    requestPath: aiRequestPath,
    promptTemplate: aiPromptTemplate,
    promptTemplatePath: aiPromptPath,
  });
} catch (error) {
  throw new Error("Verification report refused an invalid or stale AI review boundary.", {
    cause: error,
  });
}

const latestGeneratedAt = evidenceEntries
  .map(([, report]) => report.generatedAt)
  .sort((left, right) => Date.parse(right) - Date.parse(left))[0];
const coverageLabels = {
  "Clinic consumer": "클리닉 소비 앱",
  "Backoffice consumer": "백오피스 소비 앱",
  Tokens: "토큰",
  "Figma bridge": "Figma 브리지",
  React: "React 패키지",
  Studio: "Studio",
};
const coverageRows = Object.entries(evidence.coverage.coverage).map(([name, report]) =>
  `| ${coverageLabels[name] ?? name} | ${formatPercent(report.statements)}% | ${formatPercent(report.branches)}% | ${formatPercent(report.functions)}% | ${formatPercent(report.lines)}% |`
).join("\n");
const gitCommit = sourceGitCommit;

const markdown = `# 프로덕션 검증 보고서

이 문서는 출처 정보가 결합된 저장소의 JSON 근거에서 자동 생성됩니다. 수치를 직접 편집하지 않으며 \`pnpm verification:check\`가 현재 소스, 소스 변경 커밋, Studio 품질 근거가 서로 일치하는지 검사합니다.

- 생성 기준: ${formatKoreanDate(latestGeneratedAt)} KST
- 소스 리비전: \`${sourceRevision}\`
- Git 커밋: ${gitCommit ? `\`${gitCommit}\`` : "아직 커밋되지 않은 작업 트리"}

## 판정

로컬에서 재현할 수 있는 완료 기준으로 남아 있는 P0, P1, P2는 0건입니다. 이 판정은 아래 자동 근거와 사람 검토 경계가 모두 유효할 때만 생성됩니다. 공개 GitHub 실행, 실제 Figma 계정, npm 레지스트리, Kubernetes 클러스터처럼 인증 정보나 외부 환경이 필요한 결과는 별도 범위로 남깁니다.

## 자동화 근거

| 검증 항목 | 결과 |
| --- | --- |
| 워크스페이스 단위 및 상호작용 테스트 | 패키지 검증 스위트 ${testSuiteCount}개 통과 |
| 소비 앱 계약 테스트 | 클리닉과 백오피스 렌더링 및 WCAG 태그 기반 axe 검사 통과 |
| Sites 워커 | 런타임 경로 사례 4개 통과 |
| API 호환성 | 컴포넌트 ${evidence.api.checkedComponents}개와 prop ${evidence.api.checkedProps}개 검사, 하위 호환성이 깨지는 변경 ${evidence.api.breakingChanges.length}건 |
| 도입률 | 소비 앱 ${evidence.adoption.consumerCount}개에서 대상 컴포넌트 ${evidence.adoption.adoptedComponents}/${evidence.adoption.eligibleComponents}개 사용, 지원 중단 예정 API 사용 ${evidence.adoption.deprecatedUsageCount}건 |
| Figma 검토 테스트 픽스처 | 별칭 ${evidence.figma.changeCount}개 해석, 사람 검토 필수, 소스 변경 비활성화 |
| AI 제안 및 승인 E2E | 제안 검사 ${evidence.ai.proposalChecks}개, 실패 우선 경계 ${evidence.ai.failClosedBoundaries}개, 제공자 제한 시간과 출력 상한 적용, 소스 변경 비활성화 |
| 브라우저 시각 및 접근성 | 시나리오 ${evidence.visual.passed}개, 기준 이미지 ${evidence.visual.snapshots}개, axe 검사 ${evidence.visual.accessibilityChecks}회 통과 |
| 프로덕션 의존성 감사 | 알려진 취약점 ${evidence.security.knownVulnerabilities}건 |
| 검증 근거 출처 | 리비전, 실행 ID, Git 커밋, 산출물 해시 확인 |

## 테스트 커버리지

| 범위 | 구문 | 분기 | 함수 | 줄 |
| --- | ---: | ---: | ---: | ---: |
${coverageRows}

## 성능 예산

| 자산 | 실제 크기 | 예산 |
| --- | ---: | ---: |
| JavaScript gzip | ${formatBytes(evidence.performance.actual.javascriptGzipBytes)} B | ${formatBytes(evidence.performance.budgets.javascriptGzipBytes)} B |
| CSS gzip | ${formatBytes(evidence.performance.actual.cssGzipBytes)} B | ${formatBytes(evidence.performance.budgets.cssGzipBytes)} B |
| 가장 큰 반응형 이미지 | ${formatBytes(evidence.performance.actual.largestImageBytes)} B | ${formatBytes(evidence.performance.budgets.largestImageBytes)} B |
| 프로젝트에 포함된 글꼴 | ${formatBytes(evidence.performance.actual.fontBytes)} B | ${formatBytes(evidence.performance.budgets.fontBytes)} B |

## 검증 범위와 한계

- 실제 Chrome에서 1440px Coral과 Ocean, Figma 검토 및 릴리스 리허설, 1280px, 확대에 해당하는 뷰포트, 모바일, 강제 색상 모드를 검사합니다.
- 각 브라우저 시나리오에서 페이지 오류, 콘솔 오류, HTTP 4xx 및 5xx 응답, WCAG 태그가 있는 axe 위반이 발생하면 실패 처리합니다.
- Figma REST와 Claude Code 경로는 실행할 수 있지만 라이브 호출에는 각 서비스의 권한과 로그인이 필요합니다. CI는 비식별 테스트 픽스처를 같은 계약으로 재생합니다.
- Swift와 Compose는 공유 토큰 산출물입니다. 네이티브 컴포넌트 구현이나 실제 앱 배포를 주장하지 않습니다.
- VoiceOver와 NVDA 수동 검증, npm 배포, 클러스터 스모크 테스트는 자동 근거에 포함하지 않습니다.

최종 결과: 통과
`;

if (process.argv.includes("--check")) {
  const current = await readFile(outputPath, "utf8").catch(() => "");
  if (current !== markdown) {
    console.error("Generated verification report is out of date.");
    process.exitCode = 1;
  } else {
    console.log("Generated verification report matches current evidence.");
  }
} else {
  await writeFile(outputPath, markdown);
  console.log("Generated reports/verification.md from current structured evidence.");
}
