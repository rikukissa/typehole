import * as vscode from "vscode";
import { install, setRootDir } from "lmify";

import * as ts from "typescript";
import {
  getWrappingVariableDeclaration,
  insertGenericTypeParameter,
  insertTypeReference,
} from "../transforms/insertTypes";
import {
  getAST,
  findTypeholes,
  getNodeStartPosition,
  getNodeEndPosition,
  getParentOnRootLevel,
} from "../parse/module";
import { isServerRunning, startListenerServer } from "../listener";
import { getAvailableId } from "../state";
import {
  getProjectPath,
  insertTypeholeImport,
  insertRecorderToSelection,
  last,
  getPlaceholderTypeName,
  startRenamingPlaceholderType,
} from "../extension";
import { log } from "../logger";
import { getEditorRange } from "../editor/utils";

export async function addATypehole() {
  const editor = vscode.window.activeTextEditor;
  const document = editor?.document;
  if (!editor || !document) {
    return;
  }

  if (!isRuntimeInstalled()) {
    vscode.window.showInformationMessage(
      "Typehole: Installing runtime package..."
    );
    log("Detecting package manager from", getProjectPath()!);
    try {
      (setRootDir as any)(getProjectPath());
      await install(["-D", "typehole", "--no-save"]);
      vscode.window.showInformationMessage(
        "Typehole: Runtime package installed"
      );
    } catch (error) {
      vscode.window.showErrorMessage(
        "Typehole: Failed to install runtime.\nInstall it manually by running npm install typehole"
      );
    }
  }

  if (!isServerRunning()) {
    try {
      vscode.window.showInformationMessage("Typehole: Starting server...");
      await startListenerServer();
      vscode.window.showInformationMessage("Typehole: Server ready");
    } catch (error) {
      vscode.window.showErrorMessage("Typehole failed to start", error.message);
    }
  }

  const fullFile = document.getText();
  const ast = getAST(fullFile);
  const id = getAvailableId();

  await editor.edit((editBuilder) => {
    insertTypeholeImport(ast, editBuilder);
    insertRecorderToSelection(id, editor, editBuilder);
  });

  const fileWithImportAndRecorder = document.getText();

  const updatedAST = getAST(fileWithImportAndRecorder);

  const newlyCreatedTypeHole = last(findTypeholes(updatedAST));

  const variableDeclaration = getWrappingVariableDeclaration(
    newlyCreatedTypeHole
  );

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

function isRuntimeInstalled() {
  try {
    log("Searching for runtime library in", getProjectPath()!);
    require.resolve("typehole", {
      paths: [getProjectPath()!],
    });
    return true;
  } catch (error) {
    log(error.message);
    return false;
  }
}
