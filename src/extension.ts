import * as vscode from "vscode";
import f from "fastify";
import { insertRecorders } from "./transforms/insertRecorders";
import { insertTypes } from "./transforms/insertTypes";
import { mergeInterfaces } from "./transforms/mergeInterfaces";

export function activate(context: vscode.ExtensionContext) {
  console.log('Congratulations, your extension "type-sampler" is now active!');

  let cmd = vscode.commands.registerTextEditorCommand(
    "type-sampler.helloWorld",
    (te) => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        return undefined;
      }
      const doc = editor.document;
      const source = doc.getText();
      const result = insertRecorders(source);

      replaceCurrentEditorContent(te, result);
      startListenerServer((types: string) => {
        console.log(types);
        console.log(mergeInterfaces(types));

        const result = insertTypes(
          te.document.getText(),
          mergeInterfaces(types)
        );
        replaceCurrentEditorContent(te, result);
      });
    }
  );
  context.subscriptions.push(cmd);
}

const fastify = f({ logger: true });

function startListenerServer(onTypeExtracted: (types: string) => void) {
  fastify.post("/type", async (request, reply) => {
    onTypeExtracted(request.body as string);
    return {};
  });

  // Run the server!
  const start = async () => {
    try {
      await fastify.listen(17341);
    } catch (err) {
      console.error(err);
    }
  };
  start();
}

// this method is called when your extension is deactivated
export function deactivate() {
  fastify.close();
}

function replaceCurrentEditorContent(te: vscode.TextEditor, result: string) {
  te.edit((editBuilder) => {
    try {
      editBuilder.replace(
        new vscode.Range(
          new vscode.Position(0, 0),
          new vscode.Position(
            te.document.lineCount - 1,
            te.document.lineAt(te.document.lineCount - 1).range.end.character
          )
        ),
        result
      );
    } catch (error) {
      console.log(error);
    }
  });
}
