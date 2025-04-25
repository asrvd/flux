import { runLuaCode } from "../lib/runLua";

export async function installPackage(
  packageName: string,
  processId: string,
  signer: any
) {
  const code = `apm.install("${packageName}")`;
  const result = await runLuaCode(code, processId, signer);
  return result;
}
