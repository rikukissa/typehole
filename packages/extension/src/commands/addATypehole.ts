import * as vscode from "vscode";
import { install, setRootDir, setPackageManager } from "lmify";

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

import { getAvailableId } from "../state";
import {
  insertTypeholeImport,
  insertRecorderToSelection,
  last,
  getPlaceholderTypeName,
  startRenamingPlaceholderType,
} from "../extension";
import { log, error } from "../logger";
import { getEditorRange, getProjectPath, getProjectURI } from "../editor/utils";
import { getConfiguration, PackageManager } from "../config";

async function getPackageJSONDirectories() {
  const include = new vscode.RelativePattern(
    getProjectURI()!,
    "**/package.json"
  );

  const files = await vscode.workspace.findFiles(include);

  // Done like this as findFiles didn't respect the exclude parameter
  return files.filter((f) => !f.path.includes("node_modules"));
}

async function detectPackageManager(): Promise<PackageManager> {
  const npmLocks = await vscode.workspace.findFiles("package-lock.json");
  const yarnLocks = await vscode.workspace.findFiles("yarn.lock");

  if (npmLocks.length > 0 && yarnLocks.length === 0) {
    return "npm";
  }

  if (yarnLocks.length > 0 && npmLocks.length === 0) {
    return "yarn";
  }
}

async function resolveProjectRoot(
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

async function getPackageManager(document: vscode.TextDocument) {
  const config = getConfiguration("", document.uri);
  if (config.packageManager) {
    return config.packageManager;
  }

  let packageManager = await detectPackageManager();
  if (packageManager) {
    return packageManager;
  }

  packageManager = (await vscode.window.showQuickPick(["npm", "yarn"], {
    placeHolder:
      "Which package manager should Typehole use to install the runtime package?",
  })) as PackageManager;

  if (packageManager) {
    config.update(
      "typehole.runtime.packageManager",
      packageManager,
      vscode.ConfigurationTarget.Workspace
    );
    return packageManager;
  }
}

export async function addATypehole() {
  const editor = vscode.window.activeTextEditor;
  const document = editor?.document;
  if (!editor || !document) {
    return;
  }
  const config = getConfiguration("", document.uri);

  let packageManager = await getPackageManager(document);

  if (!packageManager) {
    return;
  }
  setPackageManager(packageManager);

  const packageRoots = await getPackageJSONDirectories();
  let projectPath = getProjectPath();

  if (packageRoots.length > 1) {
    projectPath =
      config.projectPath || (await resolveProjectRoot(document, packageRoots));
  }

  if (!projectPath) {
    return;
  }

  const installed = isRuntimeInstalled(projectPath);

  if (!installed && config.autoInstall) {
    vscode.window.showInformationMessage(
      "Typehole: Installing runtime package..."
    );

    log("Detecting package manager from", projectPath);

    try {
      (setRootDir as any)(projectPath);
      await install(["-D", "typehole", "--no-save"]);
      log("Runtime installed");
      vscode.window.showInformationMessage(
        "Typehole: Runtime package installed"
      );
    } catch (err) {
      error(err.message);
      vscode.window.showErrorMessage(
        'Typehole: Failed to install runtime.\nInstall it manually by running "npm install typehole"'
      );
    }
  } else if (!installed) {
    vscode.window.showErrorMessage(`Typehole: Install the runtime by running
 "npm install typehole" or
 "yarn add typehole"`);
    return;
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

function isRuntimeInstalled(projectRoot: string) {
  try {
    log("Searching for runtime library in", projectRoot);
    require.resolve("typehole", {
      paths: [projectRoot],
    });
    return true;
  } catch (error) {
    log(error.message);
    return false;
  }
}
