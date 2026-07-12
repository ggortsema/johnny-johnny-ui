import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { importAgentDocs } from "../scripts/import-agent-docs.mjs";

test("imports nested ADR markdown and generates a readable manifest", () => {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "jj-ui-project-"));
  const docsRoot = fs.mkdtempSync(path.join(os.tmpdir(), "jj-agent-docs-"));
  const adrRoot = path.join(docsRoot, "architecture", "adrs", "foundational");
  fs.mkdirSync(adrRoot, { recursive: true });
  fs.writeFileSync(
    path.join(adrRoot, "ADR-001-example.md"),
    "# Example Decision\n\n**Date:** July 11, 2026\n\n**Status:** Accepted\n\nThis is the durable decision summary.\n",
    "utf8"
  );

  const { manifest, manifestPath } = importAgentDocs({
    projectRoot,
    sourceDir: docsRoot,
    importedAt: new Date("2026-07-11T12:00:00Z"),
  });

  assert.equal(manifest.count, 1);
  assert.equal(manifest.documents[0].title, "Example Decision");
  assert.equal(manifest.documents[0].section, "foundational");
  assert.equal(manifest.documents[0].status, "Accepted");
  assert.equal(manifest.importedAt, "2026-07-11T12:00:00.000Z");
  assert.deepEqual(JSON.parse(fs.readFileSync(manifestPath, "utf8")), manifest);
});

test("uses checked-in fallback content when the agent repository is unavailable", () => {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "jj-ui-fallback-"));
  const fallbackRoot = path.join(projectRoot, "content", "docs", "adr");
  fs.mkdirSync(fallbackRoot, { recursive: true });
  fs.writeFileSync(
    path.join(fallbackRoot, "ADR-002-fallback.md"),
    "# Fallback Decision\n\nFallback text.\n",
    "utf8"
  );

  const previousSource = process.env.JOHNNY_JOHNNY_AGENT_DOCS_DIR;
  process.env.JOHNNY_JOHNNY_AGENT_DOCS_DIR = path.join(projectRoot, "also-missing");
  const { manifest, adrSource } = importAgentDocs({
    projectRoot,
    sourceDir: path.join(projectRoot, "missing"),
    importedAt: new Date("2026-07-11T12:00:00Z"),
  });
  if (previousSource === undefined) delete process.env.JOHNNY_JOHNNY_AGENT_DOCS_DIR;
  else process.env.JOHNNY_JOHNNY_AGENT_DOCS_DIR = previousSource;

  assert.equal(adrSource, null);
  assert.equal(manifest.count, 1);
  assert.equal(manifest.documents[0].title, "Fallback Decision");
});
