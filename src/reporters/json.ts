import type { RunResult } from "../runner.js";

export function formatJson(result: RunResult): string {
  return JSON.stringify(
    {
      passed: result.totalFailed === 0,
      summary: {
        total: result.tests.length,
        passed: result.totalPassed,
        failed: result.totalFailed,
        assertions: result.totalAssertions,
        passedAssertions: result.passedAssertions,
        elapsedMs: result.elapsedMs,
      },
      tests: result.tests.map((t) => ({
        name: t.name,
        passed: t.passed,
        elapsedMs: t.elapsedMs,
        error: t.error ?? null,
        assertions: t.assertions.map((a) => ({
          type: a.assertion.type,
          passed: a.passed,
          message: a.message,
        })),
      })),
    },
    null,
    2
  );
}
