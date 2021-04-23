import * as vscode from "vscode";
import f from "fastify";

import {
  getWrappingVariableDeclaration,
  insertTypeReference,
  getTypeAliasForId,
  getAllDependencyTypeDeclarations,
} from "./transforms/insertTypes";
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
  getNodeStartPosition,
} from "./parse/module";
import * as ts from "typescript";

import { tsquery } from "@phenomnomnominal/tsquery";

const fastify = f({ logger: true });
fastify.register(require("fastify-cors"));

const last = (arr: any[]) => arr[arr.length - 1];

const PLACEHOLDER_TYPE = "AutoDiscovered";

function startRenamingPlaceholderType() {
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

  tsquery
    .query(ast, `TypeAliasDeclaration > Identifier[name="${PLACEHOLDER_TYPE}"]`)
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

const getEditorRange = (node: ts.Node) => {
  const start = getNodeStartPosition(node);
  const end = getNodeEndPosition(node);
  return new vscode.Range(
    new vscode.Position(start.line, start.character),
    new vscode.Position(end.line, end.character)
  );
};

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

      const position = lastImport
        ? getNodeEndPosition(lastImport)
        : new vscode.Position(0, 0);

      await editor.edit((editBuilder) => {
        /* Import typehole if not already imported */
        if (existingImport.length === 0) {
          editBuilder.insert(
            new vscode.Position(position.line, position.character),
            "\n" + getTypeHoleImport() + "\n"
          );
        }

        /* Wrap recorder around selection */
        const selectedText = editor.document.getText(editor.selection);
        editBuilder.replace(
          editor.selection,
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

        editBuilder.insert(
          new vscode.Position(
            factoryCallPosition.line,
            factoryCallPosition.character
          ),
          "\n" + getTypeHoleFactoryCall(id) + "\n"
        );
      });

      const fileWithImportAndRecorder = document.getText();

      const newAST = getAST(fileWithImportAndRecorder);
      const newTypeHoleFactory = last(findTypeholeFactories(newAST));
      const newTypeHole = last(findTypeholes(newAST));

      const selectedNode = newTypeHole;

      const variableDeclaration = getWrappingVariableDeclaration(selectedNode);

      await editor.edit((editBuilder) => {
        if (variableDeclaration) {
          const variableDeclationWithNewType = insertTypeReference(
            variableDeclaration,
            PLACEHOLDER_TYPE,
            newAST
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

        /* Add a placeholder type */
        editBuilder.insert(
          getEditorRange(newTypeHoleFactory).end,
          `\ntype ${PLACEHOLDER_TYPE} = any\n`
        );
      });

      startRenamingPlaceholderType();
    }
  );

  startListenerServer((id: number, types: string) => {
    const ast = tsquery.ast(editor.document.getText());
    const typeAliasNode = getTypeAliasForId(id, ast);
    if (!typeAliasNode) {
      return;
    }
    // Array is placed by the runtime library so all samples affect the outcome
    const typesWithoutArrayRoot = types
      .replace("type IRootObject = IRootObjectItem[];", "")
      .replace("IRootObjectItem", typeAliasNode.getText());

    const existingDeclarations = getAllDependencyTypeDeclarations(
      typeAliasNode.parent
    );

    return editor.edit((editBuilder) => {
      existingDeclarations.forEach((node) => {
        const range = getEditorRange(node);
        editBuilder.delete(range);
      });
      editBuilder.insert(
        getEditorRange(typeAliasNode.parent).start,
        mergeInterfaces(typesWithoutArrayRoot)
      );
    });
  });
}

function startListenerServer(
  onTypeExtracted: (id: number, types: string) => void
) {
  fastify.post("/type", async (request, reply) => {
    const body = request.body as any;

    onTypeExtracted(body.id, body.interfaces as string);
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
