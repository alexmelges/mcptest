# 🧪 MCPTest

> **CI-native testing for MCP servers — catch breaking changes before your users do.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node 18+](https://img.shields.io/badge/node-18+-green.svg)](https://nodejs.org)

---

## The Problem

You build an MCP server. It works in Claude Desktop. You push a change. **Something breaks, and you find out from a confused user.**

MCP servers have no testing story. The [official inspector](https://github.com/anthropics/mcp-inspector) is manual. Every debugging tool is interactive. Nothing runs in CI.

## The Solution

MCPTest gives you `pytest`-style testing for MCP servers:

```yaml
# mcptest.yaml
server:
  command: "node"
  args: ["./my-server.js"]

tests:
  - name: "search tool works"
    action: call_tool
    tool: "search"
    args: { query: "test" }
    assert:
      - type: success
      - type: output_contains
        value: "result"
```

```bash
npx mcptest
# ✓ search tool works (12ms)
#   ✓ Call succeeded
#   ✓ Output contains "result"
# 1 passed
```

## Quick Start

```bash
# Try it with the built-in demo server
npx mcptest --demo

# Generate a config for your server
npx mcptest init

# Run your tests
npx mcptest

# CI-friendly JSON output
npx mcptest --format json
```

## Features

- **13 assertion types** — tool calls, schemas, counts, regex, JSON schema, response time
- **3 transport types** — stdio, SSE, and Streamable HTTP
- **3 output formats** — text (colored), JSON (CI), markdown (PR comments)  
- **Zero config demo** — `npx mcptest --demo` to see it work instantly
- **YAML test definitions** — readable, version-controllable, reviewable
- **GitHub Action** — drop into any CI pipeline

## Test Actions

| Action | Description |
|--------|-------------|
| `list_tools` | List all tools the server exposes |
| `call_tool` | Call a specific tool with arguments |
| `list_resources` | List all resources |
| `list_prompts` | List all prompts |

## Assertion Types

| Type | Description | Parameters |
|------|-------------|------------|
| `success` | Tool call succeeded | — |
| `error` | Tool call returned an error | — |
| `error_contains` | Error message contains string | `value` |
| `output_contains` | Output text contains string | `value` |
| `output_matches` | Output matches regex | `pattern` |
| `output_json` | Output is valid JSON | — |
| `output_json_schema` | Output matches JSON Schema | `schema` |
| `contains_tool` | Tool list includes named tool | `name` |
| `tool_count` | Number of tools in range | `min`, `max`, `exact` |
| `resource_count` | Number of resources in range | `min`, `max`, `exact` |
| `prompt_count` | Number of prompts in range | `min`, `max`, `exact` |
| `schema_valid` | All tool schemas are valid JSON Schema | — |
| `response_time` | Response within threshold | `ms` |

## GitHub Action

```yaml
# .github/workflows/mcp-test.yml
name: MCP Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18
      - run: npm install
      - uses: alexmelges/mcptest@v1
        with:
          config: mcptest.yaml
```

## Transport Types

MCPTest supports all MCP transport types:

```yaml
# Stdio (default) — local servers
server:
  command: "node"
  args: ["./my-server.js"]

# SSE — remote servers with Server-Sent Events
server:
  transport: sse
  url: "http://localhost:3000/sse"
  headers:
    Authorization: "Bearer my-token"

# Streamable HTTP — modern remote servers
server:
  transport: streamable-http
  url: "http://localhost:3000/mcp"
  headers:
    Authorization: "Bearer my-token"
```

No `transport` field defaults to `stdio` for backward compatibility.

## Full Example

```yaml
server:
  command: "node"
  args: ["./my-mcp-server.js"]
  env:
    API_KEY: "test-key"

tests:
  - name: "server exposes expected tools"
    action: list_tools
    assert:
      - type: contains_tool
        name: "search"
      - type: contains_tool
        name: "fetch"
      - type: tool_count
        min: 2
      - type: schema_valid

  - name: "search returns results"
    action: call_tool
    tool: "search"
    args:
      query: "hello world"
    assert:
      - type: success
      - type: output_contains
        value: "result"
      - type: output_json
      - type: response_time
        ms: 5000

  - name: "invalid args return helpful error"
    action: call_tool
    tool: "search"
    args: {}
    assert:
      - type: error
      - type: error_contains
        value: "query"

  - name: "resources are available"
    action: list_resources
    assert:
      - type: resource_count
        min: 0

  - name: "prompts are available"
    action: list_prompts
    assert:
      - type: prompt_count
        min: 0
```

## Output Formats

**Text** (default) — colored terminal output:
```
✓ server exposes expected tools (3ms)
  ✓ Tools list contains "search"
  ✓ Tools list contains "fetch"  
  ✓ tool count is 4 (>= 2)
  ✓ All tool schemas are valid
✓ search returns results (45ms)
  ✓ Call succeeded
  ✓ Output contains "result"
  ✓ Output is valid JSON
  ✓ Response time 45ms <= 5000ms

5 passed
```

**JSON** — for CI integration:
```bash
npx mcptest --format json | jq '.summary'
# { "total": 5, "passed": 5, "failed": 0 }
```

**Markdown** — for PR comments:
```bash
npx mcptest --format markdown >> $GITHUB_STEP_SUMMARY
```

## Validate Without Running

```bash
npx mcptest validate
# ✓ Config is valid (5 tests defined)
```

## Part of the Agent QA Suite

MCPTest is built alongside [AgentProbe](https://github.com/alexmelges/agentprobe) (adversarial security testing) and [AgentCI](https://github.com/alexmelges/agentci) (behavioral regression testing). Together, they provide comprehensive quality assurance for AI agent infrastructure.

## License

MIT
