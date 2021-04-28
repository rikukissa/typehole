import * as vscode from "vscode";
import { getEditorRange } from "../editor/utils";
import {
  findTypeHoleImports,
  findTypeholes,
  getAST,
  printAST,
} from "../parse/module";

export function removeTypeholesFromFile(
  editor: vscode.TextEditor,
  document: vscode.TextDocument
) {
  const text = document.getText();

  const ast = getAST(text);
  const typeholes = findTypeholes(ast);

  const importStatement = findTypeHoleImports(ast);

  editor.edit((editBuilder) => {
    typeholes.forEach((node) => {
      editBuilder.replace(getEditorRange(node), printAST(node.arguments[0]));
    });

    if (importStatement) {
      importStatement.forEach((statement) =>
        editBuilder.delete(getEditorRange(statement))
      );
    }
  });
}

export async function removeTypeholesFromCurrentFile() {
  const editor = vscode.window.activeTextEditor;
  const document = editor?.document;
  if (!document || !editor) {
    return;
  }
  return removeTypeholesFromFile(editor, document);
}
