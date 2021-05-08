import * as vscode from "vscode";

import { wrapIntoRecorder } from "./transforms/wrapIntoRecorder";
import {
  getAST,
  findTypeHoleImports,
  getNodeEndPosition,
  getTypeHoleImport,
  findLastImport,
  getNodeStartPosition,
} from "./parse/module";
import * as ts from "typescript";

import { tsquery } from "@phenomnomnominal/tsquery";
import {
  getDescendantAtRange,
  lineCharacterPositionInText,
} from "./parse/utils";
import { startListenerServer, stopListenerServer } from "./listener";
import { getEditorRange, getProjectURI } from "./editor/utils";
import { TypeHoler } from "./code-action";
import { clearWarnings, getState, onFileChanged, onFileDeleted } from "./state";

import { readFile } from "fs";
import { log } from "./logger";
import { addATypehole } from "./commands/addATypehole";
import { removeTypeholesFromAllFiles } from "./commands/removeTypeholesFromAllFiles";
import { removeTypeholesFromCurrentFile } from "./commands/removeTypeholesFromCurrentFile";
import { diagnosticCollection } from "./diagnostics";

export const last = <T>(arr: T[]) => arr[arr.length - 1];

export function getPlaceholderTypeName(document: ts.SourceFile) {
  let n = 0;

  let results = tsquery
    .query(document, `TypeAliasDeclaration > Identifier[name="AutoDiscovered"]`)
    .concat(
      tsquery.query(
        document,
        `InterfaceDeclaration > Identifier[name="AutoDiscovered"]`
      )
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

export function startRenamingPlaceholderType(
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

export function insertTypeholeImport(
  ast: ts.Node,
  editBuilder: vscode.TextEditorEdit
) {
  const lastImport = findLastImport(ast);
  const position = lastImport
    ? getNodeEndPosition(lastImport)
    : new vscode.Position(0, 0);

  const existingImports = findTypeHoleImports(ast);

  if (existingImports.length === 0) {
    editBuilder.insert(
      new vscode.Position(position.line, position.character),
      "\n" + getTypeHoleImport() + "\n"
    );
  }
}

export function insertRecorderToSelection(
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

  editBuilder.replace(nodeRange, wrapIntoRecorder(id, selectedNode));
}

export async function activate(context: vscode.ExtensionContext) {
  log("Plugin activated");

  context.subscriptions.push(diagnosticCollection);

  const typescriptFilesInTheProject = new vscode.RelativePattern(
    getProjectURI()!,
    "**/*.{tsx,ts}"
  );

  /*
   * Initialize state
   */

  const existingFiles = await vscode.workspace.findFiles(
    typescriptFilesInTheProject,
    null,
    50
  );

  await Promise.all(existingFiles.map(fileChanged));
  const holes = getState().holes;
  log("Found", holes.length.toString(), "holes in the workspace");

  if (holes.length > 0) {
    try {
      log("Starting the server");
      await startListenerServer();
      vscode.window.showInformationMessage(
        "Typehole server ready to receive samples."
      );
    } catch (error) {
      vscode.window.showErrorMessage(
        "Typehole failed to start its server. Make sure you are not running typehole server in multiple VSCode windows and port 17341 is available for listening."
      );
      error("Failed to start server", error.message);
    }
  }

  /*
   * Setup file watchers to enable holes in multile files
   */

  const watcher = vscode.workspace.createFileSystemWatcher(
    typescriptFilesInTheProject,
    false,
    false,
    false
  );

  vscode.workspace.onDidChangeTextDocument((event) => {
    onFileChanged(event.document.uri.path, event.document.getText());
  });
  watcher.onDidChange(fileChanged);
  watcher.onDidCreate(fileChanged);
  watcher.onDidDelete((uri) => {
    onFileDeleted(uri.path);
  });

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
  vscode.commands.registerCommand(
    "typehole.remove-from-current-file",
    removeTypeholesFromCurrentFile
  );
  vscode.commands.registerCommand(
    "typehole.remove-from-all-files",
    removeTypeholesFromAllFiles
  );

  vscode.commands.registerCommand("typehole.add-a-typehole", addATypehole);
}

// this method is called when your extension is deactivated
export function deactivate() {
  stopListenerServer();
}

function fileChanged(uri: vscode.Uri) {
  clearWarnings(uri.path);
  return new Promise<void>((resolve) => {
    readFile(uri.fsPath, (err, data) => {
      if (err) {
        return log(err.message);
      }
      onFileChanged(uri.path, data.toString());
      resolve();
    });
  });
}
