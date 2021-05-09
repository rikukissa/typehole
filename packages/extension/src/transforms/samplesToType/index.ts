// import { json2ts } from "json-ts";
import json2ts from "json-to-ts";

export function samplesToType(samples: any[]): string {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const types = json2ts({ __typeholeRootWrapper__: samples }).join("\n");

  const root = types
    .match(/__typeholeRootWrapper__:\s(.+)/)![1]
    .replace("[];", ";");

  const result =
    `type TypeholeRoot = ${root}\n` + types.split("\n").slice(3).join("\n");

  if (result.includes("type TypeholeRoot = TypeholeRootWrapper;")) {
    return result
      .replace("type TypeholeRoot = TypeholeRootWrapper;\n", "")
      .replace("TypeholeRootWrapper", "TypeholeRoot");
  }
  return result;
}
