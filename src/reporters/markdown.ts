import type { RunResult } from "../runner.js";

export function formatMarkdown(result: RunResult): string {
  const lines: string[] = [];

  const status =
    result.totalFailed === 0 ? "All tests passed" : "Some tests failed";
  lines.push(`## MCPTest Results — ${status}`);
  lines.push("");

  lines.push(
    `**${result.totalPassed}** passed, **${result.totalFailed}** failed | ` +
      `${result.passedAssertions}/${result.totalAssertions} assertions | ` +
      `${result.elapsedMs}ms`
  );
  lines.push("");

  lines.push("| Test | Status | Time |");
  lines.push("|------|--------|------|");
  for (const test of result.tests) {
    const icon = test.passed ? "✅" : "❌";
    lines.push(`| ${test.name} | ${icon} | ${test.elapsedMs}ms |`);
  }
  lines.push("");

  // Details for failures
  const failures = result.tests.filter((t) => !t.passed);
  if (failures.length > 0) {
    lines.push("### Failures");
    lines.push("");
    for (const test of failures) {
      lines.push(`**${test.name}**`);
      if (test.error) {
        lines.push(`- Error: \`${test.error}\``);
      }
      for (const a of test.assertions.filter((a) => !a.passed)) {
        lines.push(`- ${a.message}`);
      }
      lines.push("");
    }
  }

  return lines.join("\n");
}
