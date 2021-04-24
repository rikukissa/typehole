import * as vscode from "vscode";
import f from "fastify";
import {
  getTypeAliasForId,
  getAllDependencyTypeDeclarations,
} from "./transforms/insertTypes";
import { mergeInterfaces } from "./transforms/mergeInterfaces";

import { getAST } from "./parse/module";
import { getEditorRange } from "./editor/utils";

const fastify = f({ logger: true });
fastify.register(require("fastify-cors"));

let running = false;
export function isServerRunning() {
  return running;
}

export async function startListenerServer() {
  running = true;
  fastify.post("/type", async (request, reply) => {
    const body = request.body as any;

    onTypeExtracted(body.id, body.interfaces as string);
    return {};
  });

  try {
    await fastify.listen(17341);
  } catch (err) {
    running = false;
    console.error(err);
    throw err;
  }
}

export async function stopListenerServer() {
  try {
    await fastify.close();
  } catch (error) {
    running = false;
  }
}

function onTypeExtracted(id: string, types: string) {
  const editor = vscode.window.activeTextEditor;
  const document = editor?.document;
  if (!editor || !document) {
    return;
  }
  const ast = getAST(editor.document.getText());
  const typeAliasNode = getTypeAliasForId(id, ast);
  if (!typeAliasNode) {
    return;
  }
  const typeName = typeAliasNode.getText();
  // Array is placed by the runtime library so all samples affect the outcome
  const isSimpleType = !types.includes("type IRootObject = IRootObjectItem[];");
  const typesWithoutArrayRoot = isSimpleType
    ? types
        .replace("IRootObject", typeName)
        .replace("IRootObjectItem[]", "IRootObjectItem")
    : types
        .replace("type IRootObject = IRootObjectItem[];", "")
        .replace("IRootObjectItem", typeName);

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
}
