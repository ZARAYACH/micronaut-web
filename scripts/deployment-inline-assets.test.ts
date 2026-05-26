import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test, { type TestContext } from "node:test";

import { extractInlineAssets } from "./shared/inline-assets.ts";

test("inline asset extraction externalizes executable scripts and styles", async (t) => {
  const dist = await temporaryDirectory(t);
  await writeTextFile(
    dist,
    "index.html",
    [
      "<!doctype html>",
      "<html>",
      "<head>",
      '<style media="screen" data-docs-shiki>body { color: red; }</style>',
      '<script id="theme" data-kind="theme">window.docsSnippetStyles = true;</script>',
      '<script type="application/json">{"kept":true}</script>',
      '<script type="importmap">{"imports":{}}</script>',
      "</head>",
      "<body></body>",
      "</html>",
      "",
    ].join("\n"),
  );
  await writeTextFile(
    dist,
    "docs/core/index.html",
    [
      "<!doctype html>",
      "<html>",
      "<head>",
      '<style media="print">body { color: red; }</style>',
      '<script type="module" nonce="abc">console.log("module");</script>',
      "</head>",
      "<body></body>",
      "</html>",
      "",
    ].join("\n"),
  );
  await writeTextFile(
    dist,
    "_astro/inline/script.unused0000000000.js",
    "console.log('unused');",
  );

  const result = await extractInlineAssets({ directory: dist });

  assert.deepEqual(result, {
    files: 2,
    scripts: 2,
    styles: 2,
    assets: 3,
    writtenAssets: 3,
  });

  const rootHtml = await fs.readFile(path.join(dist, "index.html"), "utf8");
  assert.doesNotMatch(rootHtml, /<style\b/i);
  assert.doesNotMatch(rootHtml, /docsSnippetStyles/);
  assert.match(
    rootHtml,
    /<link rel="stylesheet" media="screen" data-docs-shiki="" href="_astro\/inline\/style\.[a-f0-9]{16}\.css">/,
  );
  assert.match(
    rootHtml,
    /<script id="theme" data-kind="theme" src="_astro\/inline\/script\.[a-f0-9]{16}\.js"><\/script>/,
  );
  assert.match(
    rootHtml,
    /<script type="application\/json">{"kept":true}<\/script>/,
  );
  assert.match(rootHtml, /<script type="importmap">{"imports":{}}<\/script>/);

  const nestedHtml = await fs.readFile(
    path.join(dist, "docs", "core", "index.html"),
    "utf8",
  );
  assert.doesNotMatch(nestedHtml, /<style\b/i);
  assert.match(
    nestedHtml,
    /<link rel="stylesheet" media="print" href="..\/..\/_astro\/inline\/style\.[a-f0-9]{16}\.css">/,
  );
  assert.match(
    nestedHtml,
    /<script type="module" nonce="abc" src="..\/..\/_astro\/inline\/script\.[a-f0-9]{16}\.js"><\/script>/,
  );

  const assets = await listFiles(path.join(dist, "_astro", "inline"));
  assert.equal(assets.filter((asset) => asset.endsWith(".css")).length, 1);
  assert.equal(assets.filter((asset) => asset.endsWith(".js")).length, 2);
  assert.equal(
    await exists(
      path.join(dist, "_astro", "inline", "script.unused0000000000.js"),
    ),
    false,
  );
  assert.equal(
    await fs.readFile(
      path.join(
        dist,
        "_astro",
        "inline",
        assets.find((asset) => asset.endsWith(".css")) ?? "",
      ),
      "utf8",
    ),
    "body { color: red; }",
  );
});

test("inline asset extraction handles redirect pages", async (t) => {
  const dist = await temporaryDirectory(t);
  await writeTextFile(
    dist,
    "latest.html",
    [
      "<!doctype html>",
      '<html lang="en">',
      "<head>",
      '<meta http-equiv="refresh" content="0;url=/latest/" />',
      "<script>",
      'window.location.replace("/latest/" + window.location.search + window.location.hash);',
      "</script>",
      "</head>",
      "<body></body>",
      "</html>",
      "",
    ].join("\n"),
  );

  await extractInlineAssets({ directory: dist });

  const html = await fs.readFile(path.join(dist, "latest.html"), "utf8");
  assertNoInlineExecutableScripts(html);
  assert.match(
    html,
    /<script src="_astro\/inline\/script\.[a-f0-9]{16}\.js"><\/script>/,
  );
});

async function temporaryDirectory(t: TestContext) {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "micronaut-inline-assets-test-"),
  );
  t.after(() => fs.rm(directory, { force: true, recursive: true }));
  return directory;
}

async function writeTextFile(directory: string, file: string, content: string) {
  const target = path.join(directory, file);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, content, "utf8");
}

async function listFiles(directory: string) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  return entries.filter((entry) => entry.isFile()).map((entry) => entry.name);
}

function assertNoInlineExecutableScripts(html: string) {
  for (const match of html.matchAll(/<script\b([^>]*)>[\s\S]*?<\/script>/gi)) {
    const attributes = match[1];
    if (
      /\bsrc=/.test(attributes) ||
      /\btype=["']?(?:application\/json|application\/ld\+json|importmap)\b/i.test(
        attributes,
      )
    ) {
      continue;
    }
    assert.fail(`Expected no inline executable script, found ${match[0]}`);
  }
}

async function exists(file: string) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}
