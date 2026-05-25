type RenderAsciiDocOptions = {
  asciidoctor: any;
  source: string;
  convertOptions: Record<string, any>;
  diagnosticsLabel?: string;
  strict?: boolean;
};

export function renderAsciiDoc({
  asciidoctor,
  source,
  convertOptions,
  diagnosticsLabel = "AsciiDoc source",
  strict = false,
}: RenderAsciiDocOptions): string {
  const logger = asciidoctor.MemoryLogger.create();
  const previousLogger = asciidoctor.LoggerManager.getLogger();
  let html;
  try {
    asciidoctor.LoggerManager.setLogger(logger);
    html = String(
      asciidoctor.convert(source, {
        header_footer: false,
        safe: "unsafe",
        ...convertOptions,
      }),
    );
  } finally {
    asciidoctor.LoggerManager.setLogger(previousLogger);
  }

  const diagnostics = logger.getMessages().map(formatAsciidoctorDiagnostic);
  if (diagnostics.length) {
    if (strict) {
      throw new Error(
        `Asciidoctor diagnostics for ${diagnosticsLabel}: ${diagnostics.join("; ")}`,
      );
    }
    for (const diagnostic of diagnostics) {
      console.warn(diagnostic);
    }
  }

  return html;
}

function formatAsciidoctorDiagnostic(message: any): string {
  const severity = message.getSeverity();
  const location = message.getSourceLocation?.();
  const pathName = location?.getPath?.();
  const lineNumber = location?.getLineNumber?.();
  const source = pathName
    ? `${pathName}${lineNumber ? `:${lineNumber}` : ""}: `
    : "";
  return `asciidoctor: ${severity}: ${source}${message.getText()}`;
}
