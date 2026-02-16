#!/usr/bin/env node
import { Command } from "commander";
import { resolve } from "node:path";
import { loadConfig, initConfig, validateConfig } from "./config.js";
import { runTests } from "./runner.js";
import { formatText } from "./reporters/text.js";
import { formatJson } from "./reporters/json.js";
import { formatMarkdown } from "./reporters/markdown.js";
import { readFileSync } from "node:fs";
import { parse as parseYaml } from "yaml";

const DEMO_CONFIG = {
  server: {
    command: "node",
    args: [resolve(import.meta.dirname, "demo", "server.js")],
  },
  tests: [
    {
      name: "list tools returns expected tools",
      action: "list_tools" as const,
      assert: [
        { type: "contains_tool", name: "echo" },
        { type: "contains_tool", name: "add" },
        { type: "contains_tool", name: "search" },
        { type: "tool_count", min: 3 },
        { type: "schema_valid" },
      ],
    },
    {
      name: "echo tool works",
      action: "call_tool" as const,
      tool: "echo",
      args: { message: "hello mcptest" },
      assert: [
        { type: "success" },
        { type: "output_contains", value: "hello mcptest" },
      ],
    },
    {
      name: "add tool works",
      action: "call_tool" as const,
      tool: "add",
      args: { a: 2, b: 3 },
      assert: [
        { type: "success" },
        { type: "output_contains", value: "5" },
      ],
    },
    {
      name: "search tool returns results",
      action: "call_tool" as const,
      tool: "search",
      args: { query: "test" },
      assert: [
        { type: "success" },
        { type: "output_contains", value: "result" },
        { type: "output_matches", pattern: "\\d+ results" },
        { type: "output_json" },
        { type: "response_time", ms: 5000 },
      ],
    },
    {
      name: "get_json returns valid JSON matching schema",
      action: "call_tool" as const,
      tool: "get_json",
      args: { key: "test" },
      assert: [
        { type: "success" },
        { type: "output_json" },
        {
          type: "output_json_schema",
          schema: {
            type: "object",
            required: ["key", "value"],
            properties: {
              key: { type: "string" },
              value: { type: "string" },
            },
          },
        },
      ],
    },
    {
      name: "list resources",
      action: "list_resources" as const,
      assert: [{ type: "resource_count", min: 1 }],
    },
    {
      name: "list prompts",
      action: "list_prompts" as const,
      assert: [{ type: "prompt_count", min: 1 }],
    },
  ],
};

const program = new Command();

program
  .name("mcptest")
  .description("CI-native testing for MCP servers")
  .version("0.1.0")
  .option("-f, --file <path>", "path to config file", "mcptest.yaml")
  .option(
    "--format <format>",
    "output format: text, json, markdown",
    "text"
  )
  .option("--demo", "run with built-in demo server")
  .action(async (opts) => {
    try {
      const config = opts.demo
        ? DEMO_CONFIG
        : loadConfig(resolve(opts.file));

      const result = await runTests(config);

      switch (opts.format) {
        case "json":
          process.stdout.write(formatJson(result) + "\n");
          break;
        case "markdown":
          process.stdout.write(formatMarkdown(result) + "\n");
          break;
        default:
          process.stdout.write(formatText(result));
          break;
      }

      process.exit(result.totalFailed > 0 ? 1 : 0);
    } catch (e: unknown) {
      const err = e as Error;
      process.stderr.write(`Error: ${err.message}\n`);
      process.exit(1);
    }
  });

program
  .command("init")
  .description("Generate a sample mcptest.yaml")
  .option("-f, --file <path>", "output file path", "mcptest.yaml")
  .action((opts) => {
    try {
      initConfig(resolve(opts.file));
      process.stdout.write(`Created ${opts.file}\n`);
    } catch (e: unknown) {
      const err = e as Error;
      process.stderr.write(`Error: ${err.message}\n`);
      process.exit(1);
    }
  });

program
  .command("validate")
  .description("Validate config file without running tests")
  .option("-f, --file <path>", "config file path", "mcptest.yaml")
  .action((opts) => {
    try {
      const filePath = resolve(opts.file);
      const raw = readFileSync(filePath, "utf-8");
      const parsed = parseYaml(raw);
      validateConfig(parsed);
      process.stdout.write(`Config ${opts.file} is valid.\n`);
    } catch (e: unknown) {
      const err = e as Error;
      process.stderr.write(`Validation error: ${err.message}\n`);
      process.exit(1);
    }
  });

program.parse();
