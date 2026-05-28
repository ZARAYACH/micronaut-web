import assert from "node:assert/strict";
import test from "node:test";

import { normalizeSourceCalloutMarkers } from "../../guides/extensions/register-guide-snippet-blocks.ts";

test("normalizeSourceCalloutMarkers converts guide shorthand comment markers", (): any => {
  assert.equal(
    normalizeSourceCalloutMarkers(
      ["name=weather", "# 1>", "transport=http"].join("\n"),
    ),
    ["name=weather", "# <1>", "transport=http"].join("\n"),
  );
});
