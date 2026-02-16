import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { parse as parseYaml } from "yaml";

// --- Types ---

export interface ServerConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

export interface Assertion {
  type: string;
  name?: string;
  value?: string;
  pattern?: string;
  min?: number;
  max?: number;
  exact?: number;
  schema?: Record<string, unknown>;
  ms?: number;
}

export interface TestDefinition {
  name: string;
  action: "list_tools" | "call_tool" | "list_resources" | "list_prompts";
  tool?: string;
  args?: Record<string, unknown>;
  assert: Assertion[];
}

export interface McpTestConfig {
  server: ServerConfig;
  tests: TestDefinition[];
}

// --- Validation ---

const VALID_ACTIONS = ["list_tools", "call_tool", "list_resources", "list_prompts"] as const;

const VALID_ASSERTION_TYPES = [
  "success",
  "error",
  "error_contains",
  "output_contains",
  "output_matches",
  "output_json",
  "output_json_schema",
  "contains_tool",
  "tool_count",
  "resource_count",
  "prompt_count",
  "schema_valid",
  "response_time",
] as const;

export function validateConfig(config: unknown): McpTestConfig {
  if (!config || typeof config !== "object") {
    throw new Error("Config must be an object");
  }

  const c = config as Record<string, unknown>;

  // Validate server
  if (!c.server || typeof c.server !== "object") {
    throw new Error("Config must have a 'server' section");
  }
  const server = c.server as Record<string, unknown>;
  if (typeof server.command !== "string" || !server.command) {
    throw new Error("server.command must be a non-empty string");
  }
  if (server.args !== undefined && !Array.isArray(server.args)) {
    throw new Error("server.args must be an array");
  }
  if (server.env !== undefined && typeof server.env !== "object") {
    throw new Error("server.env must be an object");
  }

  // Validate tests
  if (!Array.isArray(c.tests) || c.tests.length === 0) {
    throw new Error("Config must have a non-empty 'tests' array");
  }

  for (let i = 0; i < c.tests.length; i++) {
    const test = c.tests[i] as Record<string, unknown>;
    if (typeof test.name !== "string" || !test.name) {
      throw new Error(`tests[${i}].name must be a non-empty string`);
    }
    if (!VALID_ACTIONS.includes(test.action as typeof VALID_ACTIONS[number])) {
      throw new Error(
        `tests[${i}].action must be one of: ${VALID_ACTIONS.join(", ")}`
      );
    }
    if (test.action === "call_tool" && typeof test.tool !== "string") {
      throw new Error(`tests[${i}] with action 'call_tool' must specify 'tool'`);
    }
    if (!Array.isArray(test.assert) || test.assert.length === 0) {
      throw new Error(`tests[${i}].assert must be a non-empty array`);
    }
    for (let j = 0; j < test.assert.length; j++) {
      const a = test.assert[j] as Record<string, unknown>;
      if (
        !VALID_ASSERTION_TYPES.includes(
          a.type as typeof VALID_ASSERTION_TYPES[number]
        )
      ) {
        throw new Error(
          `tests[${i}].assert[${j}].type '${a.type}' is not valid. Must be one of: ${VALID_ASSERTION_TYPES.join(", ")}`
        );
      }
    }
  }

  return config as McpTestConfig;
}

// --- Loading ---

export function loadConfig(filePath: string): McpTestConfig {
  if (!existsSync(filePath)) {
    throw new Error(`Config file not found: ${filePath}`);
  }
  const raw = readFileSync(filePath, "utf-8");
  const parsed = parseYaml(raw);
  return validateConfig(parsed);
}

// --- Init ---

const SAMPLE_CONFIG = `# mcptest.yaml — MCP server test suite
server:
  command: "node"
  args: ["./my-mcp-server.js"]
  env:
    API_KEY: "test-key"

tests:
  - name: "list tools returns expected tools"
    action: list_tools
    assert:
      - type: contains_tool
        name: "search"
      - type: tool_count
        min: 1

  - name: "search tool works"
    action: call_tool
    tool: "search"
    args:
      query: "test"
    assert:
      - type: success
      - type: output_contains
        value: "result"

  - name: "list resources"
    action: list_resources
    assert:
      - type: resource_count
        min: 0

  - name: "list prompts"
    action: list_prompts
    assert:
      - type: prompt_count
        min: 0
`;

export function initConfig(filePath: string): void {
  if (existsSync(filePath)) {
    throw new Error(`${filePath} already exists. Remove it first or use a different name.`);
  }
  writeFileSync(filePath, SAMPLE_CONFIG, "utf-8");
}
