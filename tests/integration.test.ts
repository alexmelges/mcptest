import { describe, it, expect } from "vitest";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";

const CLI = resolve(import.meta.dirname, "..", "dist", "index.js");

function run(args: string[]): { stdout: string; exitCode: number } {
  try {
    const stdout = execFileSync("node", [CLI, ...args], {
      encoding: "utf-8",
      timeout: 30000,
    });
    return { stdout, exitCode: 0 };
  } catch (e: unknown) {
    const err = e as { stdout?: string; status?: number };
    return { stdout: err.stdout ?? "", exitCode: err.status ?? 1 };
  }
}

describe("CLI integration", () => {
  it("runs demo mode successfully", () => {
    const { stdout, exitCode } = run(["--demo"]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("passed");
  });

  it("demo mode JSON output is valid", () => {
    const { stdout, exitCode } = run(["--demo", "--format", "json"]);
    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout);
    expect(parsed.passed).toBe(true);
    expect(parsed.summary.failed).toBe(0);
  });

  it("demo mode markdown output has table", () => {
    const { stdout, exitCode } = run(["--demo", "--format", "markdown"]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("| Test | Status | Time |");
    expect(stdout).toContain("All tests passed");
  });

  it("fails when config file not found", () => {
    const { exitCode } = run(["-f", "nonexistent.yaml"]);
    expect(exitCode).toBe(1);
  });

  it("shows version", () => {
    const { stdout, exitCode } = run(["--version"]);
    expect(exitCode).toBe(0);
    expect(stdout.trim()).toBe("0.1.0");
  });

  it("shows help", () => {
    const { stdout, exitCode } = run(["--help"]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("mcptest");
  });
});
