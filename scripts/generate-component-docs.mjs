import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const projectRoot = process.cwd();
const manifestPath = path.join(projectRoot, "packages/react/component-manifest.json");
const outputPath = path.join(projectRoot, "docs/generated/TreatmentCard.md");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

const rows = manifest.props
  .map(
    (prop) =>
      `| \`${prop.name}\` | \`${prop.type}\` | ${prop.required ? "예" : "아니요"} | ${
        prop.default === null ? "—" : `\`${String(prop.default)}\``
      } |`,
  )
  .join("\n");

const evidenceRows = Object.entries(manifest.requiredEvidence)
  .map(([name, command]) => `- ${name}: \`${command}\``)
  .join("\n");

const output = `# ${manifest.name}\n\n> 이 문서는 \`packages/react/component-manifest.json\`에서 자동 생성됩니다. 직접 수정하지 마세요.\n\n${manifest.description}\n\n- 패키지: \`${manifest.package}\`\n- 버전: \`${manifest.version}\`\n- 상태: ${manifest.status}\n- 컴포넌트 플랫폼: ${manifest.platforms.join(", ")}\n- 토큰 산출물: ${manifest.crossPlatformTokenArtifacts.join(", ")}\n- 표준 article 속성: ${manifest.extendsArticleAttributes ? "지원" : "미지원"}\n- ref: \`${manifest.forwardsRef}\`\n\n## API\n\n| Prop | Type | Required | Default |\n| --- | --- | --- | --- |\n${rows}\n\n## 필수 검증 명령\n\n${evidenceRows}\n`;

if (process.argv.includes("--check")) {
  const current = await readFile(outputPath, "utf8").catch(() => "");
  if (current !== output) {
    console.error("Generated component documentation is out of date.");
    process.exitCode = 1;
  } else {
    console.log("Generated component documentation is current.");
  }
} else {
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, output);
  console.log(`Generated ${path.relative(projectRoot, outputPath)}`);
}
