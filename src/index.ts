import "dotenv/config";
import FluxServer from "./mcp.js";
import { createSSEServer } from "./sse.js";

const mcpServer = new FluxServer();

mcpServer.initialize();

const sseServer = createSSEServer(mcpServer.server);

sseServer.listen(process.env.PORT || 3001);

console.log(`Server is running on port ${process.env.PORT || 3001}`);
