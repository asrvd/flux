#!/usr/bin/env node
import { createSigner, message, spawn, result } from "@permaweb/aoconnect";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import Arweave from "arweave";
import { z } from "zod";
import { installPackage } from "./helpers/apm";
import { addBlueprint, fetchBlueprintCode } from "./helpers/blueprint";
import { runLuaCode } from "./lib/runLua";
import { listHandlers, addHandler, runHandler } from "./helpers/handlers";
import { sleep } from "./lib/utils";

// Helper function to clean and standardize output
function cleanOutput(result: any): string {
  if (!result) return "";

  return JSON.stringify(result, null, 2)
    .replace(/\\u001b\[\d+m/g, "")
    .replace(/\\n/g, "\n");
}

// Create an MCP server
const server = new McpServer({
  name: "ao-mcp",
  version: "1.0.0",
});

const arweave = Arweave.init({
  host: "arweave.net",
  port: 443,
  protocol: "https",
});

let wallet = null;
let signer: ReturnType<typeof createSigner> | undefined;

// Initialize wallet and signer before setting up tools
async function initializeWallet() {
  wallet = await arweave.wallets.generate();
  signer = createSigner(wallet);
}

// Initialize everything
async function initialize() {
  await initializeWallet();

  server.tool(
    "spawn",
    {
      tags: z.array(
        z.object({
          name: z.string(),
          value: z.string(),
        })
      ),
      needsSqlite: z.boolean().optional(),
    },
    async ({ tags, needsSqlite }) => {
      const processId = await spawn({
        module: needsSqlite
          ? "33d-3X8mpv6xYBlVB-eXMrPfH5Kzf6Hiwhcv0UA10sw"
          : "JArYBF-D8q2OmZ4Mok00sD2Y_6SYEQ7Hjx-6VZ_jl3g",
        signer,
        scheduler: "_GQ33BkPtZrqxA84vM8Zk-N2aO0toNNu_C-l-rawrBA",
        tags,
      });
      return {
        content: [{ type: "text", text: processId }],
      };
    }
  );

  server.tool(
    "send-message-to-process",
    {
      processId: z.string(),
      data: z.string(),
      tags: z
        .array(
          z.object({
            name: z.string(),
            value: z.string(),
          })
        )
        .optional(),
    },
    async ({ processId, data, tags }) => {
      const messageId = await message({
        process: processId,
        signer,
        data,
        tags,
      });
      await sleep(100);
      const output = await result({
        message: messageId,
        process: processId,
      });

      if (output.Error) {
        return {
          content: [{ type: "text", text: cleanOutput(output.Error) }],
        };
      }

      return {
        content: [{ type: "text", text: cleanOutput(output.Messages[0].Data) }],
      };
    }
  );

  server.tool(
    "apm-install",
    { packageName: z.string(), processId: z.string() },
    async ({ packageName, processId }) => {
      const result = await installPackage(packageName, processId, signer);
      return {
        content: [{ type: "text", text: cleanOutput(result) }],
      };
    }
  );

  server.tool(
    "load-token-blueprint",
    { processId: z.string() },
    async ({ processId }) => {
      const result = await addBlueprint("token", processId, signer);
      return {
        content: [{ type: "text", text: cleanOutput(result) }],
      };
    }
  );

  server.tool(
    "create-sqlite-based-handler",
    { processId: z.string(), handlerCode: z.string() },
    async ({ processId, handlerCode }) => {
      const code = `local sqlite = require('lsqlite3')\nDb = sqlite.open_memory()\n${handlerCode}`;
      const result = await runLuaCode(code, processId, signer);
      return {
        content: [{ type: "text", text: cleanOutput(result) }],
      };
    }
  );

  server.tool(
    "run-lua-in-process",
    {
      code: z.string(),
      processId: z.string(),
      tags: z
        .array(
          z.object({
            name: z.string(),
            value: z.string(),
          })
        )
        .optional(),
    },
    async ({ code, processId, tags }) => {
      const result = await runLuaCode(code, processId, signer, tags);
      return {
        content: [
          {
            type: "text",
            text: cleanOutput(result),
          },
        ],
      };
    }
  );

  server.tool(
    "load-blueprint",
    { url: z.string(), processId: z.string() },
    async ({ url, processId }) => {
      const code = await fetchBlueprintCode(url);
      const result = await runLuaCode(code, processId, signer);
      return {
        content: [{ type: "text", text: cleanOutput(result) }],
      };
    }
  );

  server.tool(
    "load-local-blueprint",
    { blueprintCode: z.string(), processId: z.string() },
    async ({ blueprintCode, processId }) => {
      const result = await runLuaCode(blueprintCode, processId, signer);
      return {
        content: [{ type: "text", text: cleanOutput(result) }],
      };
    }
  );

  server.tool(
    "load-official-blueprint",
    { blueprintName: z.string(), processId: z.string() },
    async ({ blueprintName, processId }) => {
      const result = await addBlueprint(blueprintName, processId, signer);
      return {
        content: [{ type: "text", text: cleanOutput(result) }],
      };
    }
  );

  server.tool(
    "list-available-handlers",
    { processId: z.string() },
    async ({ processId }) => {
      const handlers = await listHandlers(processId, signer);
      return {
        content: [{ type: "text", text: cleanOutput(handlers) }],
      };
    }
  );

  server.tool(
    "create-handler",
    { processId: z.string(), handlerCode: z.string() },
    async ({ processId, handlerCode }) => {
      const result = await addHandler(processId, handlerCode, signer);
      return {
        content: [{ type: "text", text: cleanOutput(result) }],
      };
    }
  );

  server.tool(
    "run-handler-using-handler-name",
    { processId: z.string(), handlerName: z.string(), data: z.string() },
    async ({ processId, handlerName, data }) => {
      const result = await runHandler(processId, handlerName, data, signer);
      if (result.Error) {
        return {
          content: [{ type: "text", text: cleanOutput(result.Error) }],
        };
      }
      return {
        content: [{ type: "text", text: cleanOutput(result.Messages[0].Data) }],
      };
    }
  );
}

// Start the initialization
initialize().catch(console.error);

// Export the server
export default server;
