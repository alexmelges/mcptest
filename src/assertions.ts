import { Ajv } from "ajv";
import type { Assertion } from "./config.js";
import type { McpTool, McpResource, McpPrompt, ToolCallResult } from "./client.js";

export interface AssertionResult {
  passed: boolean;
  message: string;
  assertion: Assertion;
}

// Context passed to assertion evaluators
export interface AssertionContext {
  tools?: McpTool[];
  resources?: McpResource[];
  prompts?: McpPrompt[];
  toolResult?: ToolCallResult;
  elapsedMs?: number;
}

function getOutputText(result: ToolCallResult): string {
  return result.content
    .filter((c) => c.type === "text" && c.text)
    .map((c) => c.text!)
    .join("\n");
}

function checkCount(
  actual: number,
  label: string,
  assertion: Assertion
): AssertionResult {
  if (assertion.exact !== undefined) {
    return {
      passed: actual === assertion.exact,
      message:
        actual === assertion.exact
          ? `${label} count is exactly ${assertion.exact}`
          : `Expected exactly ${assertion.exact} ${label}, got ${actual}`,
      assertion,
    };
  }
  const minOk = assertion.min === undefined || actual >= assertion.min;
  const maxOk = assertion.max === undefined || actual <= assertion.max;
  if (minOk && maxOk) {
    const parts: string[] = [];
    if (assertion.min !== undefined) parts.push(`>= ${assertion.min}`);
    if (assertion.max !== undefined) parts.push(`<= ${assertion.max}`);
    return {
      passed: true,
      message: `${label} count is ${actual} (${parts.join(" and ") || "any"})`,
      assertion,
    };
  }
  const parts: string[] = [];
  if (!minOk) parts.push(`expected >= ${assertion.min}`);
  if (!maxOk) parts.push(`expected <= ${assertion.max}`);
  return {
    passed: false,
    message: `${label} count is ${actual}, but ${parts.join(" and ")}`,
    assertion,
  };
}

const ajv = new Ajv({ allErrors: true });

type AssertionEvaluator = (
  assertion: Assertion,
  ctx: AssertionContext
) => AssertionResult;

const evaluators: Record<string, AssertionEvaluator> = {
  success(assertion, ctx) {
    const passed = ctx.toolResult !== undefined && !ctx.toolResult.isError;
    return {
      passed,
      message: passed
        ? "Tool call succeeded"
        : "Expected success but got error",
      assertion,
    };
  },

  error(assertion, ctx) {
    const passed = ctx.toolResult !== undefined && ctx.toolResult.isError === true;
    return {
      passed,
      message: passed
        ? "Tool call returned error as expected"
        : "Expected error but call succeeded",
      assertion,
    };
  },

  error_contains(assertion, ctx) {
    if (!ctx.toolResult || !ctx.toolResult.isError) {
      return {
        passed: false,
        message: "Expected error but call succeeded",
        assertion,
      };
    }
    const text = getOutputText(ctx.toolResult);
    const contains = text.includes(assertion.value!);
    return {
      passed: contains,
      message: contains
        ? `Error contains "${assertion.value}"`
        : `Error does not contain "${assertion.value}". Got: "${text}"`,
      assertion,
    };
  },

  output_contains(assertion, ctx) {
    if (!ctx.toolResult) {
      return { passed: false, message: "No tool result", assertion };
    }
    const text = getOutputText(ctx.toolResult);
    const contains = text.includes(assertion.value!);
    return {
      passed: contains,
      message: contains
        ? `Output contains "${assertion.value}"`
        : `Output does not contain "${assertion.value}". Got: "${text}"`,
      assertion,
    };
  },

  output_matches(assertion, ctx) {
    if (!ctx.toolResult) {
      return { passed: false, message: "No tool result", assertion };
    }
    const text = getOutputText(ctx.toolResult);
    const regex = new RegExp(assertion.pattern!);
    const matches = regex.test(text);
    return {
      passed: matches,
      message: matches
        ? `Output matches pattern /${assertion.pattern}/`
        : `Output does not match /${assertion.pattern}/. Got: "${text}"`,
      assertion,
    };
  },

  output_json(assertion, ctx) {
    if (!ctx.toolResult) {
      return { passed: false, message: "No tool result", assertion };
    }
    const text = getOutputText(ctx.toolResult);
    try {
      JSON.parse(text);
      return { passed: true, message: "Output is valid JSON", assertion };
    } catch {
      return {
        passed: false,
        message: `Output is not valid JSON: "${text.slice(0, 100)}"`,
        assertion,
      };
    }
  },

  output_json_schema(assertion, ctx) {
    if (!ctx.toolResult) {
      return { passed: false, message: "No tool result", assertion };
    }
    const text = getOutputText(ctx.toolResult);
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return {
        passed: false,
        message: "Output is not valid JSON",
        assertion,
      };
    }
    const validate = ajv.compile(assertion.schema!);
    const valid = validate(parsed);
    return {
      passed: !!valid,
      message: valid
        ? "Output matches JSON Schema"
        : `Output does not match schema: ${ajv.errorsText(validate.errors)}`,
      assertion,
    };
  },

  contains_tool(assertion, ctx) {
    if (!ctx.tools) {
      return { passed: false, message: "No tools available", assertion };
    }
    const found = ctx.tools.some((t) => t.name === assertion.name);
    return {
      passed: found,
      message: found
        ? `Tools list contains "${assertion.name}"`
        : `Tools list does not contain "${assertion.name}". Available: ${ctx.tools.map((t) => t.name).join(", ")}`,
      assertion,
    };
  },

  tool_count(assertion, ctx) {
    return checkCount(ctx.tools?.length ?? 0, "tool", assertion);
  },

  resource_count(assertion, ctx) {
    return checkCount(ctx.resources?.length ?? 0, "resource", assertion);
  },

  prompt_count(assertion, ctx) {
    return checkCount(ctx.prompts?.length ?? 0, "prompt", assertion);
  },

  schema_valid(assertion, ctx) {
    if (!ctx.tools || ctx.tools.length === 0) {
      return { passed: false, message: "No tools to validate", assertion };
    }
    const errors: string[] = [];
    for (const tool of ctx.tools) {
      if (!tool.name) {
        errors.push("Tool missing 'name'");
      }
      if (tool.inputSchema) {
        try {
          ajv.compile(tool.inputSchema);
        } catch (e: unknown) {
          errors.push(
            `Tool "${tool.name}" has invalid inputSchema: ${(e as Error).message}`
          );
        }
      }
    }
    return {
      passed: errors.length === 0,
      message:
        errors.length === 0
          ? "All tool schemas are valid"
          : `Schema errors: ${errors.join("; ")}`,
      assertion,
    };
  },

  response_time(assertion, ctx) {
    const ms = ctx.elapsedMs ?? 0;
    const limit = assertion.ms!;
    const passed = ms <= limit;
    return {
      passed,
      message: passed
        ? `Response time ${ms}ms <= ${limit}ms`
        : `Response time ${ms}ms exceeded ${limit}ms limit`,
      assertion,
    };
  },
};

export function evaluateAssertion(
  assertion: Assertion,
  ctx: AssertionContext
): AssertionResult {
  const evaluator = evaluators[assertion.type];
  if (!evaluator) {
    return {
      passed: false,
      message: `Unknown assertion type: ${assertion.type}`,
      assertion,
    };
  }
  return evaluator(assertion, ctx);
}
