# MCPTest — CI-Native Testing for MCP Servers

## What to Build

A TypeScript CLI + GitHub Action that tests MCP servers automatically. Think "pytest for MCP servers."

## Core Features (MVP)

### 1. MCP Server Lifecycle Management
- Start an MCP server via stdio transport (spawn process with command + args)
- Initialize MCP session (initialize handshake)
- Clean shutdown

### 2. Schema Validation
- Validate all tool schemas against MCP spec (JSON Schema compliance)
- Check required fields: name, description, inputSchema
- Validate inputSchema is valid JSON Schema
- Report malformed tools

### 3. YAML Test Definitions
```yaml
# mcptest.yaml
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
      - type: success  # no error returned
      - type: output_contains
        value: "result"
      - type: output_matches
        pattern: "\\d+ results"

  - name: "invalid args returns error"
    action: call_tool
    tool: "search"
    args: {}
    assert:
      - type: error  # expects an error
      - type: error_contains
        value: "required"

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
```

### 4. Assertion Types
- `success` — tool call returned without error
- `error` — tool call returned an error
- `error_contains` — error message contains string
- `output_contains` — output text contains string
- `output_matches` — output matches regex
- `output_json` — output is valid JSON
- `output_json_schema` — output matches JSON Schema
- `contains_tool` — tools list contains named tool
- `tool_count` — number of tools (min/max/exact)
- `resource_count` — number of resources (min/max/exact)
- `prompt_count` — number of prompts (min/max/exact)
- `schema_valid` — all tool schemas are valid JSON Schema
- `response_time` — response within N ms

### 5. CLI Interface
```bash
npx mcptest                    # run mcptest.yaml in current dir
npx mcptest -f custom.yaml     # custom config file
npx mcptest --format json      # JSON output for CI
npx mcptest --format markdown  # Markdown output
npx mcptest init               # generate sample mcptest.yaml
npx mcptest validate           # validate config without running
npx mcptest --demo             # run with built-in demo server
```

### 6. Output Formats
- **text** (default) — colored terminal output with pass/fail
- **json** — structured results for CI parsing
- **markdown** — for PR comments

### 7. Demo Mode
- Built-in simple MCP server for `--demo` flag
- Shows the tool working without any setup

### 8. Init Command
- `mcptest init` generates a starter mcptest.yaml

## Architecture

```
mcptest/
├── src/
│   ├── index.ts          # CLI entry point
│   ├── config.ts         # YAML config parser + validation
│   ├── runner.ts         # Test runner orchestration
│   ├── client.ts         # MCP client (stdio transport)
│   ├── assertions.ts     # All assertion implementations
│   ├── reporters/
│   │   ├── text.ts       # Terminal output
│   │   ├── json.ts       # JSON output
│   │   └── markdown.ts   # Markdown output
│   └── demo/
│       └── server.ts     # Built-in demo MCP server
├── package.json
├── tsconfig.json
├── README.md
├── LICENSE
└── tests/
    └── ...
```

## Tech Stack
- TypeScript + Node.js
- `@modelcontextprotocol/sdk` for MCP client
- `yaml` for config parsing
- `ajv` for JSON Schema validation
- `chalk` for terminal colors
- `commander` for CLI

## Key Design Decisions
- **Stdio transport only** for MVP (HTTP/SSE in v2)
- **No LLM dependency** — all assertions are deterministic
- **Fast** — spin up server, run tests, tear down. Target <10s for typical suite
- **Zero config for basics** — `mcptest --demo` works instantly

## GitHub Action (action.yml)
```yaml
name: 'MCPTest'
description: 'CI-native testing for MCP servers'
inputs:
  config:
    description: 'Path to mcptest.yaml'
    default: 'mcptest.yaml'
runs:
  using: 'node20'
  main: 'dist/action.js'
```

## Test the Output
After building, run `npx mcptest --demo` and verify it works end-to-end.

## Quality Bar
- All TypeScript, strict mode
- At least 20 unit tests
- README with usage examples
- MIT license
- Clean npm package (proper package.json with bin, files, etc.)
