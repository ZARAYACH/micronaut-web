import { expect, type Page, type Response } from "@playwright/test";

type RuntimeScriptAssertions = {
  failures: string[];
  pending: Promise<void>[];
};

const forbiddenRuntimeLibraries = [
  {
    label: "Shiki highlighter",
    pattern:
      /@shikijs\/|(?:^|[^A-Za-z0-9_$-])shiki(?:[^A-Za-z0-9_$-]|$)|createHighlighter|codeToHtml|codeToTokens/,
  },
  {
    label: "Asciidoctor",
    pattern:
      /@asciidoctor\/|from\s*["']asciidoctor["']|import\(["']asciidoctor["']\)|Opal\.Asciidoctor/,
  },
  {
    label: "configuration conversion parser",
    pattern:
      /from\s*["'](?:js-yaml|smol-toml)["']|import\(["'](?:js-yaml|smol-toml)["']\)|js-yaml|smol-toml/,
  },
  {
    label: "generated-content configuration conversion helper",
    pattern:
      /\b(?:registerConfigurationBlock|processConfigurationBlock|configurationSamples|parseConfigurationSource|toJavaProperties|flattenConfiguration|formatPropertiesValue|toTomlSource|formatTomlValue|toGroovyConfig|formatGroovyEntry|formatGroovyKey|formatGroovyValue|toHocon|formatHoconValue|stringifyToml|parseToml)\b/,
  },
];

export function collectRuntimeScriptAssertions(
  page: Page,
): RuntimeScriptAssertions {
  const assertions: RuntimeScriptAssertions = {
    failures: [],
    pending: [],
  };

  page.on("response", (response) => {
    if (!isInspectableRuntimeScriptResponse(response)) {
      return;
    }
    assertions.pending.push(inspectScriptResponse(response, assertions));
  });

  return assertions;
}

function isInspectableRuntimeScriptResponse(response: Response): boolean {
  if (
    response.request().resourceType() !== "script" ||
    response.status() < 200 ||
    response.status() >= 300
  ) {
    return false;
  }

  const url = new URL(response.url());
  return (
    !url.pathname.endsWith(".css") &&
    !url.pathname.startsWith("/@vite/") &&
    !url.pathname.startsWith("/@react-refresh")
  );
}

export async function expectNoForbiddenRuntimeLibraries(
  assertions: RuntimeScriptAssertions,
): Promise<void> {
  await Promise.all(assertions.pending);
  expect(assertions.failures).toEqual([]);
}

export async function installClipboardMock(page: Page): Promise<void> {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText(value: string) {
          (
            window as Window & { __micronautCopiedText?: string }
          ).__micronautCopiedText = value;
          return Promise.resolve();
        },
      },
    });
  });
}

export async function expectClipboardText(page: Page): Promise<void> {
  const copiedText = await page.evaluate(
    () =>
      (window as Window & { __micronautCopiedText?: string })
        .__micronautCopiedText,
  );
  expect(copiedText).toBeTruthy();
}

async function inspectScriptResponse(
  response: Response,
  assertions: RuntimeScriptAssertions,
): Promise<void> {
  let body = "";
  try {
    body = await response.text();
  } catch (error) {
    assertions.failures.push(
      `could not inspect script response ${response.url()}: ${errorMessage(error)}`,
    );
    return;
  }

  for (const { label, pattern } of forbiddenRuntimeLibraries) {
    if (pattern.test(body)) {
      assertions.failures.push(
        `${response.url()} contains build-time-only ${label}`,
      );
    }
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
