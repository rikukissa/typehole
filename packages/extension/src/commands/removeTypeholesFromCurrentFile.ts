import { tsquery } from "@phenomnomnominal/tsquery";
import * as vscode from "vscode";
import * as ts from "typescript";
import { getEditorRange } from "../editor/utils";
import {
  findTypeHoleImports,
  findTypeholes,
  getAST,
  printAST,
} from "../parse/module";

export async function removeTypeholesFromFile(
  editor: vscode.TextEditor,
  document: vscode.TextDocument
) {
  const text = document.getText();

  const ast = getAST(text);
  const typeholes = findTypeholes(ast);

  const doesntIncludeConfigureImport = (node: ts.ImportDeclaration) =>
    tsquery(node, `ImportSpecifier > Identifier[name="configure"]`).length ===
    0;

  const importStatements = findTypeHoleImports(ast).filter(
    doesntIncludeConfigureImport
  );

  // Cannot be done in just one editBuilder as hopes might overlap each other
  // and you'll get Error: Overlapping ranges are not allowed!

  await editor.edit((editBuilder) => {
    if (typeholes.length > 0) {
      editBuilder.replace(
        getEditorRange(typeholes[0]),
        printAST(typeholes[0].arguments[0])
      );
    }

    // Remove import statement if it was the last one
    if (typeholes.length === 1) {
      importStatements.forEach((statement) =>
        editBuilder.delete(getEditorRange(statement))
      );
    }
  });

  if (typeholes.length > 1) {
    await removeTypeholesFromFile(editor, document);
  }
}

export async function removeTypeholesFromCurrentFile() {
  const editor = vscode.window.activeTextEditor;
  const document = editor?.document;
  if (!document || !editor) {
    return;
  }
  return removeTypeholesFromFile(editor, document);
}
