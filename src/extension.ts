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

export function activate(context: vscode.ExtensionContext) {
  const editor = vscode.window.activeTextEditor!;

  startListenerServer((id: number, types: string[]) => {
    const result = insertTypes(
      id,
      editor.document.getText(),
      mergeInterfaces(types.join("\n"))
    );

    replaceCurrentEditorContent(editor, result);
  });

  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider(
      "typescript",
      new TypeHoler(),
      {
        providedCodeActionKinds: TypeHoler.providedCodeActionKinds,
      }
    )
  );
  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider(
      "typescriptreact",
      new TypeHoler(),
      {
        providedCodeActionKinds: TypeHoler.providedCodeActionKinds,
      }
    )
  );
}

const fastify = f({ logger: true });
fastify.register(require("fastify-cors"));

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

export class TypeHoler implements vscode.CodeActionProvider {
  public static readonly providedCodeActionKinds = [
    vscode.CodeActionKind.QuickFix,
  ];

  public provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range
  ): vscode.CodeAction[] | undefined {
    const selectedText = document.getText(range);
    const expression = isExpression(selectedText);
    if (!expression) {
      return;
    }

    const fix = new vscode.CodeAction(
      `Insert a typehole`,
      vscode.CodeActionKind.Refactor
    );

    fix.edit = new vscode.WorkspaceEdit();
    const fullFile = document.getText();

    const ast = getAST(fullFile);
    const existingImport = findTypeHoleImport(ast);
    const lastImport = findLastImport(ast);

    const id = findTypeholes(ast).length;
    /* Import typehole if not already imported */
    if (existingImport.length === 0) {
      if (!lastImport) {
        fix.edit.insert(
          document.uri,
          new vscode.Position(0, 0),
          getTypeHoleImport() + "\n"
        );
      } else {
        const position = getNodeEndPosition(lastImport);
        fix.edit.insert(
          document.uri,
          new vscode.Position(position.line, position.character),
          "\n" + getTypeHoleImport() + "\n"
        );
      }
    }

    /* Wrap recorder around selection */
    fix.edit.replace(
      document.uri,
      new vscode.Range(range.start, range.end),
      wrapIntoRecorder(id, selectedText)
    );

    /* Create recorder from factory */
    const factories = findTypeholeFactories(ast);

    const factoryCallPosition =
      factories.length > 0
        ? getNodeEndPosition(factories[factories.length - 1].parent)
        : lastImport
        ? getNodeEndPosition(lastImport)
        : new vscode.Position(0, 0);

    fix.edit.insert(
      document.uri,
      new vscode.Position(
        factoryCallPosition.line,
        factoryCallPosition.character
      ),
      "\n" + getTypeHoleFactoryCall(id) + "\n"
    );

    return [fix];
  }
}
