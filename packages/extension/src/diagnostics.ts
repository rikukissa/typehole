import * as vscode from "vscode";
import { events, getWarnings, State } from "./state";
export const diagnosticCollection =
  vscode.languages.createDiagnosticCollection("typehole");

events.on("change", (newState: State) => {
  diagnosticCollection.clear();
  Object.keys(newState.warnings).forEach((file) => {
    diagnosticCollection.set(
      vscode.Uri.file(file),
      getWarnings(file).map(
        (range) =>
          new vscode.Diagnostic(
            range,
            "This value cannot be automatically typed by Typehole. Either the value is not JSON serializable (function, promise etc.) or it contains a cyclic values i.e. when an object references itself.",
            vscode.DiagnosticSeverity.Warning
          )
      )
    );
  });
});
