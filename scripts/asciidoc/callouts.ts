import { SNIPPET_CALLOUT_VALIDATION_CLASS } from "./snippet-blocks.ts";

export const MANUAL_CALLOUTS_CLASS = "asciidoc-manual-callouts";

type CalloutItem = {
  line: string;
  number: string;
  text: string;
};

export type CalloutReader = {
  peekLine(): Promise<string | undefined>;
  readLine(): Promise<string | undefined>;
  unshiftLines(lines: string[]): void;
};

export type CalloutLineResolver = (
  line: string,
) => Promise<string[] | undefined>;

export async function absorbFollowingCalloutLines(
  reader: CalloutReader | undefined,
  payload: any,
  options: {
    collectManualCalloutLines?: (lines: string[]) => void;
    manualCalloutsClass?: string;
    resolveCalloutLines?: CalloutLineResolver;
  } = {},
): Promise<any> {
  if (!reader) {
    return payload;
  }
  const manualCalloutsClass =
    options.manualCalloutsClass || MANUAL_CALLOUTS_CLASS;
  await consumeSnippetCalloutValidationListing(reader);
  const leadingBlankLines = await readLeadingBlankLines(reader);
  const items = await readCalloutListItems(reader, options.resolveCalloutLines);

  if (!items.length) {
    reader.unshiftLines(leadingBlankLines);
    return payload;
  }

  const sourceNumbers = payloadCalloutNumbers(payload);
  const snippetItems = items.filter((item) => sourceNumbers.has(item.number));
  const manualItems = items.filter((item) => !sourceNumbers.has(item.number));
  if (manualItems.length) {
    const lines = manualCalloutBlockLines(manualItems, manualCalloutsClass);
    if (options.collectManualCalloutLines) {
      options.collectManualCalloutLines(lines);
    } else {
      reader.unshiftLines(lines);
    }
  }
  if (!snippetItems.length) {
    return payload;
  }

  const numberMap = new Map<string, string>();
  for (const item of snippetItems) {
    if (!numberMap.has(item.number)) {
      numberMap.set(item.number, String(numberMap.size + 1));
    }
  }

  return {
    ...payload,
    samples: renumberPayloadSamples(payload.samples, numberMap),
    footerSource: snippetItems
      .map((item) => replaceSourceCalloutNumbers(item.line, numberMap))
      .join("\n"),
  };
}

export function calloutNumber(attributes: any): any {
  const number =
    attributes.number ||
    attributes.callout ||
    attributes._positional?.[0] ||
    attributes.$positional?.[0] ||
    "";
  return /^\d+$/.test(number) ? number : "";
}

export function calloutMarkerForLanguage(attributes: any, language: any): any {
  const number = calloutNumber(attributes);
  if (!number) {
    return "";
  }
  return language === "xml" ? ` <!--${number}-->` : ` // <${number}>`;
}

export function normalizeSourceCalloutMarkers(source: any): any {
  return String(source || "").replace(
    /(^|[ \t])((?:\/\/|#|;)[ \t]*)(\d+)>$/gm,
    "$1$2<$3>",
  );
}

function isListingDelimiter(line: any): any {
  return /^-{4,}$/.test(line.trim());
}

function isCalloutListItem(line: any): any {
  return /^<(\.|\d+)>/.test(line);
}

async function consumeSnippetCalloutValidationListing(
  reader: CalloutReader,
): Promise<void> {
  const roleLine = await reader.peekLine();
  if (roleLine?.trim() !== `[.${SNIPPET_CALLOUT_VALIDATION_CLASS}]`) {
    return;
  }

  const consumed = [await reader.readLine()].filter(
    (line): line is string => line !== undefined,
  );
  const delimiter = await reader.peekLine();
  if (!delimiter || !isListingDelimiter(delimiter)) {
    reader.unshiftLines(consumed);
    return;
  }
  consumed.push((await reader.readLine()) || "");

  for (;;) {
    const line = await reader.readLine();
    if (line === undefined) {
      return;
    }
    if (line.trim() === delimiter.trim()) {
      return;
    }
  }
}

async function readLeadingBlankLines(reader: CalloutReader): Promise<string[]> {
  const lines = [];
  for (;;) {
    const line = await reader.peekLine();
    if (line === undefined || line.trim()) {
      return lines;
    }
    lines.push((await reader.readLine()) || "");
  }
}

async function readCalloutListItems(
  reader: CalloutReader,
  resolveCalloutLines?: CalloutLineResolver,
): Promise<CalloutItem[]> {
  const items = [];
  let nextCallout = 1;
  for (;;) {
    const line = await reader.peekLine();
    if (line === undefined) {
      return items;
    }
    const resolvedLines = resolveCalloutLines
      ? await resolveCalloutLines(line)
      : undefined;
    if (resolvedLines?.length) {
      await reader.readLine();
      reader.unshiftLines(resolvedLines);
      continue;
    }
    const match = /^<(\.|\d+)>\s*(.*)$/.exec(line);
    if (match) {
      await reader.readLine();
      const number =
        match[1] === "." ? String(nextCallout) : String(Number(match[1]));
      nextCallout = Number(number) + 1;
      items.push({
        line: line.replace(/^<(\.|\d+)>/, `<${number}>`),
        number,
        text: match[2],
      });
      continue;
    }
    if (
      items.length &&
      !line.trim() &&
      (await nextNonBlankLineIsCallout(reader, resolveCalloutLines))
    ) {
      await reader.readLine();
      continue;
    }
    return items;
  }
}

function payloadCalloutNumbers(payload: any): Set<string> {
  const numbers = new Set<string>();
  for (const sample of Array.isArray(payload?.samples) ? payload.samples : []) {
    for (const match of String(sample?.source || "").matchAll(
      /<(\d+)>|<!--(\d+)-->/g,
    )) {
      numbers.add(match[1] || match[2]);
    }
  }
  return numbers;
}

function renumberPayloadSamples(
  samples: any,
  numberMap: Map<string, string>,
): any {
  return (Array.isArray(samples) ? samples : []).map((sample: any): any => ({
    ...sample,
    source: replaceSourceCalloutNumbers(sample.source || "", numberMap),
  }));
}

function replaceSourceCalloutNumbers(source: any, numberMap: any): any {
  return String(source).replace(
    /<(\d+)>|<!--(\d+)-->/g,
    (match: any, xmlNumber: any, commentNumber: any): any => {
      const nextNumber = numberMap.get(xmlNumber || commentNumber);
      if (!nextNumber) {
        return match;
      }
      return xmlNumber ? `<${nextNumber}>` : `<!--${nextNumber}-->`;
    },
  );
}

function manualCalloutBlockLines(
  items: CalloutItem[],
  manualCalloutsClass: string,
): string[] {
  return [
    `[.${manualCalloutsClass}]`,
    ...items.map((item) => `. ${item.text}`),
    "",
  ];
}

async function nextNonBlankLineIsCallout(
  reader: CalloutReader,
  resolveCalloutLines?: CalloutLineResolver,
): Promise<boolean> {
  const consumed = [];
  for (;;) {
    const line = await reader.readLine();
    if (line === undefined) {
      reader.unshiftLines(consumed);
      return false;
    }
    consumed.push(line);
    if (!line.trim()) {
      continue;
    }
    reader.unshiftLines(consumed);
    return (
      isCalloutListItem(line) ||
      Boolean(resolveCalloutLines && (await resolveCalloutLines(line)))
    );
  }
}
