import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const projectRoot = process.cwd();
const manifestPath = path.join(projectRoot, "packages/react/component-manifest.json");
const outputDirectory = path.join(projectRoot, "docs/generated");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

const evidenceRows = Object.entries(manifest.requiredEvidence)
  .map(([name, command]) => `- ${name}: \`${command}\``)
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

  return `# ${component.name}\n\n> 이 문서는 \`packages/react/component-manifest.json\`에서 자동 생성됩니다. 직접 수정하지 마세요.\n\n${component.description}\n\n- 패키지: \`${manifest.package}\`\n- 버전: \`${manifest.version}\`\n- 상태: ${component.status}\n- 카테고리: ${component.category}\n- 컴포넌트 플랫폼: ${component.platforms.join(", ")}\n- 토큰 산출물: ${manifest.crossPlatformTokenArtifacts.join(", ")}\n- 표준 속성 계약: \`${component.extendsElementAttributes}\`\n- ref: \`${component.forwardsRef}\`\n\n## API\n\n| Prop | Type | Required | Default |\n| --- | --- | --- | --- |\n${rows || "| — | — | — | — |"}\n\n## 필수 검증 명령\n\n${evidenceRows}\n`;
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
  `# @aster-ui/react component index\n\n> 이 문서는 컴포넌트 레지스트리에서 자동 생성됩니다.\n\n| Component | Category | Status | Public props |\n| --- | --- | --- | ---: |\n${indexRows}\n`,
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
