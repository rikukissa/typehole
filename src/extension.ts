import * as vscode from "vscode";

import { install, setRootDir } from "lmify";
import {
  getWrappingVariableDeclaration,
  insertTypeReference,
  insertGenericTypeParameter,
} from "./transforms/insertTypes";

import { wrapIntoRecorder } from "./transforms/wrapIntoRecorder";
import {
  getAST,
  findTypeHoleImport,
  getNodeEndPosition,
  getTypeHoleImport,
  findLastImport,
  findTypeholes,
  getNodeStartPosition,
  getParentOnRootLevel,
} from "./parse/module";
import * as ts from "typescript";

import { tsquery } from "@phenomnomnominal/tsquery";
import {
  getDescendantAtRange,
  lineCharacterPositionInText,
} from "./parse/utils";
import {
  isServerRunning,
  startListenerServer,
  stopListenerServer,
} from "./listener";
import { getEditorRange } from "./editor/utils";
import { TypeHoler } from "./code-action";

const last = <T>(arr: T[]) => arr[arr.length - 1];

function getPlaceholderTypeName(document: ts.SourceFile) {
  let n = 0;

  let results = tsquery.query(
    document,
    `TypeAliasDeclaration > Identifier[name="AutoDiscovered"]`
  );

  while (results.length > 0) {
    n++;

    results = tsquery.query(
      document,
      `TypeAliasDeclaration > Identifier[name="AutoDiscovered${n}"]`
    );
  }

  return "AutoDiscovered" + (n === 0 ? "" : n);
}

function startRenamingPlaceholderType(
  typeName: string,
  editor: vscode.TextEditor,
  document: vscode.TextDocument
) {
  const fullFile = document.getText();
  const ast = getAST(fullFile);

  tsquery
    .query(ast, `TypeAliasDeclaration > Identifier[name="${typeName}"]`)
    .forEach(async (node) => {
      const start = getNodeStartPosition(node);
      const end = getNodeEndPosition(node);

      editor.selection = new vscode.Selection(
        new vscode.Position(start.line, start.character),
        new vscode.Position(end.line, end.character)
      );

      await vscode.commands.executeCommand("editor.action.rename");
    });
}

function insertTypeholeImport(
  ast: ts.Node,
  editBuilder: vscode.TextEditorEdit
) {
  const lastImport = findLastImport(ast);
  const position = lastImport
    ? getNodeEndPosition(lastImport)
    : new vscode.Position(0, 0);

  const existingImport = findTypeHoleImport(ast);

  if (existingImport.length === 0) {
    editBuilder.insert(
      new vscode.Position(position.line, position.character),
      "\n" + getTypeHoleImport() + "\n"
    );
  }
}

function insertRecorderToSelection(
  id: number,
  editor: vscode.TextEditor,
  editBuilder: vscode.TextEditorEdit
) {
  const fullFile = editor.document.getText();
  const range = editor.selection;

  const startPosition = lineCharacterPositionInText(range.start, fullFile);
  const endPosition = lineCharacterPositionInText(range.end, fullFile);

  const selectedNode = getDescendantAtRange(getAST(fullFile), [
    startPosition,
    endPosition,
  ]);

  const nodeRange = getEditorRange(selectedNode);
  const selectedText = editor.document.getText(nodeRange);

  editBuilder.replace(nodeRange, wrapIntoRecorder(id, selectedText));
}

function getProjectPath() {
  return vscode.workspace.workspaceFolders![0].uri.path;
}

function isRuntimeInstalled() {
  try {
    require.resolve("typehole", {
      paths: [getProjectPath()],
    });
    return true;
  } catch (error) {
    return false;
  }
}

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider(
      ["typescript", "typescriptreact"],
      new TypeHoler()
    )
  );

  vscode.commands.registerCommand("typehole.stop-server", async () => {
    stopListenerServer();
  });

  vscode.commands.registerCommand("typehole.start-server", async () => {
    startListenerServer();
  });

  vscode.commands.registerCommand("typehole.add-a-typehole", async () => {
    const editor = vscode.window.activeTextEditor;
    const document = editor?.document;
    if (!editor || !document) {
      return;
    }

    if (!isRuntimeInstalled()) {
      vscode.window.showInformationMessage(
        "Typehole: Installing runtime package..."
      );
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
        vscode.window.showErrorMessage(
          "Typehole failed to start",
          error.message
        );
      }
    }

    const fullFile = document.getText();
    const ast = getAST(fullFile);
    const id = findTypeholes(ast).length;

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
      if (variableDeclaration) {
        insertTypeToVariableDeclaration(
          variableDeclaration,
          updatedAST,
          editBuilder
        );
      } else {
        insertTypeGenericVariableParameter(
          newlyCreatedTypeHole,
          typeName,
          updatedAST,
          editBuilder
        );
      }

      /* Add a placeholder type */
      insertAPlaceholderType(typeName, editBuilder, newlyCreatedTypeHole);
    });

    startRenamingPlaceholderType(typeName, editor, document);
  });
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
  variableDeclaration: ts.Node,
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

// this method is called when your extension is deactivated
export function deactivate() {
  stopListenerServer();
}
