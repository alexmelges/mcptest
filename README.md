# MCPTest

CI-native testing for MCP servers. Think "pytest for MCP servers."

## Quick Start

```bash
# Run with built-in demo server
npx mcptest --demo

# Initialize a config file
npx mcptest init

# Run tests
npx mcptest

# Custom config file
npx mcptest -f custom.yaml

# JSON output for CI
npx mcptest --format json

# Markdown output for PR comments
npx mcptest --format markdown

# Validate config without running
npx mcptest validate
```

## Configuration

Create a `mcptest.yaml` in your project:

```yaml
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
      - type: output_matches
        pattern: "\\d+ results"

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

## Test Actions

| Action | Description |
|--------|-------------|
| `list_tools` | Lists all tools the server exposes |
| `call_tool` | Calls a specific tool with arguments |
| `list_resources` | Lists all resources |
| `list_prompts` | Lists all prompts |

## Assertion Types

| Type | Description | Parameters |
|------|-------------|------------|
| `success` | Tool call returned without error | — |
| `error` | Tool call returned an error | — |
| `error_contains` | Error message contains string | `value` |
| `output_contains` | Output text contains string | `value` |
| `output_matches` | Output matches regex | `pattern` |
| `output_json` | Output is valid JSON | — |
| `output_json_schema` | Output matches JSON Schema | `schema` |
| `contains_tool` | Tools list contains named tool | `name` |
| `tool_count` | Number of tools | `min`, `max`, `exact` |
| `resource_count` | Number of resources | `min`, `max`, `exact` |
| `prompt_count` | Number of prompts | `min`, `max`, `exact` |
| `schema_valid` | All tool schemas are valid | — |
| `response_time` | Response within N ms | `ms` |

## Output Formats

**Text** (default) — colored terminal output:
```
✓ list tools returns expected tools (2ms)
  ✓ Tools list contains "echo"
  ✓ tool count is 4 (>= 3)
```

**JSON** — structured results for CI:
```bash
npx mcptest --format json
```

**Markdown** — for PR comments:
```bash
npx mcptest --format markdown
```

## GitHub Action

```yaml
- uses: your-org/mcptest@v1
  with:
    config: mcptest.yaml
```

## License

MIT
