import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type { ServerConfig } from "./config.js";

export interface McpTool {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

export interface McpResource {
  uri: string;
  name?: string;
  description?: string;
  mimeType?: string;
}

export interface McpPrompt {
  name: string;
  description?: string;
  arguments?: Array<{ name: string; description?: string; required?: boolean }>;
}

export interface ToolCallResult {
  content: Array<{ type: string; text?: string; [key: string]: unknown }>;
  isError?: boolean;
}

export class McpClient {
  private client: Client;
  private transport: StdioClientTransport | null = null;

  constructor() {
    this.client = new Client(
      { name: "mcptest", version: "0.1.0" },
      { capabilities: {} }
    );
  }

  async connect(serverConfig: ServerConfig): Promise<void> {
    this.transport = new StdioClientTransport({
      command: serverConfig.command,
      args: serverConfig.args,
      env: serverConfig.env
        ? { ...process.env, ...serverConfig.env } as Record<string, string>
        : undefined,
    });
    await this.client.connect(this.transport);
  }

  async listTools(): Promise<McpTool[]> {
    const result = await this.client.listTools();
    return result.tools as McpTool[];
  }

  async callTool(
    name: string,
    args: Record<string, unknown> = {}
  ): Promise<ToolCallResult> {
    const result = await this.client.callTool({ name, arguments: args });
    return result as ToolCallResult;
  }

  async listResources(): Promise<McpResource[]> {
    const result = await this.client.listResources();
    return result.resources as McpResource[];
  }

  async listPrompts(): Promise<McpPrompt[]> {
    const result = await this.client.listPrompts();
    return result.prompts as McpPrompt[];
  }

  async close(): Promise<void> {
    try {
      await this.transport?.close();
    } catch {
      // Ignore close errors
    }
  }
}
