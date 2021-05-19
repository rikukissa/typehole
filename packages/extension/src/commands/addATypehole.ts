import * as ts from "typescript";
import * as vscode from "vscode";

import { getEditorRange } from "../editor/utils";
import {
  getPlaceholderTypeName,
  insertRecorderToSelection,
  insertTypeholeImport,
  last,
  startRenamingPlaceholderType,
} from "../extension";
import {
  findTypeholes,
  getAST,
  getNodeEndPosition,
  getNodeStartPosition,
  getParentOnRootLevel,
} from "../parse/module";
import { getNextAvailableId } from "../state";
import {
  getWrappingVariableDeclaration,
  insertGenericTypeParameter,
  insertTypeReference,
} from "../transforms/insertTypes";

export async function addATypehole() {
  const editor = vscode.window.activeTextEditor;
  const document = editor?.document;
  if (!editor || !document) {
    return;
  }

  const fullFile = document.getText();
  const ast = getAST(fullFile);

  const id = getNextAvailableId();

  await editor.edit((editBuilder) => {
    insertTypeholeImport(ast, editBuilder);

    insertRecorderToSelection(id, editor, editBuilder);
  });

  const fileWithImportAndRecorder = document.getText();

  const updatedAST = getAST(fileWithImportAndRecorder);

  const newlyCreatedTypeHole = last(findTypeholes(updatedAST));

  const variableDeclaration =
    getWrappingVariableDeclaration(newlyCreatedTypeHole);

  const typeName = getPlaceholderTypeName(updatedAST);

  await editor.edit((editBuilder) => {
    if (variableDeclaration && !variableDeclaration.type) {
      insertTypeToVariableDeclaration(
        variableDeclaration,
        updatedAST,
        editBuilder
      );
    } else if (!variableDeclaration) {
      insertTypeGenericVariableParameter(
        newlyCreatedTypeHole,
        typeName,
        updatedAST,
        editBuilder
      );
    }
    if (!variableDeclaration || !variableDeclaration.type) {
      /* Add a placeholder type */
      insertAPlaceholderType(typeName, editBuilder, newlyCreatedTypeHole);
    }
  });

  startRenamingPlaceholderType(typeName, editor, document);
}

function insertAPlaceholderType(
  typeName: string,
  editBuilder: vscode.TextEditorEdit,
  newTypeHole: ts.CallExpression
) {
  editBuilder.insert(
    getEditorRange(getParentOnRootLevel(newTypeHole)).start,
    `type ${typeName} = any\n\n`
  );
}

function insertTypeGenericVariableParameter(
  typehole: ts.Node,
  typeName: string,
  ast: ts.SourceFile,
  editBuilder: vscode.TextEditorEdit
) {
  const callExpressionWithGeneric = insertGenericTypeParameter(
    typehole,
    typeName,
    ast
  );

  const start = getNodeStartPosition(typehole);
  const end = getNodeEndPosition(typehole);
  if (callExpressionWithGeneric) {
    editBuilder.replace(
      new vscode.Range(
        new vscode.Position(start.line, start.character),
        new vscode.Position(end.line, end.character)
      ),
      callExpressionWithGeneric
    );
  }
}

function insertTypeToVariableDeclaration(
  variableDeclaration: ts.VariableDeclaration,
  ast: ts.SourceFile,
  editBuilder: vscode.TextEditorEdit
) {
  const variableDeclationWithNewType = insertTypeReference(
    variableDeclaration,
    getPlaceholderTypeName(ast),
    ast
  );
  const start = getNodeStartPosition(variableDeclaration);
  const end = getNodeEndPosition(variableDeclaration);
  if (variableDeclationWithNewType) {
    editBuilder.replace(
      new vscode.Range(
        new vscode.Position(start.line, start.character),
        new vscode.Position(end.line, end.character)
      ),
      variableDeclationWithNewType
    );
  }
}
