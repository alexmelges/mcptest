#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
  name: "mcptest-demo",
  version: "0.1.0",
});

// --- Tools ---

server.tool(
  "echo",
  "Echoes back the input message",
  { message: z.string().describe("The message to echo") },
  async ({ message }) => ({
    content: [{ type: "text", text: message }],
  })
);

server.tool(
  "add",
  "Adds two numbers",
  {
    a: z.number().describe("First number"),
    b: z.number().describe("Second number"),
  },
  async ({ a, b }) => ({
    content: [{ type: "text", text: String(a + b) }],
  })
);

server.tool(
  "search",
  "Searches for items matching a query",
  { query: z.string().describe("Search query") },
  async ({ query }) => ({
    content: [
      {
        type: "text",
        text: JSON.stringify({
          query,
          results: [
            { id: 1, title: `Result for "${query}"`, score: 0.95 },
            { id: 2, title: `Another result for "${query}"`, score: 0.8 },
          ],
          total: "2 results found",
        }),
      },
    ],
  })
);

server.tool(
  "get_json",
  "Returns a JSON object",
  { key: z.string().describe("Object key") },
  async ({ key }) => ({
    content: [
      {
        type: "text",
        text: JSON.stringify({ key, value: "test-value", timestamp: Date.now() }),
      },
    ],
  })
);

// --- Resources ---

server.resource("docs", "mcptest://docs/readme", async () => ({
  contents: [
    {
      uri: "mcptest://docs/readme",
      text: "# MCPTest Demo\nThis is a demo MCP server for testing.",
      mimeType: "text/markdown",
    },
  ],
}));

// --- Prompts ---

server.prompt("greet", "Generates a greeting", { name: z.string() }, ({ name }) => ({
  messages: [
    {
      role: "user" as const,
      content: { type: "text" as const, text: `Say hello to ${name}` },
    },
  ],
}));

// --- Start ---

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  process.stderr.write(`Demo server error: ${err}\n`);
  process.exit(1);
});
