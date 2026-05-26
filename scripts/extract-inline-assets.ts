import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { parseArgs, stringArg } from "./shared/cli.ts";
import { extractInlineAssets } from "./shared/inline-assets.ts";

const projectDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

if (isMainModule()) {
  const options = parseArgs(process.argv.slice(2));
  const result = await extractInlineAssets({
    directory: stringArg(options.dist) || path.join(projectDirectory, "dist"),
    assetDirectory: stringArg(options.assetDir),
  });
  console.log(
    `Extracted ${result.scripts} inline scripts and ${result.styles} inline styles from ${result.files} HTML files into ${result.assets} shared assets.`,
  );
}

function isMainModule() {
  return process.argv[1]
    ? import.meta.url === pathToFileURL(process.argv[1]).href
    : false;
}
