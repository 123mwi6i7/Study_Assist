import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { test } from "node:test";
import ts from "typescript";
import { fileURLToPath } from "node:url";

const testDirectory = dirname(fileURLToPath(import.meta.url));
const moduleRequire = createRequire(import.meta.url);

function loadTypeScriptModule(relativePath) {
  const filename = join(testDirectory, "..", relativePath);
  const source = readFileSync(filename, "utf8");
  const javascript = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;
  const loadedModule = { exports: {} };
  new Function("exports", "require", "module", javascript)(
    loadedModule.exports,
    moduleRequire,
    loadedModule,
  );
  return loadedModule.exports;
}

const { parseCurrencyAmount } = loadTypeScriptModule("lib/marketplace/amount.ts");
const { localDeadlineToUtc } = loadTypeScriptModule("lib/assignments/deadlines.ts");

test("converts supported currency decimal places to integer minor units", () => {
  assert.equal(parseCurrencyAmount("2500", "KES"), 250000);
  assert.equal(parseCurrencyAmount("12.30", "USD"), 1230);
  assert.equal(parseCurrencyAmount("1.234", "KWD"), 1234);
  assert.equal(parseCurrencyAmount("2500", "JPY"), 2500);
});

test("accepts the maximum safe quotation amount exactly", () => {
  assert.equal(parseCurrencyAmount("9999999999999.99", "USD"), 999999999999999);
});

test("rejects negative, malformed, and over-precision prices", () => {
  assert.throws(() => parseCurrencyAmount("-1.00", "USD"));
  assert.throws(() => parseCurrencyAmount("1e3", "USD"));
  assert.throws(() => parseCurrencyAmount("1.001", "USD"));
  assert.throws(() => parseCurrencyAmount("10000000000000.00", "USD"));
});

test("converts a valid local deadline into UTC using its IANA time zone", () => {
  assert.equal(
    localDeadlineToUtc("2030-06-15T09:30", "Africa/Nairobi"),
    "2030-06-15T06:30:00.000Z",
  );
});

test("rejects invalid, nonexistent, and ambiguous local deadlines", () => {
  assert.throws(() => localDeadlineToUtc("2030-02-30T10:00", "Africa/Nairobi"), /valid deadline/);
  assert.throws(() => localDeadlineToUtc("2030-03-31T01:30", "Europe/London"), /does not exist/);
  assert.throws(() => localDeadlineToUtc("2030-10-27T01:30", "Europe/London"), /occurs twice/);
  assert.throws(() => localDeadlineToUtc("2030-06-15T09:30", "Not/A-Time-Zone"), /valid time zone/);
});
