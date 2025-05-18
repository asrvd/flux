import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import createServer from "./server";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());

let transport: SSEServerTransport;
let server: Awaited<ReturnType<typeof createServer>>;

// Initialize server
async function initServer() {
  server = await createServer();
}

// Initialize server on startup
initServer().catch(console.error);

// Root route handler
app.get("/", (_req: Request, res: Response) => {
  res.json({
    message: "Welcome to Flux API",
    status: "running",
  });
});

app.get("/sse", async (_req: Request, res: Response) => {
  if (!server) {
    res.status(503).json({ error: "Server not initialized" });
    return;
  }
  transport = new SSEServerTransport("/message", res);
  await server.connect(transport);
});

app.post("/message", async (req, res) => {
  console.log("Received message");

  await transport.handlePostMessage(req, res);
});

// Health check endpoint
app.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Flux server running on port ${PORT}`);
});
