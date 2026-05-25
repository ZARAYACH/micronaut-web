import asciidoctorFactory from "asciidoctor";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parseArgs, splitList, stringArg } from "./platform-docs/cli.ts";
import { DEFAULT_GUIDE_SLUGS, defaultGuideOption, guideOptions, readGuides, selectGuides } from "./guides/model.ts";
import { copyGuideAssets, guideManifest, renderGuideOption } from "./guides/renderer.ts";

const projectDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const options = parseArgs(process.argv.slice(2));
const guidesDirectory = path.resolve(
  stringArg(options.guidesDir) ||
  stringArg(options.micronautGuidesDir) ||
  options._[0] ||
  process.env.MICRONAUT_GUIDES_DIR ||
  path.join(projectDirectory, "..", "micronaut-guides")
);
const outputDirectory = path.resolve(stringArg(options.output) || path.join(projectDirectory, "src", "content", "generated-guides"));
const fragmentsDirectory = path.join(outputDirectory, "fragments");
const strict = Boolean(options.strict || process.env.GUIDES_RENDER_STRICT === "true" || process.env.CI === "true");
const renderAll = Boolean(options.all || process.env.GUIDES_RENDER_ALL === "true");
const explicitSlugs = splitList(options.slugs || process.env.GUIDES_RENDER_SLUGS || "");
const selectedSlugs = renderAll ? [] : explicitSlugs.length ? explicitSlugs : DEFAULT_GUIDE_SLUGS;

const asciidoctor = asciidoctorFactory();
const allGuides = await readGuides(guidesDirectory);
const guides = selectGuides(allGuides, selectedSlugs);
if (strict && !allGuides.length) {
  throw new Error(`Strict guide render failed because no guides were found in ${guidesDirectory}`);
}
if (strict && !guides.length) {
  throw new Error(`Strict guide render failed because no selected guides were found`);
}

await cleanGeneratedGuidesOutput(outputDirectory, explicitSlugs.length ? selectedSlugs : []);

let rendered = 0;
let skipped = 0;
const skippedGuides = [];
const manifestGuides = [];
for (const guide of guides) {
  const optionsToRender = guideOptions(guide);
  const defaultOption = defaultGuideOption(guide);
  const renderedOptions = [];

  try {
    if (!optionsToRender.length) {
      throw new Error("no renderable language/build variants");
    }
    await fs.mkdir(fragmentsDirectory, { recursive: true });
    for (const option of optionsToRender) {
      const html = await renderGuideOption(asciidoctor, guidesDirectory, guide, option, { strict });
      await fs.writeFile(path.join(fragmentsDirectory, option.file), `${html}\n`, "utf8");
      renderedOptions.push(option);
      rendered += 1;
    }
    await copyGuideAssets(guidesDirectory, guide, outputDirectory, renderedOptions);
    manifestGuides.push({ guide, options: renderedOptions, defaultOption });
    console.log(`Rendered ${guide.slug}`);
  } catch (error) {
    skipped += 1;
    skippedGuides.push(`${guide.slug}: ${error.message}`);
    console.warn(`Skipping ${skippedGuides.at(-1)}`);
  }
}

await fs.mkdir(outputDirectory, { recursive: true });
await fs.writeFile(
  path.join(outputDirectory, "manifest.json"),
  `${JSON.stringify(guideManifest(manifestGuides), null, 2)}\n`,
  "utf8"
);

console.log(`Rendered ${rendered} guide fragments to ${path.relative(projectDirectory, outputDirectory)}${skipped ? ` (${skipped} skipped)` : ""}.`);
if (strict && skippedGuides.length) {
  throw new Error(`Strict guide render failed with skipped guides: ${skippedGuides.join("; ")}`);
}

async function cleanGeneratedGuidesOutput(directory, slugs) {
  await fs.mkdir(directory, { recursive: true });
  if (slugs.length) {
    const fragmentEntries = await safeReaddir(path.join(directory, "fragments"));
    await Promise.all([
      ...fragmentEntries
        .filter((entry) => slugs.some((slug) => entry.name.startsWith(`${slug}-`)))
        .map((entry) => fs.rm(path.join(directory, "fragments", entry.name), { force: true })),
      ...slugs.map((slug) => fs.rm(path.join(directory, "assets", slug), { force: true, recursive: true }))
    ]);
    return;
  }

  const entries = await fs.readdir(directory, { withFileTypes: true });
  await Promise.all(entries.map((entry) => {
    if (entry.isFile() && entry.name === "manifest.json") {
      return fs.rm(path.join(directory, entry.name), { force: true });
    }
    if (entry.isDirectory() && ["assets", "fragments"].includes(entry.name)) {
      return fs.rm(path.join(directory, entry.name), { force: true, recursive: true });
    }
    return undefined;
  }));
}

async function safeReaddir(directory) {
  try {
    return await fs.readdir(directory, { withFileTypes: true });
  } catch {
    return [];
  }
}
