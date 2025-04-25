import { result, message } from "@permaweb/aoconnect";
import { sleep } from "../lib/utils";

export async function listHandlers(processId: string, signer: any) {
  const messageId = await message({
    process: processId,
    signer,
    data: `
        local handlers = Handlers.list
        local result = {}
        for i, handler in ipairs(handlers) do
          table.insert(result, {
            name = handler.name,
            type = type(handler.pattern),
          })
        end
        return result
      `,
    tags: [{ name: "Action", value: "Eval" }],
  });
  const outputResult = await result({
    message: messageId,
    process: processId,
  });
  if (outputResult.Error) {
    return outputResult.Error;
  }
  return outputResult.Output.data;
}

export async function addHandler(
  processId: string,
  handlerCode: string,
  signer: any
) {
  const messageId = await message({
    process: processId,
    signer,
    data: handlerCode,
    tags: [{ name: "Action", value: "Eval" }],
  });

  await sleep(100);

  const outputResult = await result({
    message: messageId,
    process: processId,
  });

  return outputResult.Output
    ? outputResult.Output.data
    : outputResult.Messages[0].Data;
}

export async function runHandler(
  processId: string,
  handlerName: string,
  data: string,
  signer: any
) {
  const messageId = await message({
    process: processId,
    signer,
    data,
    tags: [{ name: "Action", value: handlerName }],
  });

  await sleep(100);

  const outputResult = await result({
    message: messageId,
    process: processId,
  });

  return outputResult;
}
