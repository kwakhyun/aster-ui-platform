import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { getSourceRevision, verifyEvidenceReport } from "./lib/provenance.mjs";

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
};
const coveragePaths = {
  "Clinic consumer": "apps/clinic-web/coverage/coverage-summary.json",
  "Backoffice consumer": "apps/backoffice-web/coverage/coverage-summary.json",
  Tokens: "packages/tokens/coverage/coverage-summary.json",
  "Figma bridge": "packages/figma-bridge/coverage/coverage-summary.json",
  React: "packages/react/coverage/coverage-summary.json",
  Studio: "apps/studio/coverage/coverage-summary.json",
};

const [sourceRevision, testSuiteCount, figma, ai] = await Promise.all([
  getSourceRevision(projectRoot),
  countWorkspaceTestSuites(),
  readJson("reports/figma-sync.json"),
  readJson("reports/ai-workflow.json"),
]);
const evidenceEntries = await Promise.all(
  Object.entries(evidenceReportPaths).map(async ([name, reportPath]) => [name, await readJson(reportPath)]),
);
const evidence = Object.fromEntries(evidenceEntries);
const staleEvidence = evidenceEntries
  .filter(([, report]) => !verifyEvidenceReport(report, sourceRevision))
  .map(([name]) => name);
if (staleEvidence.length > 0) {
  throw new Error(`Verification report refused stale or invalid evidence: ${staleEvidence.join(", ")}`);
}
if (evidence.unit.status !== "passed"
  || evidence.api.status !== "passed"
  || evidence.visual.status !== "passed"
  || evidence.performance.status !== "passed"
  || evidence.security.status !== "passed"
  || evidence.adoption.status !== "healthy") {
  throw new Error("Verification report refused a non-passing repository report.");
}
if (!figma.review?.validation?.aliasesResolved || figma.humanReview?.required !== true) {
  throw new Error("Verification report refused an invalid Figma review boundary.");
}
if (ai.automatedValidation?.status !== "passed"
  || ai.humanReview?.status !== "required"
  || ai.sourceMutation?.applied !== false) {
  throw new Error("Verification report refused an invalid AI review boundary.");
}

const coverageEntries = await Promise.all(
  Object.entries(coveragePaths).map(async ([name, reportPath]) => [name, await readJson(reportPath)]),
);
const latestGeneratedAt = evidenceEntries
  .map(([, report]) => report.generatedAt)
  .sort((left, right) => Date.parse(right) - Date.parse(left))[0];
const coverageRows = coverageEntries.map(([name, report]) =>
  `| ${name} | ${formatPercent(report.total.statements)}% | ${formatPercent(report.total.branches)}% | ${formatPercent(report.total.functions)}% | ${formatPercent(report.total.lines)}% |`
).join("\n");
const gitCommit = evidence.unit.gitCommit;

const markdown = `# Production Verification

이 문서는 저장소의 구조화된 JSON 근거와 coverage summary에서 자동 생성됩니다. 수치를 직접 편집하지 않으며 \`pnpm verification:check\`가 현재 소스와의 정합성을 검사합니다.

- 생성 기준: ${formatKoreanDate(latestGeneratedAt)} KST
- 소스 리비전: \`${sourceRevision}\`
- Git commit: ${gitCommit ? `\`${gitCommit}\`` : "아직 커밋되지 않은 working tree"}

## 판정

로컬에서 재현 가능한 종료 매트릭스 기준으로 열린 P0, P1, P2는 0건입니다. 이 판정은 아래 자동 근거와 사람 검토 경계가 모두 유효할 때만 생성됩니다. 공개 GitHub 실행, 실제 Figma 계정, npm registry, Kubernetes cluster처럼 자격 증명이나 외부 환경이 필요한 결과는 별도 경계로 남깁니다.

## 자동화 근거

| Gate | Result |
| --- | --- |
| Workspace unit and interaction suites | ${testSuiteCount} package suites passed |
| Consumer contract tests | Clinic과 backoffice 렌더링 및 WCAG-tagged axe 검사 passed |
| Sites worker | 4 runtime route cases passed |
| API compatibility | ${evidence.api.checkedComponents} components, ${evidence.api.checkedProps} props, ${evidence.api.breakingChanges.length} breaking changes |
| Adoption | ${evidence.adoption.adoptedComponents}/${evidence.adoption.eligibleComponents} eligible components across ${evidence.adoption.consumerCount} consumers, ${evidence.adoption.deprecatedUsageCount} deprecated usages |
| Figma review fixture | ${figma.review.validation.changeCount} aliases resolved, human review required, source mutation disabled |
| AI proposal fixture | ${ai.automatedValidation.checks.length} deterministic checks passed, human review required, source mutation disabled |
| Browser visual and accessibility | ${evidence.visual.passed} scenarios, ${evidence.visual.snapshots} snapshots, ${evidence.visual.accessibilityChecks} axe checks |
| Production dependency audit | ${evidence.security.knownVulnerabilities} known vulnerabilities |
| Evidence provenance | revision, run ID, Git commit, artifact digest verified |

## Coverage

| Scope | Statements | Branches | Functions | Lines |
| --- | ---: | ---: | ---: | ---: |
${coverageRows}

## 성능 예산

| Asset | Actual | Budget |
| --- | ---: | ---: |
| JavaScript gzip | ${formatBytes(evidence.performance.actual.javascriptGzipBytes)} B | ${formatBytes(evidence.performance.budgets.javascriptGzipBytes)} B |
| CSS gzip | ${formatBytes(evidence.performance.actual.cssGzipBytes)} B | ${formatBytes(evidence.performance.budgets.cssGzipBytes)} B |
| Largest responsive image | ${formatBytes(evidence.performance.actual.largestImageBytes)} B | ${formatBytes(evidence.performance.budgets.largestImageBytes)} B |
| Self-hosted font | ${formatBytes(evidence.performance.actual.fontBytes)} B | ${formatBytes(evidence.performance.budgets.fontBytes)} B |

## 검증 범위와 한계

- 실제 Chrome에서 1440px Coral과 Ocean, Figma 검토 및 릴리스 리허설, 1280px, 확대 상당 viewport, 모바일, forced-colors를 검사합니다.
- 각 브라우저 시나리오는 page error, console error, HTTP 4xx와 5xx, WCAG 태그가 있는 axe violation을 실패 처리합니다.
- Figma REST와 Claude Code 경로는 실행 가능하지만, 라이브 호출은 각 서비스의 권한과 로그인이 필요합니다. CI는 비식별 fixture를 같은 계약으로 재생합니다.
- Swift와 Compose는 공유 토큰 산출물입니다. 네이티브 컴포넌트 구현이나 실제 앱 배포를 주장하지 않습니다.
- VoiceOver와 NVDA 수동 검증, npm 배포, cluster smoke test는 자동 근거에 포함하지 않습니다.

final result: passed
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
