import { describe, it, expect } from "vitest";
import { validateConfig, loadConfig, initConfig } from "../src/config.js";
import { existsSync, unlinkSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("validateConfig", () => {
  it("accepts a valid config", () => {
    const config = {
      server: { command: "node", args: ["server.js"] },
      tests: [
        {
          name: "test 1",
          action: "list_tools",
          assert: [{ type: "tool_count", min: 1 }],
        },
      ],
    };
    expect(() => validateConfig(config)).not.toThrow();
  });

  it("rejects missing server", () => {
    expect(() => validateConfig({ tests: [] })).toThrow("server");
  });

  it("rejects missing command", () => {
    expect(() =>
      validateConfig({
        server: {},
        tests: [
          { name: "t", action: "list_tools", assert: [{ type: "success" }] },
        ],
      })
    ).toThrow("command");
  });

  it("rejects empty tests array", () => {
    expect(() =>
      validateConfig({ server: { command: "node" }, tests: [] })
    ).toThrow("non-empty");
  });

  it("rejects invalid action", () => {
    expect(() =>
      validateConfig({
        server: { command: "node" },
        tests: [
          { name: "t", action: "invalid_action", assert: [{ type: "success" }] },
        ],
      })
    ).toThrow("action");
  });

  it("rejects call_tool without tool name", () => {
    expect(() =>
      validateConfig({
        server: { command: "node" },
        tests: [
          { name: "t", action: "call_tool", assert: [{ type: "success" }] },
        ],
      })
    ).toThrow("tool");
  });

  it("rejects invalid assertion type", () => {
    expect(() =>
      validateConfig({
        server: { command: "node" },
        tests: [
          {
            name: "t",
            action: "list_tools",
            assert: [{ type: "invalid_assertion" }],
          },
        ],
      })
    ).toThrow("invalid_assertion");
  });

  it("rejects empty assert array", () => {
    expect(() =>
      validateConfig({
        server: { command: "node" },
        tests: [{ name: "t", action: "list_tools", assert: [] }],
      })
    ).toThrow("non-empty");
  });

  it("rejects non-object config", () => {
    expect(() => validateConfig(null)).toThrow("object");
    expect(() => validateConfig("string")).toThrow("object");
  });

  it("rejects test without name", () => {
    expect(() =>
      validateConfig({
        server: { command: "node" },
        tests: [{ action: "list_tools", assert: [{ type: "success" }] }],
      })
    ).toThrow("name");
  });

  it("accepts all valid assertion types", () => {
    const types = [
      "success", "error", "error_contains", "output_contains",
      "output_matches", "output_json", "output_json_schema",
      "contains_tool", "tool_count", "resource_count", "prompt_count",
      "schema_valid", "response_time",
    ];
    for (const type of types) {
      expect(() =>
        validateConfig({
          server: { command: "node" },
          tests: [
            { name: "t", action: "list_tools", assert: [{ type }] },
          ],
        })
      ).not.toThrow();
    }
  });

  it("accepts config with env vars", () => {
    const config = {
      server: {
        command: "node",
        args: ["server.js"],
        env: { API_KEY: "test" },
      },
      tests: [
        { name: "t", action: "list_tools", assert: [{ type: "success" }] },
      ],
    };
    expect(() => validateConfig(config)).not.toThrow();
  });

  it("rejects non-array args", () => {
    expect(() =>
      validateConfig({
        server: { command: "node", args: "not-array" },
        tests: [
          { name: "t", action: "list_tools", assert: [{ type: "success" }] },
        ],
      })
    ).toThrow("args");
  });
});

describe("loadConfig", () => {
  it("throws for non-existent file", () => {
    expect(() => loadConfig("/nonexistent/path.yaml")).toThrow("not found");
  });

  it("loads a valid YAML config", () => {
    const dir = join(tmpdir(), `mcptest-${Date.now()}`);
    mkdirSync(dir, { recursive: true });
    const path = join(dir, "test.yaml");
    writeFileSync(
      path,
      `server:\n  command: node\n  args: ["s.js"]\ntests:\n  - name: t\n    action: list_tools\n    assert:\n      - type: success\n`
    );
    const config = loadConfig(path);
    expect(config.server.command).toBe("node");
    expect(config.tests).toHaveLength(1);
    unlinkSync(path);
  });
});

describe("initConfig", () => {
  it("creates a new config file", () => {
    const dir = join(tmpdir(), `mcptest-init-${Date.now()}`);
    mkdirSync(dir, { recursive: true });
    const path = join(dir, "mcptest.yaml");
    initConfig(path);
    expect(existsSync(path)).toBe(true);
    unlinkSync(path);
  });

  it("throws if file already exists", () => {
    const dir = join(tmpdir(), `mcptest-init2-${Date.now()}`);
    mkdirSync(dir, { recursive: true });
    const path = join(dir, "mcptest.yaml");
    writeFileSync(path, "existing");
    expect(() => initConfig(path)).toThrow("already exists");
    unlinkSync(path);
  });
});
