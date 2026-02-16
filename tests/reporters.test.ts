import { describe, it, expect } from "vitest";
import { formatJson } from "../src/reporters/json.js";
import { formatMarkdown } from "../src/reporters/markdown.js";
import { formatText } from "../src/reporters/text.js";
import type { RunResult } from "../src/runner.js";

function makeResult(overrides: Partial<RunResult> = {}): RunResult {
  return {
    tests: [
      {
        name: "test one",
        passed: true,
        elapsedMs: 10,
        assertions: [
          {
            passed: true,
            message: "Tool call succeeded",
            assertion: { type: "success" },
          },
        ],
      },
      {
        name: "test two",
        passed: false,
        elapsedMs: 20,
        assertions: [
          {
            passed: false,
            message: 'Output does not contain "expected"',
            assertion: { type: "output_contains", value: "expected" },
          },
        ],
      },
    ],
    totalPassed: 1,
    totalFailed: 1,
    totalAssertions: 2,
    passedAssertions: 1,
    elapsedMs: 100,
    ...overrides,
  };
}

describe("JSON reporter", () => {
  it("produces valid JSON", () => {
    const output = formatJson(makeResult());
    const parsed = JSON.parse(output);
    expect(parsed).toBeDefined();
  });

  it("includes summary fields", () => {
    const parsed = JSON.parse(formatJson(makeResult()));
    expect(parsed.summary.total).toBe(2);
    expect(parsed.summary.passed).toBe(1);
    expect(parsed.summary.failed).toBe(1);
    expect(parsed.passed).toBe(false);
  });

  it("includes test details", () => {
    const parsed = JSON.parse(formatJson(makeResult()));
    expect(parsed.tests).toHaveLength(2);
    expect(parsed.tests[0].name).toBe("test one");
    expect(parsed.tests[0].passed).toBe(true);
    expect(parsed.tests[1].passed).toBe(false);
  });

  it("reports all-pass correctly", () => {
    const result = makeResult({
      totalFailed: 0,
      totalPassed: 2,
      tests: [
        {
          name: "t",
          passed: true,
          elapsedMs: 5,
          assertions: [
            { passed: true, message: "ok", assertion: { type: "success" } },
          ],
        },
      ],
    });
    const parsed = JSON.parse(formatJson(result));
    expect(parsed.passed).toBe(true);
  });
});

describe("Markdown reporter", () => {
  it("includes header", () => {
    const output = formatMarkdown(makeResult());
    expect(output).toContain("## MCPTest Results");
  });

  it("includes table", () => {
    const output = formatMarkdown(makeResult());
    expect(output).toContain("| Test | Status | Time |");
    expect(output).toContain("test one");
    expect(output).toContain("test two");
  });

  it("shows failures section", () => {
    const output = formatMarkdown(makeResult());
    expect(output).toContain("### Failures");
    expect(output).toContain("test two");
  });

  it("shows success header when all pass", () => {
    const result = makeResult({ totalFailed: 0 });
    const output = formatMarkdown(result);
    expect(output).toContain("All tests passed");
  });
});

describe("Text reporter", () => {
  it("includes pass/fail icons", () => {
    const output = formatText(makeResult());
    // Chalk-stripped content should mention test names
    expect(output).toContain("test one");
    expect(output).toContain("test two");
  });

  it("includes summary line", () => {
    const output = formatText(makeResult());
    expect(output).toContain("1 passed");
    expect(output).toContain("1 failed");
  });

  it("shows error details for failed tests", () => {
    const result = makeResult();
    result.tests[1].error = "Connection refused";
    const output = formatText(result);
    expect(output).toContain("Connection refused");
  });
});
