import * as vscode from "vscode";
import { install, setRootDir, setPackageManager } from "lmify";

import { log, error } from "./logger";
import { getProjectPath, getProjectURI } from "./editor/utils";
import { getConfiguration, PackageManager } from "./config";

/*
 * A bit of a hack as require.resolve doesn't update it's cache
 * when a module is installed while the extension is running
 */

let runtimeWasInstalledWhileExtensionIsRunning = false;


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

function isRuntimeInstalled(projectRoot: string) {
  try {
    log("Searching for runtime library in", projectRoot);
    require.resolve("typehole", {
      paths: [projectRoot]
    });
    return true;
  } catch (error) {
    log(error.message);
    return false;
  }
}
let installing = false;

export function isInstalling() {
  return installing;
}

export async function ensureRuntime() {
  const editor = vscode.window.activeTextEditor;
  const document = editor?.document;

  if (!document) {
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

  const installed = isRuntimeInstalled(projectPath) || runtimeWasInstalledWhileExtensionIsRunning;

  if (!installed && config.autoInstall) {
    installing = true;
    vscode.window.showInformationMessage(
      "Typehole: Installing runtime package..."
    );

    log("Detecting package manager from", projectPath);

    try {
      (setRootDir as any)(projectPath);
      await install(["-D", "typehole", "--no-save"]);
      log("Runtime installed");
      installing = false;
      runtimeWasInstalledWhileExtensionIsRunning = true;
      vscode.window.showInformationMessage(
        "Typehole: Runtime package installed"
      );
    } catch (err) {
      installing = false;
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

}