import { McpClient } from "./client.js";
import type { McpTestConfig, TestDefinition } from "./config.js";
import { evaluateAssertion } from "./assertions.js";
import type { AssertionResult, AssertionContext } from "./assertions.js";

export interface TestResult {
  name: string;
  passed: boolean;
  assertions: AssertionResult[];
  error?: string;
  elapsedMs: number;
}

export interface RunResult {
  tests: TestResult[];
  totalPassed: number;
  totalFailed: number;
  totalAssertions: number;
  passedAssertions: number;
  elapsedMs: number;
}

export async function runTests(config: McpTestConfig): Promise<RunResult> {
  const client = new McpClient();
  const results: TestResult[] = [];
  const runStart = Date.now();

  try {
    await client.connect(config.server);

    for (const test of config.tests) {
      const result = await runSingleTest(client, test);
      results.push(result);
    }
  } catch (e: unknown) {
    // If connection fails, mark all remaining tests as failed
    const err = e as Error;
    for (const test of config.tests) {
      if (!results.some((r) => r.name === test.name)) {
        results.push({
          name: test.name,
          passed: false,
          assertions: [],
          error: `Server connection error: ${err.message}`,
          elapsedMs: 0,
        });
      }
    }
  } finally {
    await client.close();
  }

  const totalAssertions = results.reduce(
    (sum, r) => sum + r.assertions.length,
    0
  );
  const passedAssertions = results.reduce(
    (sum, r) => sum + r.assertions.filter((a) => a.passed).length,
    0
  );

  return {
    tests: results,
    totalPassed: results.filter((r) => r.passed).length,
    totalFailed: results.filter((r) => !r.passed).length,
    totalAssertions,
    passedAssertions,
    elapsedMs: Date.now() - runStart,
  };
}

async function runSingleTest(
  client: McpClient,
  test: TestDefinition
): Promise<TestResult> {
  const start = Date.now();

  try {
    const ctx: AssertionContext = {};

    switch (test.action) {
      case "list_tools": {
        ctx.tools = await client.listTools();
        break;
      }
      case "call_tool": {
        ctx.toolResult = await client.callTool(test.tool!, test.args ?? {});
        break;
      }
      case "list_resources": {
        ctx.resources = await client.listResources();
        break;
      }
      case "list_prompts": {
        ctx.prompts = await client.listPrompts();
        break;
      }
    }

    const elapsedMs = Date.now() - start;
    ctx.elapsedMs = elapsedMs;

    const assertions = test.assert.map((a) => evaluateAssertion(a, ctx));
    const passed = assertions.every((a) => a.passed);

    return { name: test.name, passed, assertions, elapsedMs };
  } catch (e: unknown) {
    const err = e as Error;
    return {
      name: test.name,
      passed: false,
      assertions: [],
      error: err.message,
      elapsedMs: Date.now() - start,
    };
  }
}
