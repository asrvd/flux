import { result, message } from "@permaweb/aoconnect";
import { sleep } from "./utils";

export async function runLuaCode(
  code: string,
  processId: string,
  signer: any,
  tags?: { name: string; value: string }[]
) {
  const messageId = await message({
    process: processId,
    signer,
    data: code,
    tags: [{ name: "Action", value: "Eval" }, ...(tags || [])],
  });

  await sleep(100);

  const outputResult = await result({
    message: messageId,
    process: processId,
  });

  if (outputResult.Error) {
    return JSON.stringify(outputResult.Error);
  }

  return JSON.stringify(outputResult.Output.data);
}
