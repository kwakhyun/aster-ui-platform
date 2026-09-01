import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const projectRoot = process.cwd();
const manifestPath = path.join(projectRoot, "packages/react/component-manifest.json");
const outputDirectory = path.join(projectRoot, "docs/generated");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

const evidenceLabels = {
  unit: "단위 테스트",
  apiCompatibility: "API 호환성",
  browserAccessibility: "브라우저 접근성",
};
const evidenceRows = Object.entries(manifest.requiredEvidence)
  .map(([name, command]) => `- ${evidenceLabels[name] ?? name}: \`${command}\``)
  .join("\n");

function renderComponent(component) {
  const rows = component.props
    .map(
      (prop) =>
        `| \`${prop.name}\` | \`${prop.type}\` | ${prop.required ? "예" : "아니요"} | ${
          prop.default === null ? "—" : `\`${String(prop.default)}\``
        } |`,
    )
    .join("\n");

  return `# ${component.name}\n\n> \`packages/react/component-manifest.json\`에서 자동 생성된 문서입니다. 직접 수정하지 마세요.\n\n${component.description}\n\n- 패키지: \`${manifest.package}\`\n- 버전: \`${manifest.version}\`\n- 상태: ${component.status}\n- 분류: ${component.category}\n- 지원 플랫폼: ${component.platforms.join(", ")}\n- 토큰 산출물: ${manifest.crossPlatformTokenArtifacts.join(", ")}\n- HTML 속성 계약: \`${component.extendsElementAttributes}\`\n- ref 대상: \`${component.forwardsRef}\`\n\n## 공개 API\n\n| Prop | 타입 | 필수 | 기본값 |\n| --- | --- | --- | --- |\n${rows || "| — | — | — | — |"}\n\n## 필수 검증 명령\n\n${evidenceRows}\n`;
}

const documents = new Map(
  manifest.components.map((component) => [
    path.join(outputDirectory, `${component.name}.md`),
    renderComponent(component),
  ]),
);
const indexRows = manifest.components
  .map((component) => `| [${component.name}](./${component.name}.md) | ${component.category} | ${component.status} | ${component.props.length} |`)
  .join("\n");
documents.set(
  path.join(outputDirectory, "index.md"),
  `# @aster-ui/react 컴포넌트 목록\n\n> 컴포넌트 레지스트리에서 자동 생성된 문서입니다.\n\n| 컴포넌트 | 분류 | 상태 | 공개 prop 수 |\n| --- | --- | --- | ---: |\n${indexRows}\n`,
);

if (process.argv.includes("--check")) {
  const stale = [];
  for (const [outputPath, output] of documents) {
    const current = await readFile(outputPath, "utf8").catch(() => "");
    if (current !== output) stale.push(path.relative(projectRoot, outputPath));
  }
  if (stale.length > 0) {
    console.error(`Generated component documentation is out of date:\n${stale.join("\n")}`);
    process.exitCode = 1;
  } else {
    console.log(`Generated component documentation is current: ${documents.size} files.`);
  }
} else {
  await mkdir(outputDirectory, { recursive: true });
  await Promise.all([...documents].map(([outputPath, output]) => writeFile(outputPath, output)));
  console.log(`Generated ${documents.size} component documentation files.`);
}
