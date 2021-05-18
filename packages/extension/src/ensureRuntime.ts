import { install, setPackageManager, setRootDir } from "lmify";
import * as vscode from "vscode";

import { getConfiguration, PackageManager } from "./config";
import { getProjectRoot } from "./editor/utils";
import { error, log } from "./logger";

/*
 * A bit of a hack as require.resolve doesn't update it's cache
 * when a module is installed while the extension is running
 */

let runtimeWasInstalledWhileExtensionIsRunning = false;

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
      paths: [projectRoot],
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

  const projectPath = await getProjectRoot(document);

  if (!projectPath) {
    return;
  }

  const installed =
    isRuntimeInstalled(projectPath) ||
    runtimeWasInstalledWhileExtensionIsRunning;

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
