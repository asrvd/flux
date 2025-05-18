import {
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import Arweave from "arweave";
import { createSigner, message, spawn, result } from "@permaweb/aoconnect";
import { z } from "zod";
import { installPackage } from "./helpers/apm";
import { addBlueprint, fetchBlueprintCode } from "./helpers/blueprint";
import { runLuaCode } from "./lib/runLua";
import { listHandlers, addHandler, runHandler } from "./helpers/handlers";
import { sleep } from "./lib/utils";

function cleanOutput(result: any): string {
  if (!result) return "";

  return JSON.stringify(result, null, 2)
    .replace(/\\u001b\[\d+m/g, "")
    .replace(/\\n/g, "\n");
}

class FluxServer {
  public server: McpServer;
  private signer!: ReturnType<typeof createSigner>;
  private initialized = false;

  constructor() {
    this.server = new McpServer(
      {
        name: "flux",
        version: "1.0.0",
      },
      {
        capabilities: {},
      }
    );
  }

  async initialize() {
    if (this.initialized) return;

    const arweave = Arweave.init({
      host: "arweave.net",
      port: 443,
      protocol: "https",
    });

    // Generate wallet and create signer
    const wallet = await arweave.wallets.generate();
    this.signer = createSigner(wallet);

    // Register all tools
    await this.registerTools();

    this.initialized = true;
  }

  private async registerTools() {
    this.server.tool(
      "spawn",
      "spawn a new AO process",
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
          signer: this.signer,
          scheduler: "_GQ33BkPtZrqxA84vM8Zk-N2aO0toNNu_C-l-rawrBA",
          tags,
        });
        return {
          content: [{ type: "text", text: processId }],
        };
      }
    );

    this.server.tool(
      "send-message-to-process",
      "send a message to an existing AO process",
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
          signer: this.signer,
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
          content: [
            { type: "text", text: cleanOutput(output.Messages[0].Data) },
          ],
        };
      }
    );

    this.server.tool(
      "apm-install",
      "install a package in an existing AO process",
      { packageName: z.string(), processId: z.string() },
      async ({ packageName, processId }) => {
        const result = await installPackage(
          packageName,
          processId,
          this.signer
        );
        return {
          content: [{ type: "text", text: cleanOutput(result) }],
        };
      }
    );

    this.server.tool(
      "load-token-blueprint",
      "load the token blueprint in an existing AO process",
      { processId: z.string() },
      async ({ processId }) => {
        const result = await addBlueprint("token", processId, this.signer);
        return {
          content: [{ type: "text", text: cleanOutput(result) }],
        };
      }
    );

    this.server.tool(
      "create-sqlite-based-handler",
      "create a new sqlite based handler in an existing AO process",
      { processId: z.string(), handlerCode: z.string() },
      async ({ processId, handlerCode }) => {
        const code = `local sqlite = require('lsqlite3')\nDb = sqlite.open_memory()\n${handlerCode}`;
        const result = await runLuaCode(code, processId, this.signer);
        return {
          content: [{ type: "text", text: cleanOutput(result) }],
        };
      }
    );

    this.server.tool(
      "run-lua-in-process",
      "run a lua script in an existing AO process",
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
        const result = await runLuaCode(code, processId, this.signer, tags);
        return {
          content: [{ type: "text", text: cleanOutput(result) }],
        };
      }
    );

    this.server.tool(
      "load-blueprint",
      "load a blueprint in an existing AO process",
      { url: z.string(), processId: z.string() },
      async ({ url, processId }) => {
        const code = await fetchBlueprintCode(url);
        const result = await runLuaCode(code, processId, this.signer);
        return {
          content: [{ type: "text", text: cleanOutput(result) }],
        };
      }
    );

    this.server.tool(
      "load-local-blueprint",
      "load a local blueprint in an existing AO process",
      { blueprintCode: z.string(), processId: z.string() },
      async ({ blueprintCode, processId }) => {
        const result = await runLuaCode(blueprintCode, processId, this.signer);
        return {
          content: [{ type: "text", text: cleanOutput(result) }],
        };
      }
    );

    this.server.tool(
      "load-official-blueprint",
      "load an official blueprint in an existing AO process",
      { blueprintName: z.string(), processId: z.string() },
      async ({ blueprintName, processId }) => {
        const result = await addBlueprint(
          blueprintName,
          processId,
          this.signer
        );
        return {
          content: [{ type: "text", text: cleanOutput(result) }],
        };
      }
    );

    this.server.tool(
      "list-available-handlers",
      "list all available handlers in an existing AO process",
      { processId: z.string() },
      async ({ processId }) => {
        const handlers = await listHandlers(processId, this.signer);
        return {
          content: [{ type: "text", text: cleanOutput(handlers) }],
        };
      }
    );

    this.server.tool(
      "create-handler",
      "create a new handler in an existing AO process",
      { processId: z.string(), handlerCode: z.string() },
      async ({ processId, handlerCode }) => {
        const result = await addHandler(processId, handlerCode, this.signer);
        return {
          content: [{ type: "text", text: cleanOutput(result) }],
        };
      }
    );

    this.server.tool(
      "run-handler-using-handler-name",
      "run a handler using its name in an existing AO process",
      { processId: z.string(), handlerName: z.string(), data: z.string() },
      async ({ processId, handlerName, data }) => {
        const result = await runHandler(
          processId,
          handlerName,
          data,
          this.signer
        );
        if (result.Error) {
          return {
            content: [{ type: "text", text: cleanOutput(result.Error) }],
          };
        }
        return {
          content: [
            { type: "text", text: cleanOutput(result.Messages[0].Data) },
          ],
        };
      }
    );
  }
}

export default FluxServer;
