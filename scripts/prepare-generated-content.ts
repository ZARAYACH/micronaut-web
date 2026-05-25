import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

const tasks: Array<[label: string, command: string, args: string[]]> = [
  ["platform docs", process.execPath, ["scripts/render-platform-docs.ts"]],
  ["guides", process.execPath, ["scripts/render-guides.ts"]],
];

await Promise.all(
  tasks.map(([label, command, args]: any): any => run(label, command, args)),
);

function run(label: string, command: string, args: string[]): Promise<void> {
  return new Promise<void>((resolve: any, reject: any): any => {
    const child = spawn(command, args, {
      cwd: projectDirectory,
      env: process.env,
      stdio: "inherit",
    });
    child.on("error", reject);
    child.on("exit", (code: any, signal: any): any => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(
        new Error(
          `${label} render failed${signal ? ` with signal ${signal}` : ` with exit code ${code}`}`,
        ),
      );
    });
  });
}
