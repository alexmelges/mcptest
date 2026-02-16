import chalk from "chalk";
import type { RunResult } from "../runner.js";

export function formatText(result: RunResult): string {
  const lines: string[] = [];

  lines.push("");
  lines.push(chalk.bold("MCPTest Results"));
  lines.push(chalk.dim("─".repeat(50)));

  for (const test of result.tests) {
    const icon = test.passed ? chalk.green("✓") : chalk.red("✗");
    const name = test.passed
      ? chalk.green(test.name)
      : chalk.red(test.name);
    const time = chalk.dim(`(${test.elapsedMs}ms)`);
    lines.push(`${icon} ${name} ${time}`);

    if (test.error) {
      lines.push(chalk.red(`    Error: ${test.error}`));
    }

    for (const a of test.assertions) {
      const aIcon = a.passed ? chalk.green("  ✓") : chalk.red("  ✗");
      const msg = a.passed
        ? chalk.dim(a.message)
        : chalk.red(a.message);
      lines.push(`${aIcon} ${msg}`);
    }
  }

  lines.push(chalk.dim("─".repeat(50)));

  const summary = `${result.totalPassed} passed, ${result.totalFailed} failed (${result.passedAssertions}/${result.totalAssertions} assertions)`;
  const time = chalk.dim(`in ${result.elapsedMs}ms`);

  if (result.totalFailed === 0) {
    lines.push(chalk.green.bold(`All tests passed! `) + summary + " " + time);
  } else {
    lines.push(chalk.red.bold(`Tests failed. `) + summary + " " + time);
  }

  lines.push("");
  return lines.join("\n");
}
