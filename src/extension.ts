import * as vscode from "vscode";
import f from "fastify";

import { insertTypes } from "./transforms/insertTypes";
import { mergeInterfaces } from "./transforms/mergeInterfaces";
import { isExpression } from "./parse/expression";
import { wrapIntoRecorder } from "./transforms/wrapIntoRecorder";
import {
  getAST,
  findTypeHoleImport,
  getNodeEndPosition,
  getTypeHoleImport,
  findLastImport,
  getTypeHoleFactoryCall,
  findTypeholes,
  findTypeholeFactories,
} from "./parse/module";

const fastify = f({ logger: true });
fastify.register(require("fastify-cors"));

export function activate(context: vscode.ExtensionContext) {
  const editor = vscode.window.activeTextEditor!;
  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider(
      ["typescript", "typescriptreact"],
      new TypeHoler()
    )
  );

  vscode.commands.registerCommand(
    "extension.typehole.add-a-typehole",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        return;
      }
      const document = editor.document;
      if (!document) {
        return;
      }

      const fullFile = document.getText();

      const ast = getAST(fullFile);
      const existingImport = findTypeHoleImport(ast);
      const lastImport = findLastImport(ast);

      const id = findTypeholes(ast).length;

      await editor.edit((editBuilder) => {
        /* Import typehole if not already imported */
        if (existingImport.length === 0) {
          const position = lastImport
            ? getNodeEndPosition(lastImport)
            : new vscode.Position(0, 0);
          editBuilder.insert(
            new vscode.Position(position.line, position.character),
            "\n" + getTypeHoleImport() + "\n"
          );
        }

        /* Wrap recorder around selection */
        const selection = editor.selection;
        const selectedText = editor.document.getText(selection);

        editBuilder.replace(selection, wrapIntoRecorder(id, selectedText));

        /* Create recorder from factory */
        const factories = findTypeholeFactories(ast);

        const factoryCallPosition =
          factories.length > 0
            ? getNodeEndPosition(factories[factories.length - 1].parent)
            : lastImport
            ? getNodeEndPosition(lastImport)
            : new vscode.Position(0, 0);

        editBuilder.insert(
          new vscode.Position(
            factoryCallPosition.line,
            factoryCallPosition.character
          ),
          "\n" + getTypeHoleFactoryCall(id) + "\n"
        );
      });
    }
  );
  startListenerServer((id: number, types: string[]) => {
    const result = insertTypes(
      id,
      editor.document.getText(),
      mergeInterfaces(types.join("\n"))
    );

    replaceCurrentEditorContent(editor, result);
  });
}

function startListenerServer(
  onTypeExtracted: (id: number, types: string[]) => void
) {
  fastify.post("/type", async (request, reply) => {
    const body = request.body as any;

    onTypeExtracted(body.id, body.interfaces as string[]);
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
  return te.edit((editBuilder) => {
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

export class TypeHoler implements vscode.CodeActionProvider {
  public static readonly providedCodeActionKinds = [
    vscode.CodeActionKind.QuickFix,
  ];

  public provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range
  ): vscode.ProviderResult<vscode.Command[]> {
    const selectedText = document.getText(range);
    const shouldOfferAction = isExpression(selectedText);
    if (!shouldOfferAction) {
      return;
    }

    return [
      {
        command: "extension.typehole.add-a-typehole",
        title: "Add a typehole",
      },
    ];
  }
}
