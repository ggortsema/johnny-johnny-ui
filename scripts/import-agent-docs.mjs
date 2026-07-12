import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const defaultProjectRoot = path.resolve(scriptDirectory, "..");

function walkMarkdown(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) return walkMarkdown(fullPath);
      return entry.isFile() && entry.name.toLowerCase().endsWith(".md")
        ? [fullPath]
        : [];
    })
    .sort((left, right) => left.localeCompare(right));
}

function copyMarkdownTree(source, target) {
  for (const sourceFile of walkMarkdown(source)) {
    const relativePath = path.relative(source, sourceFile);
    const targetFile = path.join(target, relativePath);
    fs.mkdirSync(path.dirname(targetFile), { recursive: true });
    fs.copyFileSync(sourceFile, targetFile);
  }
}

function firstMatch(content, expression) {
  const match = String(content).match(expression);
  return match?.[1]?.trim() || null;
}

function titleFromFilename(filename) {
  return filename
    .replace(/\.md$/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function sectionLabel(section) {
  if (section === "root") return "Architecture decisions";
  return section
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function summaryFromMarkdown(content) {
  const paragraphs = String(content)
    .replace(/^---[\s\S]*?---\s*/m, "")
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(
      (paragraph) =>
        paragraph &&
        !paragraph.startsWith("#") &&
        !paragraph.startsWith("**") &&
        !paragraph.startsWith("|") &&
        !paragraph.startsWith("```")
    );

  const summary = paragraphs[0] || "Johnny-Johnny architecture decision record.";
  return summary.replace(/\s+/g, " ").slice(0, 260);
}

function resolveAdrSource(projectRoot, explicitSource) {
  const candidates = [
    explicitSource,
    process.env.JOHNNY_JOHNNY_AGENT_DOCS_DIR,
    path.join(projectRoot, ".agent-docs"),
    path.resolve(projectRoot, "../johnny-johnny-agent/docs"),
    path.resolve(projectRoot, "../agent/docs"),
  ].filter(Boolean);

  for (const candidate of candidates) {
    const absolute = path.resolve(candidate);
    const directAdrRoot = path.join(absolute, "architecture", "adrs");
    if (fs.existsSync(directAdrRoot)) return directAdrRoot;
    if (path.basename(absolute) === "adrs" && fs.existsSync(absolute)) return absolute;
  }
  return null;
}

export function buildDocsManifest(targetRoot, importedAt = new Date()) {
  const documents = walkMarkdown(targetRoot).map((file) => {
    const relativePath = path.relative(targetRoot, file).split(path.sep).join("/");
    const content = fs.readFileSync(file, "utf8");
    const pathParts = relativePath.split("/");
    const section = pathParts.length > 1 ? pathParts[0] : "root";
    const filename = pathParts.at(-1);
    const title = firstMatch(content, /^#\s+(.+)$/m) || titleFromFilename(filename);
    const status = firstMatch(content, /^\*\*Status:\*\*\s*(.+)$/m);
    const date = firstMatch(content, /^\*\*Date:\*\*\s*(.+)$/m);

    return {
      id: relativePath.replace(/\.md$/i, ""),
      slug: filename.replace(/\.md$/i, ""),
      title,
      section,
      sectionLabel: sectionLabel(section),
      relativePath,
      sourcePath: `docs/architecture/adrs/${relativePath}`,
      status,
      date,
      summary: summaryFromMarkdown(content),
      content,
    };
  });

  return {
    importedAt: importedAt.toISOString(),
    source: "johnny-johnny-agent/docs/architecture/adrs",
    count: documents.length,
    documents,
  };
}

export function importAgentDocs({
  projectRoot = defaultProjectRoot,
  sourceDir,
  importedAt,
} = {}) {
  const targetRoot = path.join(projectRoot, "content", "docs", "adr");
  const generatedDirectory = path.join(projectRoot, "generated");
  const manifestPath = path.join(generatedDirectory, "docs-manifest.json");
  const adrSource = resolveAdrSource(projectRoot, sourceDir);

  if (adrSource) {
    fs.rmSync(targetRoot, { recursive: true, force: true });
    fs.mkdirSync(targetRoot, { recursive: true });
    copyMarkdownTree(adrSource, targetRoot);
    console.log(`Imported Johnny-Johnny ADRs from ${adrSource}`);
  } else if (!walkMarkdown(targetRoot).length) {
    throw new Error(
      "No Johnny-Johnny ADR source was found and no checked-in fallback documents exist. " +
        "Set JOHNNY_JOHNNY_AGENT_DOCS_DIR to the agent docs directory."
    );
  } else {
    console.log("Agent docs source not found; using checked-in ADR fallback content.");
  }

  const manifest = buildDocsManifest(targetRoot, importedAt || new Date());
  fs.mkdirSync(generatedDirectory, { recursive: true });
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(`Generated ${manifest.count}-document manifest at ${manifestPath}`);
  return { manifest, manifestPath, targetRoot, adrSource };
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  importAgentDocs();
}
