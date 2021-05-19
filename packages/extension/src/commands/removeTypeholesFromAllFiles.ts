import * as vscode from "vscode";
import { unique } from "../parse/utils";
import { getAllHoles } from "../state";
import { removeTypeholesFromFile } from "./removeTypeholesFromCurrentFile";

export async function removeTypeholesFromAllFiles() {
  const holes = getAllHoles();
  const files = holes.flatMap((h) => h.fileNames).filter(unique);

  for (const file of files) {
    let document: null | vscode.TextDocument = null;
    try {
      document = await vscode.workspace.openTextDocument(vscode.Uri.file(file));
    } catch (error) {
      return error("Remove typeholes: Failed to open document", file);
    }

    const editor = await vscode.window.showTextDocument(document, 1, false);
    removeTypeholesFromFile(editor, document);
  }
}
