export type ParsedArgs = {
  _: string[];
} & Record<string, string | string[] | boolean | undefined>;

export function splitList(
  value: string | string[] | boolean | undefined,
): string[] {
  return value
    ? String(value)
        .split(",")
        .map((item: any): any => item.trim())
        .filter(Boolean)
    : [];
}

export function stringArg(
  value: string | string[] | boolean | undefined,
): string | undefined {
  if (typeof value === "string") {
    return value;
  }
  return Array.isArray(value) ? value[0] : undefined;
}

export function parseArgs(args: string[]): ParsedArgs {
  const parsed: ParsedArgs = { _: [] };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith("--")) {
      parsed._.push(arg);
      continue;
    }
    const withoutPrefix = arg.slice(2);
    const separator = withoutPrefix.indexOf("=");
    const key = camelCase(
      separator >= 0 ? withoutPrefix.slice(0, separator) : withoutPrefix,
    );
    if (separator >= 0) {
      parsed[key] = withoutPrefix.slice(separator + 1);
    } else if (args[index + 1] && !args[index + 1].startsWith("--")) {
      parsed[key] = args[index + 1];
      index += 1;
    } else {
      parsed[key] = true;
    }
  }
  return parsed;
}

function camelCase(value: string): string {
  return value.replace(/-([a-z])/g, (_: any, char: any): any =>
    char.toUpperCase(),
  );
}
