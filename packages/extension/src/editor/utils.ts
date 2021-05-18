import * as ts from "typescript";
import * as vscode from "vscode";
import { getConfiguration } from "../config";
import { getNodeEndPosition, getNodeStartPosition } from "../parse/module";

export const getEditorRange = (node: ts.Node) => {
  const start = getNodeStartPosition(node);
  const end = getNodeEndPosition(node);
  return new vscode.Range(
    new vscode.Position(start.line, start.character),
    new vscode.Position(end.line, end.character)
  );
};

export function getProjectURI() {
  if (!vscode.workspace.workspaceFolders) {
    return;
  }
  return vscode.workspace.workspaceFolders[0].uri;
}
export function getProjectPath() {
  return getProjectURI()?.path;
}

export async function getPackageJSONDirectories() {
  const include = new vscode.RelativePattern(
    getProjectURI()!,
    "**/package.json"
  );

  const files = await vscode.workspace.findFiles(include);

  // Done like this as findFiles didn't respect the exclude parameter
  return files.filter((f) => !f.path.includes("node_modules"));
}

export async function resolveProjectRoot(
  document: vscode.TextDocument,
  options: vscode.Uri[]
) {
  const config = getConfiguration("", document.uri);
  const answer = await vscode.window.showQuickPick(
    options.map((o) => o.path.replace("/package.json", "")),
    {
      placeHolder: "Where should the runtime package be installed?",
    }
  );

  if (answer) {
    config.update(
      "typehole.runtime.projectPath",
      answer,
      vscode.ConfigurationTarget.Workspace
    );
    return answer;
  }
}

export async function getProjectRoot(document: vscode.TextDocument) {
  const config = getConfiguration("", document.uri);

  const packageRoots = await getPackageJSONDirectories();

  let projectPath = getProjectPath();

  if (packageRoots.length > 1) {
    return (
      config.projectPath || (await resolveProjectRoot(document, packageRoots))
    );
  }

  return projectPath;
}
