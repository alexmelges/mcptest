import { describe, it, expect } from "vitest";
import { evaluateAssertion } from "../src/assertions.js";
import type { AssertionContext } from "../src/assertions.js";
import type { Assertion } from "../src/config.js";

function makeToolResult(text: string, isError = false) {
  return { content: [{ type: "text", text }], isError };
}

describe("evaluateAssertion", () => {
  // --- success ---
  describe("success", () => {
    it("passes when tool call succeeds", () => {
      const result = evaluateAssertion(
        { type: "success" },
        { toolResult: makeToolResult("ok") }
      );
      expect(result.passed).toBe(true);
    });

    it("fails when tool call errors", () => {
      const result = evaluateAssertion(
        { type: "success" },
        { toolResult: makeToolResult("err", true) }
      );
      expect(result.passed).toBe(false);
    });

    it("fails when no tool result", () => {
      const result = evaluateAssertion({ type: "success" }, {});
      expect(result.passed).toBe(false);
    });
  });

  // --- error ---
  describe("error", () => {
    it("passes when tool call returns error", () => {
      const result = evaluateAssertion(
        { type: "error" },
        { toolResult: makeToolResult("something broke", true) }
      );
      expect(result.passed).toBe(true);
    });

    it("fails when tool call succeeds", () => {
      const result = evaluateAssertion(
        { type: "error" },
        { toolResult: makeToolResult("ok") }
      );
      expect(result.passed).toBe(false);
    });
  });

  // --- error_contains ---
  describe("error_contains", () => {
    it("passes when error message contains value", () => {
      const result = evaluateAssertion(
        { type: "error_contains", value: "required" },
        { toolResult: makeToolResult("field is required", true) }
      );
      expect(result.passed).toBe(true);
    });

    it("fails when error does not contain value", () => {
      const result = evaluateAssertion(
        { type: "error_contains", value: "missing" },
        { toolResult: makeToolResult("field is required", true) }
      );
      expect(result.passed).toBe(false);
    });

    it("fails when call succeeded (not error)", () => {
      const result = evaluateAssertion(
        { type: "error_contains", value: "required" },
        { toolResult: makeToolResult("ok") }
      );
      expect(result.passed).toBe(false);
    });
  });

  // --- output_contains ---
  describe("output_contains", () => {
    it("passes when output contains value", () => {
      const result = evaluateAssertion(
        { type: "output_contains", value: "hello" },
        { toolResult: makeToolResult("hello world") }
      );
      expect(result.passed).toBe(true);
    });

    it("fails when output does not contain value", () => {
      const result = evaluateAssertion(
        { type: "output_contains", value: "goodbye" },
        { toolResult: makeToolResult("hello world") }
      );
      expect(result.passed).toBe(false);
    });

    it("fails when no tool result", () => {
      const result = evaluateAssertion(
        { type: "output_contains", value: "test" },
        {}
      );
      expect(result.passed).toBe(false);
    });
  });

  // --- output_matches ---
  describe("output_matches", () => {
    it("passes when output matches regex", () => {
      const result = evaluateAssertion(
        { type: "output_matches", pattern: "\\d+ results" },
        { toolResult: makeToolResult("Found 42 results here") }
      );
      expect(result.passed).toBe(true);
    });

    it("fails when output does not match regex", () => {
      const result = evaluateAssertion(
        { type: "output_matches", pattern: "^\\d+$" },
        { toolResult: makeToolResult("not a number") }
      );
      expect(result.passed).toBe(false);
    });
  });

  // --- output_json ---
  describe("output_json", () => {
    it("passes for valid JSON", () => {
      const result = evaluateAssertion(
        { type: "output_json" },
        { toolResult: makeToolResult('{"key": "value"}') }
      );
      expect(result.passed).toBe(true);
    });

    it("fails for invalid JSON", () => {
      const result = evaluateAssertion(
        { type: "output_json" },
        { toolResult: makeToolResult("not json") }
      );
      expect(result.passed).toBe(false);
    });
  });

  // --- output_json_schema ---
  describe("output_json_schema", () => {
    it("passes when output matches schema", () => {
      const result = evaluateAssertion(
        {
          type: "output_json_schema",
          schema: {
            type: "object",
            required: ["name"],
            properties: { name: { type: "string" } },
          },
        },
        { toolResult: makeToolResult('{"name": "test"}') }
      );
      expect(result.passed).toBe(true);
    });

    it("fails when output doesn't match schema", () => {
      const result = evaluateAssertion(
        {
          type: "output_json_schema",
          schema: {
            type: "object",
            required: ["name"],
            properties: { name: { type: "string" } },
          },
        },
        { toolResult: makeToolResult('{"id": 123}') }
      );
      expect(result.passed).toBe(false);
    });

    it("fails for non-JSON output", () => {
      const result = evaluateAssertion(
        {
          type: "output_json_schema",
          schema: { type: "object" },
        },
        { toolResult: makeToolResult("not json") }
      );
      expect(result.passed).toBe(false);
    });
  });

  // --- contains_tool ---
  describe("contains_tool", () => {
    const tools = [
      { name: "search", description: "Search", inputSchema: {} },
      { name: "echo", description: "Echo", inputSchema: {} },
    ];

    it("passes when tool is found", () => {
      const result = evaluateAssertion(
        { type: "contains_tool", name: "search" },
        { tools }
      );
      expect(result.passed).toBe(true);
    });

    it("fails when tool is not found", () => {
      const result = evaluateAssertion(
        { type: "contains_tool", name: "delete" },
        { tools }
      );
      expect(result.passed).toBe(false);
    });

    it("fails when no tools available", () => {
      const result = evaluateAssertion(
        { type: "contains_tool", name: "search" },
        {}
      );
      expect(result.passed).toBe(false);
    });
  });

  // --- tool_count ---
  describe("tool_count", () => {
    const ctx: AssertionContext = {
      tools: [
        { name: "a" },
        { name: "b" },
        { name: "c" },
      ],
    };

    it("passes with exact match", () => {
      const result = evaluateAssertion(
        { type: "tool_count", exact: 3 },
        ctx
      );
      expect(result.passed).toBe(true);
    });

    it("fails with wrong exact count", () => {
      const result = evaluateAssertion(
        { type: "tool_count", exact: 5 },
        ctx
      );
      expect(result.passed).toBe(false);
    });

    it("passes with min constraint", () => {
      const result = evaluateAssertion(
        { type: "tool_count", min: 2 },
        ctx
      );
      expect(result.passed).toBe(true);
    });

    it("fails when below min", () => {
      const result = evaluateAssertion(
        { type: "tool_count", min: 5 },
        ctx
      );
      expect(result.passed).toBe(false);
    });

    it("passes with max constraint", () => {
      const result = evaluateAssertion(
        { type: "tool_count", max: 5 },
        ctx
      );
      expect(result.passed).toBe(true);
    });

    it("fails when above max", () => {
      const result = evaluateAssertion(
        { type: "tool_count", max: 1 },
        ctx
      );
      expect(result.passed).toBe(false);
    });

    it("passes with min+max range", () => {
      const result = evaluateAssertion(
        { type: "tool_count", min: 2, max: 5 },
        ctx
      );
      expect(result.passed).toBe(true);
    });
  });

  // --- resource_count ---
  describe("resource_count", () => {
    it("passes with correct count", () => {
      const result = evaluateAssertion(
        { type: "resource_count", min: 0 },
        { resources: [] }
      );
      expect(result.passed).toBe(true);
    });

    it("passes when resources meet min", () => {
      const result = evaluateAssertion(
        { type: "resource_count", min: 1 },
        { resources: [{ uri: "test://a", name: "a" }] }
      );
      expect(result.passed).toBe(true);
    });
  });

  // --- prompt_count ---
  describe("prompt_count", () => {
    it("passes with correct count", () => {
      const result = evaluateAssertion(
        { type: "prompt_count", exact: 2 },
        { prompts: [{ name: "a" }, { name: "b" }] }
      );
      expect(result.passed).toBe(true);
    });

    it("fails with wrong count", () => {
      const result = evaluateAssertion(
        { type: "prompt_count", exact: 3 },
        { prompts: [{ name: "a" }] }
      );
      expect(result.passed).toBe(false);
    });
  });

  // --- schema_valid ---
  describe("schema_valid", () => {
    it("passes for valid tool schemas", () => {
      const result = evaluateAssertion(
        { type: "schema_valid" },
        {
          tools: [
            {
              name: "test",
              description: "A test tool",
              inputSchema: {
                type: "object",
                properties: { q: { type: "string" } },
              },
            },
          ],
        }
      );
      expect(result.passed).toBe(true);
    });

    it("fails when no tools available", () => {
      const result = evaluateAssertion(
        { type: "schema_valid" },
        { tools: [] }
      );
      expect(result.passed).toBe(false);
    });
  });

  // --- response_time ---
  describe("response_time", () => {
    it("passes when within time limit", () => {
      const result = evaluateAssertion(
        { type: "response_time", ms: 1000 },
        { elapsedMs: 50 }
      );
      expect(result.passed).toBe(true);
    });

    it("fails when exceeding time limit", () => {
      const result = evaluateAssertion(
        { type: "response_time", ms: 10 },
        { elapsedMs: 500 }
      );
      expect(result.passed).toBe(false);
    });

    it("passes when exactly at limit", () => {
      const result = evaluateAssertion(
        { type: "response_time", ms: 100 },
        { elapsedMs: 100 }
      );
      expect(result.passed).toBe(true);
    });
  });

  // --- unknown type ---
  describe("unknown assertion type", () => {
    it("fails with helpful message", () => {
      const result = evaluateAssertion(
        { type: "nonexistent" } as Assertion,
        {}
      );
      expect(result.passed).toBe(false);
      expect(result.message).toContain("Unknown assertion type");
    });
  });

  // --- multi-content output ---
  describe("multi-content tool result", () => {
    it("concatenates multiple text content blocks", () => {
      const result = evaluateAssertion(
        { type: "output_contains", value: "hello world" },
        {
          toolResult: {
            content: [
              { type: "text", text: "hello" },
              { type: "text", text: " world" },
            ],
          },
        }
      );
      // text blocks are joined with \n, so "hello\n world" doesn't contain "hello world"
      expect(result.passed).toBe(false);
    });

    it("ignores non-text content blocks", () => {
      const result = evaluateAssertion(
        { type: "output_contains", value: "hello" },
        {
          toolResult: {
            content: [
              { type: "image", data: "base64..." },
              { type: "text", text: "hello" },
            ],
          },
        }
      );
      expect(result.passed).toBe(true);
    });
  });
});
