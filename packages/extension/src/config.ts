import * as vscode from "vscode";

export type PackageManager = "yarn" | "npm" | undefined;

export function getConfiguration(
  ...params: Parameters<typeof vscode.workspace.getConfiguration>
) {
  const configuration = vscode.workspace.getConfiguration(...params);

  return {
    extensionPort: configuration.get(
      "typehole.runtime.extensionPort"
    ) as number,
    typeOrInterface: configuration.get("typehole.typeOrInterface") as
      | "interface"
      | "type",
    autoInstall: configuration.get("typehole.runtime.autoInstall") as boolean,
    projectPath: configuration.get("typehole.runtime.projectPath") as string,
    packageManager: configuration.get(
      "typehole.runtime.packageManager"
    ) as PackageManager,
    update: configuration.update,
  };
}
