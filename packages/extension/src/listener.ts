import * as vscode from "vscode";
import f from "fastify";
import {
  getTypeAliasForId,
  getAllDependencyTypeDeclarations,
} from "./transforms/insertTypes";

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

async function onTypeExtracted(id: string, types: string) {
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

  const existingDeclarations = getAllDependencyTypeDeclarations(
    typeAliasNode.parent
  );

  await editor.edit((editBuilder) => {
    existingDeclarations.forEach((node) => {
      const range = getEditorRange(node);
      editBuilder.delete(range);
    });
  });

  await editor.edit((editBuilder) => {
    editBuilder.insert(
      getEditorRange(typeAliasNode.parent).start,
      types.replace("IRootObject", typeName)
    );
  });
}
