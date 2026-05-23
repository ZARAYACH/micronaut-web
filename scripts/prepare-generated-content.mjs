import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const tasks = [
  ["platform docs", process.execPath, ["scripts/render-platform-docs.mjs"]],
  ["guides", process.execPath, ["scripts/render-guides.mjs"]]
];

await Promise.all(tasks.map(([label, command, args]) => run(label, command, args)));

function run(label, command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: projectDirectory,
      env: process.env,
      stdio: "inherit"
    });
    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${label} render failed${signal ? ` with signal ${signal}` : ` with exit code ${code}`}`));
    });
  });
}
