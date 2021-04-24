import * as ts from "typescript";
import * as vscode from "vscode";
import { getNodeEndPosition, getNodeStartPosition } from "../parse/module";

export const getEditorRange = (node: ts.Node) => {
  const start = getNodeStartPosition(node);
  const end = getNodeEndPosition(node);
  return new vscode.Range(
    new vscode.Position(start.line, start.character),
    new vscode.Position(end.line, end.character)
  );
};
