import json2ts from "json-to-ts";

export function samplesToType(samples: any[]): string {
  let wrapperType = null;
  let samplesWithoutWrapperTypes = [];
  for (const sample of samples) {
    if (typeof sample === "object" && sample?.__typehole_wrapper_type__) {
      wrapperType = sample.__typehole_wrapper_type__;
      samplesWithoutWrapperTypes.push(sample.__typehole_value__);
    } else {
      samplesWithoutWrapperTypes.push(sample);
    }
  }

  // eslint-disable-next-line @typescript-eslint/naming-convention
  const types = json2ts({
    __typeholeRootWrapper__: samplesWithoutWrapperTypes,
  }).join("\n");

  let root = types
    .match(/__typeholeRootWrapper__:\s(.+)/)![1]
    .replace("[];", ";");

  if (wrapperType) {
    root = `${wrapperType}<${root.replace(";", "")}>;`;
  }
  const result =
    `type TypeholeRoot = ${root}\n` + types.split("\n").slice(3).join("\n");

  if (result.includes("type TypeholeRoot = TypeholeRootWrapper;")) {
    return result
      .replace("type TypeholeRoot = TypeholeRootWrapper;\n", "")
      .replace("TypeholeRootWrapper", "TypeholeRoot");
  }
  return result;
}
