import { runLuaCode } from "../lib/runLua";

export async function fetchBlueprintCode(url: string) {
  const response = await fetch(url);
  const code = await response.text();
  return code;
}

export async function addBlueprint(
  blueprintName: string,
  processId: string,
  signer: any
) {
  const url = `https://raw.githubusercontent.com/permaweb/aos/refs/heads/main/blueprints/${blueprintName}.lua`;
  const code = await fetchBlueprintCode(url);
  const result = await runLuaCode(code, processId, signer);
  return result;
}
