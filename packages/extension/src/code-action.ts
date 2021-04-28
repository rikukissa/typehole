import * as vscode from "vscode";
import { getAST, someParentIs } from "./parse/module";
import * as ts from "typescript";
import {
  getDescendantAtRange,
  lineCharacterPositionInText,
} from "./parse/utils";

export class TypeHoler implements vscode.CodeActionProvider {
  public static readonly providedCodeActionKinds = [
    vscode.CodeActionKind.QuickFix,
  ];

  public provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range
  ): vscode.ProviderResult<vscode.Command[]> {
    const fullFile = document.getText();

    const startPosition = lineCharacterPositionInText(range.start, fullFile);
    const endPosition = lineCharacterPositionInText(range.end, fullFile);

    const selectedNode = getDescendantAtRange(getAST(fullFile), [
      startPosition,
      endPosition,
    ]);

    if (!selectedNode) {
      return;
    }

    if (ts.isJsxText(selectedNode)) {
      return;
    }

    if (someParentIs(selectedNode, ts.isImportDeclaration)) {
      return;
    }

    return [
      {
        command: "typehole.add-a-typehole",
        title: "Add a typehole",
      },
    ];
  }
}
